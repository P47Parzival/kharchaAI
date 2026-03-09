"""
KharchaAI — Scraper site configurations
Defines URL templates and extraction patterns for each supplier site.
"""

SITE_CONFIGS = {
    "digikey": {
        "name": "DigiKey",
        "base_url": "https://www.digikey.com",
        "search_url": "https://www.digikey.com/en/products/result?keywords={query}",
        "currency": "USD",
        "priority": 1,  # Lower = higher priority
    },
    "mouser": {
        "name": "Mouser Electronics",
        "base_url": "https://www.mouser.com",
        "search_url": "https://www.mouser.com/c/?q={query}",
        "currency": "USD",
        "priority": 2,
    },
    "amazon": {
        "name": "Amazon",
        "base_url": "https://www.amazon.com",
        "search_url": "https://www.amazon.com/s?k={query}",
        "currency": "USD",
        "priority": 3,
    },
    "robu": {
        "name": "Robu.in",
        "base_url": "https://robu.in",
        "search_url": "https://robu.in/?s={query}&post_type=product",
        "currency": "INR",
        "priority": 4,
    },
}


def get_search_url(site_key: str, query: str) -> str:
    """Generate a search URL for a given site and query."""
    config = SITE_CONFIGS.get(site_key)
    if not config:
        raise ValueError(f"Unknown site: {site_key}")
    return config["search_url"].format(query=query.replace(" ", "+"))


def get_all_sites() -> list[str]:
    """Get all site keys ordered by priority."""
    return sorted(SITE_CONFIGS.keys(), key=lambda k: SITE_CONFIGS[k]["priority"])
