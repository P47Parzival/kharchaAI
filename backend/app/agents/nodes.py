"""
KharchaAI Agent Nodes — Individual steps in the LangGraph workflow
"""
import json
import logging
from app.agents.state import AgentState
from app.services.llm import llm_service
from app.services.pricing import pricing_service
from app.scraper.price_extractor import price_extractor
from app.database import async_session

logger = logging.getLogger(__name__)


def add_step(state: dict, step: str, status: str = "done", detail: str = "") -> list:
    """Append a step to the state's steps list and return the new list."""
    steps = list(state.get("steps") or [])
    steps.append({"step": step, "status": status, "detail": detail})
    return steps


async def understand_request(state: AgentState) -> dict:
    """
    Node 0: Understand what the user wants and decide if we need clarification.
    This is the human-in-the-loop gate — if we're not sure, we ask.
    """
    steps = add_step(state, "🧠 Understanding your project requirements...", "in_progress")

    try:
        result = await llm_service.understand_request(
            user_query=state["user_query"],
            conversation_history=state.get("conversation_history", []),
        )

        ready = result.get("ready_to_generate", False)
        needs_clarification = result.get("needs_clarification", False)

        if ready:
            steps = add_step(
                {"steps": steps},
                "✅ Project requirements understood",
                "done",
                result.get("project_description", ""),
            )
            return {
                "needs_confirmation": False,
                "confirmed": True,
                "clarification_response": result.get("confirmation_message", ""),
                "steps": steps,
                "status": "understood",
                "error": None,
            }
        elif needs_clarification:
            steps = add_step(
                {"steps": steps},
                "❓ Need more details from you",
                "waiting",
                result.get("clarification_message", ""),
            )
            return {
                "needs_confirmation": True,
                "confirmed": False,
                "clarification_response": result.get("clarification_message", ""),
                "steps": steps,
                "status": "awaiting_clarification",
                "error": None,
            }
        else:
            # General conversation / off-topic
            msg = result.get("clarification_message") or result.get("confirmation_message", "")
            if not msg:
                msg = "I'm KharchaAI — I help estimate hardware project costs. Tell me what you want to build!"
            steps = add_step(
                {"steps": steps},
                "💬 General conversation",
                "done",
            )
            return {
                "needs_confirmation": True,
                "confirmed": False,
                "clarification_response": msg,
                "steps": steps,
                "status": "conversation",
                "error": None,
            }

    except Exception as e:
        logger.error(f"understand_request failed: {e}")
        steps = add_step({"steps": steps}, "❌ Failed to analyze request", "error", str(e))
        return {
            "needs_confirmation": False,
            "confirmed": True,  # Proceed anyway on error
            "clarification_response": "",
            "steps": steps,
            "status": "error_in_understanding",
            "error": str(e),
        }


async def generate_bom(state: AgentState) -> dict:
    """
    Node 1: Generate a Bill of Materials using LLM reasoning.
    """
    steps = add_step(state, "📋 Generating Bill of Materials...", "in_progress")

    try:
        bom = await llm_service.generate_bom(state["user_query"])
        num_components = len(bom.get("components", []))

        steps = add_step(
            {"steps": steps},
            f"📋 Generated BOM with {num_components} components",
            "done",
            bom.get("project_summary", ""),
        )

        return {
            "bom": bom,
            "steps": steps,
            "status": "bom_generated",
            "error": None,
        }
    except Exception as e:
        logger.error(f"BOM generation failed: {e}")
        steps = add_step({"steps": steps}, "❌ Failed to generate BOM", "error", str(e))
        return {
            "bom": None,
            "steps": steps,
            "status": "error",
            "error": f"Failed to generate BOM: {str(e)}",
        }


