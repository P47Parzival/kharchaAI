"""
KharchaAI Agent State Schema
"""
from typing import TypedDict, Annotated
from langgraph.graph.message import add_messages


class AgentState(TypedDict):
    """State that flows through the LangGraph agent pipeline."""

    # User input
    user_query: str
    conversation_id: str

    # BOM from LLM reasoning
    bom: dict | None  # Structured BOM with components list

    # Price data
    prices: dict  # {component_name: {source: price_data}}
    cache_hits: list[str]  # Component names found in cache
    cache_misses: list[str]  # Component names needing scraping

    # Scraping results
    scrape_results: list[dict]  # Raw scrape results

    # Final output
    aggregated_bom: dict | None  # BOM with aggregated prices
    response_text: str  # Final formatted response
    error: str | None  # Any error message
    status: str  # Current pipeline status
