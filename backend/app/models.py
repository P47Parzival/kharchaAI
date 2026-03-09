"""
KharchaAI Database Models
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, DateTime, Float, Integer, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


def _utcnow():
    return datetime.now(timezone.utc)


def _gen_uuid():
    return str(uuid.uuid4())


# ──────────────────────────────────────────────────────────────
# Conversations & Messages
# ──────────────────────────────────────────────────────────────

class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_gen_uuid)
    title: Mapped[str] = mapped_column(String(255), default="New Conversation")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, onupdate=_utcnow)

    messages: Mapped[list["Message"]] = relationship(
        "Message", back_populates="conversation", cascade="all, delete-orphan",
        order_by="Message.created_at"
    )


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_gen_uuid)
    conversation_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("conversations.id", ondelete="CASCADE")
    )
    role: Mapped[str] = mapped_column(String(20))  # "user" | "assistant"
    content: Mapped[str] = mapped_column(Text)  # Plain text or JSON string
    metadata_json: Mapped[str | None] = mapped_column(Text, nullable=True)  # BOM data, sources, etc.
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)

    conversation: Mapped["Conversation"] = relationship("Conversation", back_populates="messages")


# ──────────────────────────────────────────────────────────────
# Price Cache
# ──────────────────────────────────────────────────────────────

class PriceCache(Base):
    __tablename__ = "price_cache"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_gen_uuid)
    component_name: Mapped[str] = mapped_column(String(255), index=True)
    source_site: Mapped[str] = mapped_column(String(100))  # "digikey", "mouser", "amazon", "robu"
    source_url: Mapped[str] = mapped_column(Text)
    price: Mapped[float] = mapped_column(Float)
    currency: Mapped[str] = mapped_column(String(10), default="USD")
    quantity_tier: Mapped[int] = mapped_column(Integer, default=1)
    scraped_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime)


# ──────────────────────────────────────────────────────────────
# Component Knowledge Base
# ──────────────────────────────────────────────────────────────

class Component(Base):
    __tablename__ = "components"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_gen_uuid)
    name: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    category: Mapped[str] = mapped_column(String(100))  # "sensor", "mcu", "passive", "module"
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    common_specs: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON of typical specs
    search_keywords: Mapped[str | None] = mapped_column(Text, nullable=True)  # Comma-separated