async def check_price_cache(state: AgentState) -> dict:
    """
    Node 2: Check SQLite cache for recent prices.
    """
    if not state.get("bom") or not state["bom"].get("components"):
        return {
            "cache_hits": [],
            "cache_misses": [],
            "prices": {},
            "steps": add_step(state, "⚠️ No components to price", "done"),
            "status": "no_components",
        }

    prices = {}
    cache_hits = []
    cache_misses = []

    steps = add_step(state, "🗃️ Checking price cache...", "in_progress")

    async with async_session() as db:
        for component in state["bom"]["components"]:
            name = component["name"]
            cached = await pricing_service.get_cached_prices(db, name)
            if cached:
                prices[name] = cached
                cache_hits.append(name)
            else:
                cache_misses.append(name)

    if cache_hits:
        steps = add_step(
            {"steps": steps},
            f"🗃️ Found {len(cache_hits)} cached prices, {len(cache_misses)} need scraping",
            "done",
        )
    else:
        steps = add_step(
            {"steps": steps},
            f"🗃️ No cached prices — scraping {len(cache_misses)} components",
            "done",
        )

    return {
        "prices": prices,
        "cache_hits": cache_hits,
        "cache_misses": cache_misses,
        "steps": steps,
        "status": "cache_checked",
    }


async def scrape_prices(state: AgentState) -> dict:
    """
    Node 3: Scrape prices using MCP + httpx, with LLM estimation fallback.
    """
    cache_misses = state.get("cache_misses", [])
    if not cache_misses:
        return {
            "scrape_results": [],
            "steps": add_step(state, "✅ All prices from cache", "done"),
            "status": "no_scraping_needed",
        }

    components_to_price = [
        comp for comp in state["bom"].get("components", [])
        if comp["name"] in cache_misses
    ]

    scrape_results = []
    prices = dict(state.get("prices", {}))
    scraped_count = 0
    steps = list(state.get("steps") or [])

    steps.append({"step": f"🔍 Scraping prices for {len(components_to_price)} components...", "status": "in_progress", "detail": ""})

    # ── Step 1: Real scraping via MCP + httpx ──
    for i, component in enumerate(components_to_price):
        steps.append({
            "step": f"🔍 [{i+1}/{len(components_to_price)}] Searching for {component['name']}...",
            "status": "in_progress",
            "detail": "",
        })

        try:
            results = await price_extractor.search_component(component)
            if results:
                prices[component["name"]] = results
                scraped_count += 1

                best_price = min(r.get("price", float("inf")) for r in results if r.get("price"))
                best_source = next((r.get("source_site", "") for r in results if r.get("price") == best_price), "")

                steps.append({
                    "step": f"💰 Found {component['name']} — ${best_price:.2f} ({best_source})",
                    "status": "done",
                    "detail": f"{len(results)} source(s)",
                })

                # Cache results
                async with async_session() as db:
                    for result in results:
                        if result.get("price"):
                            await pricing_service.cache_price(
                                db=db,
                                component_name=component["name"],
                                source_site=result.get("source_site", "unknown"),
                                source_url=result.get("source_url", ""),
                                price=result["price"],
                                currency=result.get("currency", "USD"),
                            )
                    await db.commit()

                scrape_results.append({
                    "component": component["name"],
                    "status": "scraped",
                    "num_sources": len(results),
                })
        except Exception as e:
            logger.warning(f"Scraping failed for {component['name']}: {e}")

    # ── Step 2: LLM estimation for unpriced components ──
    unpriced = [c for c in components_to_price if c["name"] not in prices]

    if unpriced:
        steps.append({
            "step": f"🤖 Estimating prices for {len(unpriced)} remaining components...",
            "status": "in_progress",
            "detail": "",
        })

        try:
            estimation = await llm_service.estimate_prices(unpriced)

            for est in estimation.get("prices", []):
                comp_name = est.get("name", "")
                if not comp_name or not est.get("avg_price"):
                    continue

                price_entries = [{
                    "source_site": est.get("source", "Estimated"),
                    "source_url": est.get("source_url", ""),
                    "price": est["avg_price"],
                    "currency": est.get("currency", "USD"),
                    "estimated": True,
                }]

                min_p = est.get("min_price")
                max_p = est.get("max_price")
                if min_p and min_p != est["avg_price"]:
                    price_entries.append({
                        "source_site": est.get("source", "Estimated") + " (low)",
                        "source_url": "",
                        "price": min_p,
                        "currency": est.get("currency", "USD"),
                        "estimated": True,
                    })
                if max_p and max_p != est["avg_price"]:
                    price_entries.append({
                        "source_site": est.get("source", "Estimated") + " (high)",
                        "source_url": "",
                        "price": max_p,
                        "currency": est.get("currency", "USD"),
                        "estimated": True,
                    })

                prices[comp_name] = price_entries

                steps.append({
                    "step": f"🤖 Estimated {comp_name} — ~${est['avg_price']:.2f}",
                    "status": "done",
                    "detail": f"Confidence: {est.get('confidence', 'medium')}",
                })

                # Cache estimated prices
                async with async_session() as db:
                    await pricing_service.cache_price(
                        db=db,
                        component_name=comp_name,
                        source_site="LLM Estimate",
                        source_url="",
                        price=est["avg_price"],
                        currency=est.get("currency", "USD"),
                    )
                    await db.commit()

                scrape_results.append({
                    "component": comp_name,
                    "status": "estimated",
                    "num_sources": len(price_entries),
                })

        except Exception as e:
            logger.error(f"LLM estimation failed: {e}")
            steps.append({"step": "⚠️ Price estimation unavailable for some components", "status": "warning", "detail": str(e)})

    steps.append({
        "step": f"✅ Pricing complete — {scraped_count} scraped, {len(unpriced)} estimated",
        "status": "done",
        "detail": "",
    })

    return {
        "prices": prices,
        "scrape_results": scrape_results,
        "steps": steps,
        "status": "pricing_complete",
    }


