from langchain_anthropic import ChatAnthropic

from .config import MODEL


def get_llm(temperature: float = 0.3) -> ChatAnthropic:
    """Single place to change the model/provider. Reads ANTHROPIC_API_KEY from env."""
    return ChatAnthropic(model=MODEL, temperature=temperature, max_tokens=2048)
