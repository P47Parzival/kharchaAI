"""
KharchaAI — Chat API Router
Handles user messages and invokes the LangGraph agent pipeline.
"""
import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Conversation, Message
from app.agents.graph import kharcha_agent

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None


class ChatResponse(BaseModel):
    conversation_id: str
    response: str
    bom: dict | None = None
    status: str = "complete"


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, db: AsyncSession = Depends(get_db)):
    """
    Process a user message through the KharchaAI agent pipeline.

    1. Create or resume a conversation
    2. Save the user's message
    3. Run the LangGraph agent (identify → cache → scrape → aggregate)
    4. Save and return the assistant's response
    """
    # 1. Create or get conversation
    if request.conversation_id:
        conversation = await db.get(Conversation, request.conversation_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        conversation = Conversation()
        db.add(conversation)
        await db.flush()

    # 2. Save user message
    user_msg = Message(
        conversation_id=conversation.id,
        role="user",
        content=request.message,
    )
    db.add(user_msg)
    await db.flush()

    # 3. Run the agent pipeline
    try:
        initial_state = {
            "user_query": request.message,
            "conversation_id": conversation.id,
            "bom": None,
            "prices": {},
            "cache_hits": [],
            "cache_misses": [],
            "scrape_results": [],
            "aggregated_bom": None,
            "response_text": "",
            "error": None,
            "status": "started",
        }

        result = await kharcha_agent.ainvoke(initial_state)

        response_text = result.get("response_text", "Sorry, I couldn't process your request.")
        aggregated_bom = result.get("aggregated_bom")

    except Exception as e:
        response_text = f"I encountered an error while processing your request: {str(e)}"
        aggregated_bom = None

    # 4. Save assistant response
    assistant_msg = Message(
        conversation_id=conversation.id,
        role="assistant",
        content=response_text,
        metadata_json=json.dumps(aggregated_bom) if aggregated_bom else None,
    )
    db.add(assistant_msg)

    # Update conversation title based on first message
    if not request.conversation_id:
        # Use first ~50 chars of user message as title
        conversation.title = request.message[:50] + ("..." if len(request.message) > 50 else "")

    await db.flush()

    return ChatResponse(
        conversation_id=conversation.id,
        response=response_text,
        bom=aggregated_bom,
        status=result.get("status", "complete") if isinstance(result, dict) else "complete",
    )
