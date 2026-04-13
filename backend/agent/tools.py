from langchain_core.tools import tool
from langgraph.types import interrupt


@tool
def ask_user(question: str) -> str:
    """Present text to the student and wait for their reply.

    This is the ONLY channel the app uses to continue a lesson. If you do not call
    this tool, the session ends.

    Put everything the student should read in `question`: optional brief feedback
    (English praise/correction + Vietnamese explanation if needed), then the single
    next English question they must answer. Do not rely on a separate assistant
    message for the next question — it will not reach the student and will break the flow.

    One `ask_user` call = one student turn. Never put two separate practice questions
    in one call."""
    answer = interrupt({"question": question})
    return answer
