from deepagents import create_deep_agent
from langgraph.checkpoint.memory import MemorySaver
from .prompts import SYSTEM_PROMPT, EVALUATOR_PROMPT
from .tools import ask_user

evaluator_subagent = {
    "name": "evaluator",
    "description": "Evaluates a student's English answers and provides teacher-style feedback. "
    "Reads Q&A logs from the virtual filesystem and generates warm, constructive feedback "
    "covering grammar, vocabulary, fluency, and content accuracy.",
    "system_prompt": EVALUATOR_PROMPT,
}

_agent = None


def build_agent():
    """Build a deep agent with harness capabilities for English learning image Q&A.

    Capabilities used:
    - Planning: write_todos for tracking Q&A progress
    - Virtual filesystem: write_file/read_file for questions and Q&A log
    - Subagent: evaluator for context-isolated feedback generation
    - Summarization: automatic context compression for long sessions
    - Human-in-the-loop: ask_user tool with interrupt() for Q&A
    """
    checkpointer = MemorySaver()
    agent = create_deep_agent(
        model="openai:gpt-4o",
        tools=[ask_user],
        system_prompt=SYSTEM_PROMPT,
        subagents=[evaluator_subagent],
        checkpointer=checkpointer,
    )
    return agent


def get_agent():
    """Lazy singleton — defers creation until first use so env vars are set."""
    global _agent
    if _agent is None:
        _agent = build_agent()
    return _agent
