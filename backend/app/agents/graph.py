"""
KharchaAI LangGraph Workflow Definition
"""
from langgraph.graph import StateGraph, START, END
from app.agents.state import AgentState
from app.agents.nodes import (
    parse_and_identify_components,
    check_price_cache,
    scrape_prices,
    aggregate_and_respond,
)


def should_scrape(state: AgentState) -> str:
    """Decide whether we need to scrape prices or can skip to aggregation."""
    if state.get("error"):
        return "aggregate"
    if state.get("cache_misses"):
        return "scrape"
    return "aggregate"


def build_agent_graph() -> StateGraph:
    """Build the KharchaAI agent workflow graph.

    Flow:
        parse_and_identify → check_cache → [scrape_prices | skip] → aggregate_and_respond
    """
    graph = StateGraph(AgentState)

    # Add nodes
    graph.add_node("identify_components", parse_and_identify_components)
    graph.add_node("check_cache", check_price_cache)
    graph.add_node("scrape_prices", scrape_prices)
    graph.add_node("aggregate", aggregate_and_respond)

    # Define edges
    graph.add_edge(START, "identify_components")
    graph.add_edge("identify_components", "check_cache")

    # Conditional: scrape only if there are cache misses
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


# Compiled agent — ready to invoke
kharcha_agent = build_agent_graph()
