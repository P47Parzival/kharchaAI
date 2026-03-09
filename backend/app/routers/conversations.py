"""
KharchaAI — Conversations API Router
Retrieve conversation history.
"""
import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Conversation, Message

router = APIRouter()


class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    bom: dict | None = None
    created_at: str


class ConversationSummary(BaseModel):
    id: str
    title: str
    created_at: str
    updated_at: str


class ConversationDetail(BaseModel):
    id: str
    title: str
    messages: list[MessageResponse]
    created_at: str


@router.get("/conversations", response_model=list[ConversationSummary])
async def list_conversations(db: AsyncSession = Depends(get_db)):
    """List all conversations, most recent first."""
    stmt = select(Conversation).order_by(Conversation.updated_at.desc())
    result = await db.execute(stmt)
    conversations = result.scalars().all()

    return [
        ConversationSummary(
            id=c.id,
            title=c.title,
            created_at=c.created_at.isoformat(),
            updated_at=c.updated_at.isoformat(),
        )
        for c in conversations
    ]


@router.get("/conversations/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(conversation_id: str, db: AsyncSession = Depends(get_db)):
    """Get a single conversation with all its messages."""
    stmt = (
        select(Conversation)
        .where(Conversation.id == conversation_id)
        .options(selectinload(Conversation.messages))
    )
    result = await db.execute(stmt)
    conversation = result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = []
    for msg in conversation.messages:
        bom = None
        if msg.metadata_json:
            try:
                bom = json.loads(msg.metadata_json)
            except json.JSONDecodeError:
                pass

        messages.append(
            MessageResponse(
                id=msg.id,
                role=msg.role,
                content=msg.content,
                bom=bom,
                created_at=msg.created_at.isoformat(),
            )
        )

    return ConversationDetail(
        id=conversation.id,
        title=conversation.title,
        messages=messages,
        created_at=conversation.created_at.isoformat(),
    )


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a conversation and all its messages."""
    conversation = await db.get(Conversation, conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    await db.delete(conversation)
    return {"status": "deleted"}
