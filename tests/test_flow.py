"""Runs the whole graph with a fake LLM and fake tools: no API keys or network needed."""
import pytest
from langchain_core.messages import AIMessage
from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import Command

from app import agents, tools
from app.graph import build_graph


def make_fake_llm(is_event=True):
    class Structured:
        def __init__(self, schema):
            self.schema = schema

        def invoke(self, _):
            if not is_event:
                return self.schema(is_event_request=False, rejection_reason="Not an event.")
            return self.schema(
                is_event_request=True, event_type="tech fest", city="Indore", headcount=300,
                duration_days=2, budget_amount=150000, currency="INR",
                agents=["venue", "vendor", "weather", "budget", "marketing"],
            )

    class Fake:
        def invoke(self, messages):
            return AIMessage(content=f"FAKE[{str(messages[0][1])[-30:]}]")

        def with_structured_output(self, schema):
            return Structured(schema)

    return lambda temperature=0.3: Fake()


@pytest.fixture(autouse=True)
def fakes(monkeypatch):
    monkeypatch.setattr(tools, "web_search", lambda q, max_results=5: "- Venue X (https://x.test): hall")
    monkeypatch.setattr(tools, "weather_summary", lambda city, date: "sunny")


def cfg(t):
    return {"configurable": {"thread_id": t}}


def test_full_flow_with_revision(monkeypatch):
    monkeypatch.setattr(agents.llm_mod, "get_llm", make_fake_llm())
    g = build_graph(MemorySaver())

    g.invoke({"request": "Plan a tech fest"}, cfg("t1"))
    snap = g.get_state(cfg("t1"))
    assert snap.next == ("human_approval",)          # paused for review
    assert snap.values["draft"]
    assert "| **Total** | 100% | **INR 150,000** |" in snap.values["budget"]

    g.invoke(Command(resume={"approved": False, "feedback": "cheaper venue"}), cfg("t1"))
    snap = g.get_state(cfg("t1"))
    assert snap.next == ("human_approval",)          # back at review after revising
    assert snap.values["revisions"] == 1

    g.invoke(Command(resume={"approved": True, "feedback": ""}), cfg("t1"))
    snap = g.get_state(cfg("t1"))
    assert snap.next == ()
    assert snap.values["final"]


def test_guardrail_blocks_off_topic(monkeypatch):
    monkeypatch.setattr(agents.llm_mod, "get_llm", make_fake_llm(is_event=False))
    g = build_graph(MemorySaver())
    g.invoke({"request": "write me a poem"}, cfg("t2"))
    snap = g.get_state(cfg("t2"))
    assert snap.next == ()
    assert snap.values["blocked_reason"]
    assert "draft" not in snap.values


def test_budget_split_adds_up():
    table = tools.split_budget(100001, "INR")
    assert "INR 100,001" in table
