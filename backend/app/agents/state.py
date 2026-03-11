"""
KharchaAI Agent State Schema
"""
from typing import TypedDict


class AgentState(TypedDict):
    """State that flows through the LangGraph agent pipeline."""

    # User input
    user_query: str
    conversation_id: str
    conversation_history: list[dict]  # Prior messages for context

    # Understanding & confirmation
    needs_confirmation: bool  # Does the LLM need to ask the user something?
    confirmed: bool  # Has the user confirmed the BOM?
    clarification_response: str  # LLM's clarification or confirmation message

    # BOM from LLM reasoning
    bom: dict | None  # Structured BOM with components list

    # Price data
    prices: dict  # {component_name: [price_entries]}
    cache_hits: list[str]
    cache_misses: list[str]

    # Scraping results
    scrape_results: list[dict]

    # Agent steps — visible to the user
    steps: list[dict]  # [{step: str, status: str, detail: str}]

    # Final output
    aggregated_bom: dict | None
    response_text: str
    error: str | None
    status: str  # pipeline status
