"""Tools the agents can call. Each returns plain text so it can go straight into a prompt."""
import datetime

import httpx

from .config import tavily_key


def web_search(query: str, max_results: int = 5) -> str:
    key = tavily_key()
    if not key:
        return "(Web search is disabled: set TAVILY_API_KEY to get real venue/vendor results.)"
    try:
        from tavily import TavilyClient

        res = TavilyClient(api_key=key).search(query, max_results=max_results)
        lines = []
        for r in res.get("results", []):
            snippet = (r.get("content") or "")[:300].replace("\n", " ")
            lines.append(f"- {r.get('title')} ({r.get('url')}): {snippet}")
        return "\n".join(lines) or "(No results found.)"
    except Exception as e:  # keep the workflow alive if a tool fails
        return f"(Search failed: {e})"


def weather_summary(city: str, date: str) -> str:
    """Free forecast via Open-Meteo (no API key). Only covers ~16 days ahead."""
    if not city:
        return "No city given, so no weather lookup was done."
    try:
        geo = httpx.get(
            "https://geocoding-api.open-meteo.com/v1/search",
            params={"name": city, "count": 1},
            timeout=10,
        ).json()
        found = geo.get("results") or []
        if not found:
            return f"Could not locate '{city}' for a forecast."
        if not date:
            return f"No exact date given for {city}; use typical seasonal weather instead."
        days_ahead = (datetime.date.fromisoformat(date) - datetime.date.today()).days
        if days_ahead < 0 or days_ahead > 15:
            return (
                f"{date} is outside the 16-day forecast window; "
                f"use typical seasonal weather for {city}."
            )
        f = httpx.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": found[0]["latitude"],
                "longitude": found[0]["longitude"],
                "daily": "temperature_2m_max,temperature_2m_min,precipitation_probability_max",
                "start_date": date,
                "end_date": date,
                "timezone": "auto",
            },
            timeout=10,
        ).json()["daily"]
        return (
            f"Forecast for {city} on {date}: high {f['temperature_2m_max'][0]}°C, "
            f"low {f['temperature_2m_min'][0]}°C, "
            f"rain chance {f['precipitation_probability_max'][0]}%."
        )
    except Exception as e:
        return f"(Weather lookup failed: {e})"


BUDGET_SPLIT = {
    "Venue": 0.25,
    "Food & beverages": 0.25,
    "Decor & stage": 0.10,
    "Sound, lights & AV": 0.10,
    "Marketing & printing": 0.07,
    "Photo & video": 0.05,
    "Staff & logistics": 0.05,
    "Miscellaneous": 0.05,
    "Contingency": 0.08,
}


def split_budget(amount: int, currency: str = "INR") -> str:
    """Deterministic allocation, so the numbers are never made up by the LLM."""
    if amount <= 0:
        return "No budget was given, so no allocation was calculated."
    rows = {k: round(amount * v) for k, v in BUDGET_SPLIT.items()}
    rows["Contingency"] += amount - sum(rows.values())  # absorb rounding drift
    table = ["| Category | Share | Amount |", "|---|---|---|"]
    for k, v in rows.items():
        table.append(f"| {k} | {BUDGET_SPLIT[k]:.0%} | {currency} {v:,} |")
    table.append(f"| **Total** | 100% | **{currency} {amount:,}** |")
    return "\n".join(table)
