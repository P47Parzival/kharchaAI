"""
KharchaAI Agent Nodes — Individual steps in the LangGraph workflow
"""
import json
import asyncio
from app.agents.state import AgentState
from app.services.llm import llm_service
from app.services.pricing import pricing_service
from app.scraper.price_extractor import price_extractor
from app.database import async_session


async def parse_and_identify_components(state: AgentState) -> dict:
    """
    Node 1: Use LLM to understand the project and generate a BOM.
    This is what LLMs are good at — understanding requirements and
    identifying what components are needed.
    """
    try:
        bom = await llm_service.generate_bom(state["user_query"])
        return {
            "bom": bom,
            "status": "bom_generated",
            "error": None,
        }
    except Exception as e:
        return {
            "bom": None,
            "status": "error",
            "error": f"Failed to generate BOM: {str(e)}",
        }


async def check_price_cache(state: AgentState) -> dict:
    """
    Node 2: Check SQLite cache for recent prices.
    Avoids redundant scraping for components we've recently priced.
    """
    if not state.get("bom") or not state["bom"].get("components"):
        return {
            "cache_hits": [],
            "cache_misses": [],
            "prices": {},
            "status": "no_components",
        }

    prices = {}
    cache_hits = []
    cache_misses = []

    async with async_session() as db:
        for component in state["bom"]["components"]:
            name = component["name"]
            cached = await pricing_service.get_cached_prices(db, name)

            if cached:
                prices[name] = cached
                cache_hits.append(name)
            else:
                cache_misses.append(name)

    return {
        "prices": prices,
        "cache_hits": cache_hits,
        "cache_misses": cache_misses,
        "status": "cache_checked",
    }


async def scrape_prices(state: AgentState) -> dict:
    """
    Node 3: Scrape prices for components not found in cache.
    Uses chrome-devtools-mcp to navigate supplier sites and extract prices.
    Falls back to LLM-based extraction if structured scraping fails.
    """
    cache_misses = state.get("cache_misses", [])
    if not cache_misses:
        return {"scrape_results": [], "status": "no_scraping_needed"}

    # Find the component details from BOM
    components_to_scrape = []
    for comp in state["bom"].get("components", []):
        if comp["name"] in cache_misses:
            components_to_scrape.append(comp)

    scrape_results = []
    prices = dict(state.get("prices", {}))

    for component in components_to_scrape:
        try:
            results = await price_extractor.search_component(component)
            if results:
                prices[component["name"]] = results
                scrape_results.append({
                    "component": component["name"],
                    "status": "found",
                    "num_sources": len(results),
                })

                # Cache the results
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
            else:
                scrape_results.append({
                    "component": component["name"],
                    "status": "not_found",
                    "num_sources": 0,
                })
        except Exception as e:
            scrape_results.append({
                "component": component["name"],
                "status": "error",
                "error": str(e),
            })

    return {
        "prices": prices,
        "scrape_results": scrape_results,
        "status": "scraping_complete",
    }


async def aggregate_and_respond(state: AgentState) -> dict:
    """
    Node 4: Aggregate prices and generate the final response.
    Calculates min/avg/max, confidence scores, and formats everything.
    """
    if state.get("error"):
        return {
            "response_text": f"Sorry, I encountered an error: {state['error']}",
            "status": "error",
        }

    bom = state.get("bom", {})
    prices = state.get("prices", {})

    # Build aggregated BOM
    aggregated_components = []
    total_min = 0
    total_max = 0

    for component in bom.get("components", []):
        name = component["name"]
        component_prices = prices.get(name, [])

        aggregated = pricing_service.aggregate_prices(component_prices)
        qty = component.get("quantity", 1)

        entry = {
            **component,
            "pricing": aggregated,
            "total_min": round(aggregated["min"] * qty, 2) if aggregated["min"] else None,
            "total_max": round(aggregated["max"] * qty, 2) if aggregated["max"] else None,
        }
        aggregated_components.append(entry)

        if aggregated["min"]:
            total_min += entry["total_min"]
        if aggregated["max"]:
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

    # Use LLM to format a nice response
    try:
        response_text = await llm_service.format_response(aggregated_bom)
    except Exception:
        # Fallback to raw data if LLM formatting fails
        response_text = f"## Bill of Materials\n\n{json.dumps(aggregated_bom, indent=2)}"

    return {
        "aggregated_bom": aggregated_bom,
        "response_text": response_text,
        "status": "complete",
    }
