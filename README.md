# PlanPilot

Multi-agent event planner built with LangGraph, FastAPI and Google Gemini.

```
request -> supervisor (guardrail + routing)
        -> venue | vendor | weather | budget | marketing   (parallel)
        -> schedule -> draft -> human review -> final plan
                                   ^-- revise loop (max 3)
```

## Quick start
```bash
python -m venv .venv
.venv\Scripts\activate          # Windows   (macOS/Linux: source .venv/bin/activate)
pip install -r requirements.txt
copy .env.example .env          # then add your keys   (macOS/Linux: cp)
uvicorn app.main:app --reload
```
Open http://127.0.0.1:8000. Run tests with `python -m pytest -q` (no keys needed).

## Keys
- `GEMINI_API_KEY` (required)
- `TAVILY_API_KEY` (optional; without it venue/vendor agents skip live search)
- Weather uses Open-Meteo and needs no key.
