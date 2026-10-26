"""API checks with a fake LLM: plan sections are returned and both pages are served."""
import os

os.environ.setdefault("PLANPILOT_DB", ":memory:")

from fastapi.testclient import TestClient

from app import agents, tools
from tests.test_flow import make_fake_llm


def client(monkeypatch):
    monkeypatch.setattr(agents.llm_mod, "get_llm", make_fake_llm())
    monkeypatch.setattr(tools, "web_search", lambda q, max_results=5: "- X (https://x.test): hall")
    monkeypatch.setattr(tools, "weather_summary", lambda c, d: "sunny")
    from app.main import app
    return TestClient(app)


def test_plan_returns_sections_and_review_flow(monkeypatch):
    c = client(monkeypatch)
    r = c.post("/api/plan", json={"message": "plan a fest"}).json()
    assert r["status"] == "needs_review"
    assert set(r["sections"]) == {"venues", "vendors", "weather", "budget", "schedule", "marketing"}
    assert "| **Total** |" in r["sections"]["budget"]
    r2 = c.post("/api/plan/review", json={"thread_id": r["thread_id"], "approved": False, "feedback": "cheaper"}).json()
    assert r2["status"] == "needs_review" and r2["revisions"] == 1
    r3 = c.post("/api/plan/review", json={"thread_id": r["thread_id"], "approved": True}).json()
    assert r3["status"] == "done" and r3["answer"]


def test_pages_are_served(monkeypatch):
    c = client(monkeypatch)
    assert c.get("/").status_code == 200
    assert c.get("/login").status_code == 200
    assert c.get("/static/style.css").status_code == 200
    assert c.get("/static/app.js").status_code == 200
    assert c.get("/static/login.js").status_code == 200
