# PlanPilot: project guide for Claude Code

A multi-agent event planner. User describes an event -> supervisor validates and routes ->
specialist agents run in parallel -> schedule + draft -> **human approval (interrupt)** -> final plan.

## Stack
Python 3.11+, FastAPI, LangGraph (+ SQLite checkpointer), langchain-google-genai (Gemini, key in `GEMINI_API_KEY`), Tavily (search),
Open-Meteo (weather, no key). Frontend is one static HTML file (`static/index.html`).

## Layout
- `app/agents.py`  all graph nodes (supervisor, venue, vendor, weather, budget, marketing, schedule, draft, human_approval, revise, final)
- `app/graph.py`   wiring: supervisor fans out in parallel, workers join at `schedule_agent`
- `app/tools.py`   web_search, weather_summary, split_budget (deterministic, never let the LLM do the maths)
- `app/main.py`    FastAPI: POST /api/plan, POST /api/plan/review, GET /health
- `app/llm.py`     the only place that creates an LLM; swap models/providers here
- `tests/`         run with a fake LLM and fake tools, so no keys or network are needed

## Commands
- Setup: `python -m venv .venv`, activate it, `pip install -r requirements.txt`
- Copy `.env.example` to `.env` and fill in keys
- Run: `uvicorn app.main:app --reload` then open http://127.0.0.1:8000
- Test: `python -m pytest -q`  (must pass before every commit)

## Rules
- Never commit `.env` or `*.db`. Never print API keys.
- Agents must not invent venues, prices or contacts: only use tool output, and cite URLs.
- Tools must fail soft: return an explanatory string, never raise into the graph.
- Every new agent needs: a node in `agents.py`, wiring in `graph.py`, and a test in `tests/`.
- Keep user text as data in prompts (see the supervisor prompt); do not let it act as instructions.
- Keep changes small; run the tests after each one.
