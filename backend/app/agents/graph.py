"""
KharchaAI LangGraph Workflow Definition

Flow:
  understand_request → [needs_clarification? → END]
                     → [confirmed → generate_bom → check_cache → scrape → aggregate → END]
"""
from langgraph.graph import StateGraph, START, END
from app.agents.state import AgentState
from app.agents.nodes import (
    understand_request,
    generate_bom,
    check_price_cache,
    scrape_prices,
    aggregate_and_respond,
)


def after_understand(state: AgentState) -> str:
    """Route after understanding: either ask user or proceed to BOM."""
    if state.get("needs_confirmation") and not state.get("confirmed"):
        return "end"  # Return to user for clarification
    return "generate_bom"


def should_scrape(state: AgentState) -> str:
    """Route after cache check: scrape if there are misses."""
    if state.get("error"):
        return "aggregate"
    if state.get("cache_misses"):
        return "scrape"
    return "aggregate"


def build_agent_graph() -> StateGraph:
    """Build the KharchaAI agent workflow graph."""
    graph = StateGraph(AgentState)

    # Add nodes
    graph.add_node("understand_request", understand_request)
    graph.add_node("generate_bom", generate_bom)
    graph.add_node("check_cache", check_price_cache)
    graph.add_node("scrape_prices", scrape_prices)
    graph.add_node("aggregate", aggregate_and_respond)

    # Define edges
    graph.add_edge(START, "understand_request")

    # Conditional: clarify or proceed
    graph.add_conditional_edges(
        "understand_request",
        after_understand,
        {
            "end": END,
            "generate_bom": "generate_bom",
        },
    )

    graph.add_edge("generate_bom", "check_cache")

    # Conditional: scrape only if cache misses
    graph.add_conditional_edges(
        "check_cache",
        should_scrape,
        {
            "scrape": "scrape_prices",
            "aggregate": "aggregate",
        },
    )

    graph.add_edge("scrape_prices", "aggregate")
    graph.add_edge("aggregate", END)

    return graph.compile()


# Compiled agent
kharcha_agent = build_agent_graph()
