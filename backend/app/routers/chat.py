"""
KharchaAI — Chat API Router
Handles user messages, human-in-the-loop confirmation, and agent pipeline.
"""
import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Conversation, Message
from app.agents.graph import kharcha_agent

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None


class StepData(BaseModel):
    step: str
    status: str = "done"
    detail: str = ""


class ChatResponse(BaseModel):
    conversation_id: str
    response: str
    bom: dict | None = None
    steps: list[StepData] = []
    status: str = "complete"


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, db: AsyncSession = Depends(get_db)):
    """
    Process a user message through the KharchaAI agent pipeline.

    Flow:
    1. First message → understand_request → may return clarification
    2. User confirms → full pipeline (BOM → cache → scrape → aggregate)
    3. Response includes agent steps for transparency
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

    # 3. Build conversation history from prior messages
    conversation_history = []
    from sqlalchemy import select
    from app.models import Message as MessageModel
    stmt = (
        select(MessageModel)
        .where(MessageModel.conversation_id == conversation.id)
        .order_by(MessageModel.created_at)
    )
    result = await db.execute(stmt)
    prior_messages = result.scalars().all()

    for msg in prior_messages:
        conversation_history.append({
            "role": msg.role,
            "content": msg.content,
        })

    # 4. Run the agent pipeline
    try:
        initial_state = {
            "user_query": request.message,
            "conversation_id": conversation.id,
            "conversation_history": conversation_history,
            "needs_confirmation": False,
            "confirmed": False,
            "clarification_response": "",
            "bom": None,
            "prices": {},
            "cache_hits": [],
            "cache_misses": [],
            "scrape_results": [],
            "steps": [],
            "aggregated_bom": None,
            "response_text": "",
            "error": None,
            "status": "started",
        }

        agent_result = await kharcha_agent.ainvoke(initial_state)

        # Check if agent needs clarification (human-in-the-loop)
        if agent_result.get("needs_confirmation") and not agent_result.get("confirmed"):
            response_text = agent_result.get("clarification_response", "")
            aggregated_bom = None
            status = agent_result.get("status", "awaiting_clarification")
        else:
            response_text = agent_result.get("response_text", "Sorry, I couldn't process your request.")
            aggregated_bom = agent_result.get("aggregated_bom")
            status = agent_result.get("status", "complete")

        steps = agent_result.get("steps", [])

    except Exception as e:
        response_text = f"I encountered an error: {str(e)}"
        aggregated_bom = None
        steps = [{"step": "❌ Pipeline error", "status": "error", "detail": str(e)}]
        status = "error"

    # 5. Save assistant response
    assistant_msg = Message(
        conversation_id=conversation.id,
        role="assistant",
        content=response_text,
        metadata_json=json.dumps({
            "bom": aggregated_bom,
            "steps": steps,
            "status": status,
        }) if aggregated_bom or steps else None,
    )
    db.add(assistant_msg)

    # Update conversation title from first message
    if not request.conversation_id:
        conversation.title = request.message[:50] + ("..." if len(request.message) > 50 else "")

    await db.flush()

    return ChatResponse(
        conversation_id=conversation.id,
        response=response_text,
        bom=aggregated_bom,
        steps=[StepData(**s) for s in steps] if steps else [],
        status=status,
    )
