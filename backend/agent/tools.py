from typing import Optional

from langchain_core.tools import tool
from langgraph.types import interrupt


@tool
def ask_user(question: str, choices: Optional[list[str]] = None) -> str:
    """Present text (and optionally selectable choices) to the student and wait for their reply.

    This is the ONLY channel the app uses to continue a lesson. If you do not call
    this tool, the session ends.

    Put everything the student should read in `question`: optional brief feedback
    (English praise/correction + Vietnamese explanation if needed), then the single
    next English question they must answer. Do not rely on a separate assistant
    message for the next question — it will not reach the student and will break the flow.

    Pass `choices` as a list of strings (e.g. ["A. cat", "B. dog", "C. fish"])
    for multiple-choice questions. Omit `choices` for open-ended free-text questions.

    One `ask_user` call = one student turn. Never put two separate practice questions
    in one call."""
    answer = interrupt({"question": question, "choices": choices or []})
    return answer
