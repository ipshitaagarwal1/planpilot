import sqlite3
import uuid
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.types import Command
from pydantic import BaseModel

from .config import DB_PATH
from .graph import build_graph

STATIC = Path(__file__).resolve().parent.parent / "static"

conn = sqlite3.connect(DB_PATH, check_same_thread=False)
graph = build_graph(SqliteSaver(conn))
app = FastAPI(title="PlanPilot")


class PlanRequest(BaseModel):
    message: str
    thread_id: str | None = None


class ReviewRequest(BaseModel):
    thread_id: str
    approved: bool
    feedback: str = ""


def _cfg(thread_id: str) -> dict:
    return {"configurable": {"thread_id": thread_id}}


def _response(thread_id: str) -> dict:
    snap = graph.get_state(_cfg(thread_id))
    v = snap.values
    if snap.next:  # paused at human_approval
        return {"thread_id": thread_id, "status": "needs_review", "draft": v.get("draft", ""),
                "revisions": v.get("revisions", 0)}
    if v.get("blocked_reason"):
        return {"thread_id": thread_id, "status": "blocked", "answer": v.get("final", "")}
    return {"thread_id": thread_id, "status": "done", "answer": v.get("final", "")}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/plan")
def plan(req: PlanRequest):
    if not req.message.strip():
        raise HTTPException(400, "Message is empty.")
    thread_id = req.thread_id or f"evt_{uuid.uuid4().hex[:12]}"
    graph.invoke({"request": req.message}, _cfg(thread_id))
    return _response(thread_id)


@app.post("/api/plan/review")
def review(req: ReviewRequest):
    cfg = _cfg(req.thread_id)
    if not graph.get_state(cfg).next:
        raise HTTPException(409, "This plan is not waiting for review.")
    graph.invoke(Command(resume={"approved": req.approved, "feedback": req.feedback}), cfg)
    return _response(req.thread_id)


app.mount("/static", StaticFiles(directory=STATIC), name="static")


@app.get("/")
def index():
    return FileResponse(STATIC / "index.html")
