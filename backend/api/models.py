from typing import Optional

from pydantic import BaseModel


class AnswerRequest(BaseModel):
    answer: str


class SessionResponse(BaseModel):
    session_id: str
    step: int
    total: Optional[int] = None
    question: Optional[str] = None
    evaluation: Optional[str] = None
    done: bool
