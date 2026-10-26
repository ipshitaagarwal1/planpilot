from langgraph.graph import END, START, StateGraph

from . import agents as a
from .state import EventState


def build_graph(checkpointer):
    g = StateGraph(EventState)

    g.add_node("supervisor_agent", a.supervisor_agent)
    for name in a.WORKERS:
        g.add_node(f"{name}_agent", getattr(a, f"{name}_agent"))
    g.add_node("schedule_agent", a.schedule_agent)
    g.add_node("draft_agent", a.draft_agent)
    g.add_node("human_approval", a.human_approval)
    g.add_node("revise_agent", a.revise_agent)
    g.add_node("final_agent", a.final_agent)

    g.add_edge(START, "supervisor_agent")
    # Supervisor fans out to whichever workers it selected (they run in parallel).
    g.add_conditional_edges("supervisor_agent", a.route_after_supervisor)
    for name in a.WORKERS:
        g.add_edge(f"{name}_agent", "schedule_agent")  # join: runs once after all selected workers finish
    g.add_edge("schedule_agent", "draft_agent")
    g.add_edge("draft_agent", "human_approval")
    g.add_conditional_edges("human_approval", a.route_after_approval)
    g.add_edge("revise_agent", "human_approval")
    g.add_edge("final_agent", END)

    return g.compile(checkpointer=checkpointer)
