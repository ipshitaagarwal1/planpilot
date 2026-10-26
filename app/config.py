import os

from dotenv import load_dotenv

load_dotenv()

MODEL = os.getenv("PlanPilot_MODEL", "gemini-2.5-flash-lite")
DB_PATH = os.getenv("PlanPilot_DB", "PlanPilot.db")


def tavily_key() -> str:
    # Read at call time so tests / .env changes are picked up.
    return os.getenv("TAVILY_API_KEY", "")
