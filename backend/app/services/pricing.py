"""
KharchaAI Price Aggregation & Caching Service
"""
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import PriceCache
from app.config import get_settings

settings = get_settings()


class PricingService:
    """Handles price caching, aggregation, and confidence scoring."""

    async def get_cached_prices(
        self, db: AsyncSession, component_name: str
    ) -> list[dict] | None:
        """Check if we have valid cached prices for a component."""
        now = datetime.now(timezone.utc)

        stmt = select(PriceCache).where(
            PriceCache.component_name == component_name,
            PriceCache.expires_at > now,
        )
        result = await db.execute(stmt)
        cached = result.scalars().all()

        if not cached:
            return None

        return [
            {
                "source_site": c.source_site,
                "source_url": c.source_url,
                "price": c.price,
                "currency": c.currency,
                "quantity_tier": c.quantity_tier,
                "scraped_at": c.scraped_at.isoformat(),
            }
            for c in cached
        ]

    async def cache_price(
        self,
        db: AsyncSession,
        component_name: str,
        source_site: str,
        source_url: str,
        price: float,
        currency: str = "USD",
        quantity_tier: int = 1,
    ):
        """Store a scraped price in the cache."""
        now = datetime.now(timezone.utc)
        expires = now + timedelta(hours=settings.price_cache_ttl_hours)

        entry = PriceCache(
            component_name=component_name,
            source_site=source_site,
            source_url=source_url,
            price=price,
            currency=currency,
            quantity_tier=quantity_tier,
            scraped_at=now,
            expires_at=expires,
        )
        db.add(entry)
        await db.flush()

    def aggregate_prices(self, prices: list[dict]) -> dict:
        """Aggregate prices from multiple sources into min/avg/max with confidence."""
        if not prices:
            return {
                "min": None,
                "avg": None,
                "max": None,
                "sources": [],
                "confidence": "no_data",
            }

        values = [p["price"] for p in prices if p.get("price")]
        if not values:
            return {
                "min": None,
                "avg": None,
                "max": None,
                "sources": prices,
                "confidence": "no_data",
            }

        avg_price = sum(values) / len(values)

        # Confidence scoring based on number of sources and price variance
        if len(values) >= 3:
            variance = max(values) - min(values)
            relative_variance = variance / avg_price if avg_price > 0 else 0
            if relative_variance < 0.2:
                confidence = "high"
            elif relative_variance < 0.5:
                confidence = "medium"
            else:
                confidence = "low"
        elif len(values) == 2:
            confidence = "medium"
        else:
            confidence = "low"

        return {
            "min": round(min(values), 2),
            "avg": round(avg_price, 2),
            "max": round(max(values), 2),
            "currency": prices[0].get("currency", "USD"),
            "sources": prices,
            "confidence": confidence,
            "num_sources": len(values),
        }


# Singleton
pricing_service = PricingService()
