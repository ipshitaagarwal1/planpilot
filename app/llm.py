import os

from langchain_google_genai import ChatGoogleGenerativeAI

from .config import MODEL


def get_llm(temperature: float = 0.3) -> ChatGoogleGenerativeAI:
    """Single place to change the model/provider. Reads GEMINI_API_KEY from env."""
    return ChatGoogleGenerativeAI(
        model=MODEL,
        google_api_key=os.getenv("GEMINI_API_KEY"),
        max_retries=6,
        temperature=temperature,
    )
