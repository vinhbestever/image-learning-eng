from deepagents import create_deep_agent
from langgraph.checkpoint.memory import MemorySaver
from .prompts import SYSTEM_PROMPT
from .tools import ask_user


def build_agent():
    """Build a deep agent for English learning image Q&A."""
    checkpointer = MemorySaver()
    agent = create_deep_agent(
        model="openai:gpt-4o",
        tools=[ask_user],
        system_prompt=SYSTEM_PROMPT,
        checkpointer=checkpointer,
    )
    return agent


agent = build_agent()
