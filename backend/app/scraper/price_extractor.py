"""
KharchaAI — Price Extractor
Three-tier strategy: (1) MCP headless Chrome → (2) httpx fallback → (3) LLM estimation
"""
import asyncio
import logging
import httpx
from app.scraper.sites import SITE_CONFIGS, get_search_url, get_all_sites
from app.scraper.mcp_client import mcp_browser
from app.services.llm import llm_service
from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


class PriceExtractor:
    """
    Extracts real-time prices from supplier websites.

    Strategy per component:
    1. Try MCP (headless Chrome) — handles JS-rendered pages, bot protection
    2. Fall back to httpx — works for simpler/static pages
    3. Pass extracted content to LLM for structured price parsing
    """

    async def search_component(
        self, component: dict, step_callback=None
    ) -> list[dict]:
        """
        Search for a component across supplier sites.
        
        Args:
            component: Dict with name, search_keywords, etc.
            step_callback: Optional async callback for reporting progress
        """
        results = []
        keywords = component.get("search_keywords", [component["name"]])
        search_term = keywords[0] if keywords else component["name"]
        sites = get_all_sites()
        max_sources = settings.max_sources_per_component

        for site_key in sites:
            if len(results) >= max_sources:
                break

            site_name = SITE_CONFIGS[site_key]["name"]

            if step_callback:
                await step_callback(
                    f"Searching {site_name} for {component['name']}..."
                )

            try:
                result = await self._scrape_site(site_key, search_term, component["name"])
                if result and result.get("found"):
                    results.append({
                        "source_site": site_name,
                        "source_url": result.get("source_url", ""),
                        "price": result.get("price"),
                        "currency": result.get("currency", SITE_CONFIGS[site_key]["currency"]),
                        "product_name": result.get("product_name", ""),
                        "in_stock": result.get("in_stock"),
                        "scraped": True,
                    })

                    if step_callback:
                        price = result.get("price", 0)
                        currency = result.get("currency", "USD")
                        symbol = "₹" if currency == "INR" else "$"
                        await step_callback(
                            f"Found {component['name']} at {symbol}{price:.2f} on {site_name}"
                        )
            except Exception as e:
                logger.warning(f"Failed to scrape {site_key} for {search_term}: {e}")

        return results

    async def _scrape_site(self, site_key: str, search_term: str, component_name: str) -> dict | None:
        """
        Scrape pricing from a single supplier site.
        Tries MCP first, then falls back to httpx.
        """
        url = get_search_url(site_key, search_term)

        # ── Strategy 1: MCP headless Chrome ──
        page_text = await self._try_mcp_scrape(url, site_key)

        # ── Strategy 2: httpx fallback ──
        if not page_text or len(page_text) < 200:
            page_text = await self._try_httpx_scrape(url, site_key)

        # ── Parse with LLM ──
        if page_text and len(page_text) > 200:
            result = await llm_service.extract_price_from_text(
                component_name, page_text
            )
            if result and result.get("found"):
                result["source_url"] = str(url)
                return result

        return None

    async def _try_mcp_scrape(self, url: str, site_key: str) -> str:
        """Try to scrape using MCP headless Chrome."""
        try:
            if not mcp_browser.is_connected:
                await mcp_browser.connect()

            page_text = await mcp_browser.scrape_url(url, wait_ms=4000)
            if page_text and len(page_text) > 200:
                logger.info(f"MCP scrape success for {site_key}: {len(page_text)} chars")
                return page_text

        except Exception as e:
            logger.info(f"MCP scrape failed for {site_key}: {e}")

        return ""

    async def _try_httpx_scrape(self, url: str, site_key: str) -> str:
        """Try to scrape using simple HTTP request."""
        try:
            async with httpx.AsyncClient(
                timeout=settings.scraper_timeout_seconds,
                follow_redirects=True,
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.5",
                },
            ) as client:
                response = await client.get(url)
                if response.status_code == 200:
                    page_text = self._html_to_text(response.text)
                    if len(page_text) > 200:
                        logger.info(f"httpx scrape success for {site_key}: {len(page_text)} chars")
                        return page_text

        except Exception as e:
            logger.info(f"httpx scrape failed for {site_key}: {e}")

        return ""

    def _html_to_text(self, html: str) -> str:
        """Basic HTML to text conversion."""
        import re
        text = re.sub(r"<script[^>]*>.*?</script>", "", html, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r"<style[^>]*>.*?</style>", "", text, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r"<[^>]+>", " ", text)
        text = re.sub(r"\s+", " ", text)
        return text[:12000].strip()


# Singleton
price_extractor = PriceExtractor()
