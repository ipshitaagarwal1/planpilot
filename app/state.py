from typing import TypedDict


class EventState(TypedDict, total=False):
    request: str            # raw user message
    details: dict           # structured event details from the supervisor
    selected_agents: list   # which worker agents to run
    blocked_reason: str     # set when the guardrail rejects the request
    venues: str
    vendors: str
    weather: str
    budget: str
    marketing: str
    schedule: str
    draft: str              # combined plan awaiting human review
    approved: bool
    feedback: str           # human revision notes
    revisions: int
    final: str              # polished output (or friendly rejection message)
