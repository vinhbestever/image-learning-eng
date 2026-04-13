from langchain_core.tools import tool
from langgraph.types import interrupt


@tool
def ask_user(question: str) -> str:
    """Present a question to the student and wait for their answer.
    Use this to ask each English practice question one at a time.
    The student will type their answer and it will be returned to you."""
    answer = interrupt({"question": question})
    return answer
