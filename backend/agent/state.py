from typing import Annotated
from typing_extensions import TypedDict
import operator


class SessionState(TypedDict):
    image_b64: str
    questions: list[str]
    answers: Annotated[list[str], operator.add]
    current_step: int
    evaluation: str
