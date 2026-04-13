from pydantic import BaseModel
from typing import Optional


class AnswerRequest(BaseModel):
    answer: str


class SessionResponse(BaseModel):
    session_id: str
    step: int
    total: int = 5
    question: Optional[str] = None
    evaluation: Optional[str] = None
    done: bool