async def aggregate_and_respond(state: AgentState) -> dict:
    """
    Node 4: Aggregate prices and generate final response.
    """
    if state.get("error") and not state.get("bom"):
        return {
            "response_text": f"Sorry, I encountered an error: {state['error']}",
            "steps": add_step(state, "❌ Pipeline failed", "error", state["error"]),
            "status": "error",
        }

    bom = state.get("bom", {})
    prices = state.get("prices", {})

    steps = add_step(state, "📊 Aggregating prices and generating report...", "in_progress")

    aggregated_components = []
    total_min = 0
    total_max = 0

    for component in bom.get("components", []):
        name = component["name"]
        component_prices = prices.get(name, [])
        aggregated = pricing_service.aggregate_prices(component_prices)

        qty = component.get("quantity", 1)
        if not isinstance(qty, (int, float)):
            try:
                qty = int(qty)
            except (ValueError, TypeError):
                qty = 1

        entry = {
            **component,
            "pricing": aggregated,
            "total_min": round(aggregated["min"] * qty, 2) if aggregated["min"] else None,
            "total_max": round(aggregated["max"] * qty, 2) if aggregated["max"] else None,
        }
        aggregated_components.append(entry)

        if entry["total_min"]:
            total_min += entry["total_min"]
        if entry["total_max"]:
            total_max += entry["total_max"]

    aggregated_bom = {
        "project_summary": bom.get("project_summary", ""),
        "components": aggregated_components,
        "total_estimate": {
            "min": round(total_min, 2),
            "max": round(total_max, 2),
            "currency": "USD",
        },
        "additional_notes": bom.get("additional_notes", ""),
    }

    # Format response
    try:
        response_text = await llm_service.format_response(aggregated_bom)
    except Exception:
        response_text = f"## Bill of Materials\n\n{json.dumps(aggregated_bom, indent=2)}"

    steps = add_step(
        {"steps": steps},
        f"✅ Report ready — Total: ${total_min:.2f} – ${total_max:.2f}",
        "done",
    )

    return {
        "aggregated_bom": aggregated_bom,
        "response_text": response_text,
        "steps": steps,
        "status": "complete",
    }
