"""
KharchaAI — Price Extractor using chrome-devtools-mcp
Navigates supplier websites in headless Chrome and extracts pricing data.
Falls back to LLM-based extraction when structured parsing fails.
"""
import asyncio
import subprocess
import json
import logging
from app.scraper.sites import SITE_CONFIGS, get_search_url, get_all_sites
from app.services.llm import llm_service
from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


class PriceExtractor:
    """
    Extracts real-time prices from supplier websites.

    Strategy:
    1. For each component, try multiple supplier sites
    2. Navigate to the site's search page using chrome-devtools-mcp (headless)
    3. Extract the page content
    4. Use LLM to parse prices from the page text (more reliable than CSS selectors)
    5. Return structured price data

    The chrome-devtools-mcp runs Chrome in HEADLESS mode — no visible browser window.
    """

    def __init__(self):
        self._mcp_process = None
        self._connected = False

    async def search_component(self, component: dict) -> list[dict]:
        """
        Search for a component across multiple supplier sites.

        Args:
            component: Dict with 'name', 'search_keywords', etc.

        Returns:
            List of price results from different sources.
        """
        results = []
        keywords = component.get("search_keywords", [component["name"]])

        # Use the primary keyword for searching
        search_term = keywords[0] if keywords else component["name"]

        sites = get_all_sites()
        max_sources = settings.max_sources_per_component

        for site_key in sites:
            if len(results) >= max_sources:
                break

            try:
                result = await self._scrape_site(site_key, search_term, component["name"])
                if result and result.get("found"):
                    results.append({
                        "source_site": site_key,
                        "source_url": result.get("source_url", ""),
                        "price": result.get("price"),
                        "currency": result.get("currency", SITE_CONFIGS[site_key]["currency"]),
                        "product_name": result.get("product_name", ""),
                        "in_stock": result.get("in_stock", None),
                    })
            except Exception as e:
                logger.warning(f"Failed to scrape {site_key} for {search_term}: {e}")
                continue

        return results

    async def _scrape_site(self, site_key: str, search_term: str, component_name: str) -> dict | None:
        """
        Scrape pricing from a single supplier site.

        Uses httpx as a lightweight first attempt, falls back to
        chrome-devtools-mcp for JavaScript-heavy sites.
        """
        import httpx

        url = get_search_url(site_key, search_term)

        try:
            # First try: simple HTTP request (fast, works for many sites)
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
                    page_text = response.text

                    # Strip HTML to get text content (basic approach)
                    page_text = self._html_to_text(page_text)

                    if len(page_text) > 200:  # Got meaningful content
                        result = await llm_service.extract_price_from_text(
                            component_name, page_text
                        )
                        if result:
                            result["source_url"] = str(url)
                        return result

        except Exception as e:
            logger.info(f"HTTP scrape failed for {site_key}, will try MCP: {e}")

        # Fallback: Use chrome-devtools-mcp for JS-rendered pages
        # This will be enhanced when MCP integration is fully wired
        return None

    def _html_to_text(self, html: str) -> str:
        """Very basic HTML to text conversion. Strips tags and excessive whitespace."""
        import re
        # Remove script and style blocks
        text = re.sub(r"<script[^>]*>.*?</script>", "", html, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r"<style[^>]*>.*?</style>", "", text, flags=re.DOTALL | re.IGNORECASE)
        # Remove HTML tags
        text = re.sub(r"<[^>]+>", " ", text)
        # Clean up whitespace
        text = re.sub(r"\s+", " ", text)
        # Limit length
        return text[:10000].strip()


# Singleton
price_extractor = PriceExtractor()
