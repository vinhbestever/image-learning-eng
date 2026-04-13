import os

import aiosqlite
from deepagents import create_deep_agent
from langgraph.checkpoint.memory import MemorySaver
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver

from .prompts import SYSTEM_PROMPT, EVALUATOR_PROMPT
from .skills import MAIN_SKILLS_PATH, EVALUATOR_SKILLS_PATH
from .storage import get_app_sqlite_path
from .tools import ask_user

evaluator_subagent = {
    "name": "evaluator",
    "description": "Evaluates a student's English answers and provides teacher-style feedback. "
    "Reads Q&A logs from the virtual filesystem and generates warm, constructive feedback "
    "covering grammar, vocabulary, fluency, and content accuracy.",
    "system_prompt": EVALUATOR_PROMPT,
    "skills": [EVALUATOR_SKILLS_PATH],
}

_agent = None
_async_conn: aiosqlite.Connection | None = None
_async_checkpointer: AsyncSqliteSaver | None = None


def reset_agent() -> None:
    """Clear compiled agent singleton (tests / reload)."""
    global _agent
    _agent = None


async def init_checkpointer() -> None:
    """Open async SQLite + checkpointer. Call from FastAPI lifespan (or tests skip via USE_MEMORY_CHECKPOINTER)."""
    global _async_conn, _async_checkpointer, _agent
    await shutdown_checkpointer()
    path = get_app_sqlite_path()
    _async_conn = await aiosqlite.connect(path)
    _async_checkpointer = AsyncSqliteSaver(_async_conn)
    _agent = None


async def shutdown_checkpointer() -> None:
    """Close async DB handle."""
    global _async_conn, _async_checkpointer, _agent
    _agent = None
    _async_checkpointer = None
    if _async_conn is not None:
        await _async_conn.close()
        _async_conn = None


def _select_checkpointer():
    """Tests use in-memory graph; production uses AsyncSqliteSaver (async-safe with ainvoke / astream_events)."""
    if os.environ.get("USE_MEMORY_CHECKPOINTER") == "1":
        return MemorySaver()
    if _async_checkpointer is None:
        raise RuntimeError(
            "Async SQLite checkpointer not initialized. "
            "Run the app with FastAPI lifespan (see main.py), or set USE_MEMORY_CHECKPOINTER=1 for tests."
        )
    return _async_checkpointer


def build_agent():
    """Build a deep agent with harness capabilities for English learning image Q&A.

    Capabilities used:
    - Planning: write_todos for tracking Q&A progress
    - Virtual filesystem: write_file/read_file for questions and Q&A log
    - Subagent: evaluator for context-isolated feedback generation
    - Skills: image-question-generation (main), english-evaluation (evaluator)
    - Summarization: automatic context compression for long sessions
    - Human-in-the-loop: ask_user tool with interrupt() for Q&A
    """
    checkpointer = _select_checkpointer()
    agent = create_deep_agent(
        model="openai:gpt-4o",
        tools=[ask_user],
        system_prompt=SYSTEM_PROMPT,
        subagents=[evaluator_subagent],
        skills=[MAIN_SKILLS_PATH],
        checkpointer=checkpointer,
    )
    return agent


def get_agent():
    """Lazy singleton — defers creation until first use so env vars are set."""
    global _agent
    if _agent is None:
        _agent = build_agent()
    return _agent
