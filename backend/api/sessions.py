import base64
from uuid import uuid4
from fastapi import APIRouter, UploadFile, File, HTTPException
from langgraph.types import Command
from .models import AnswerRequest, SessionResponse
from agent.graph import get_agent
from agent.state import SessionInfo

router = APIRouter(prefix="/sessions", tags=["sessions"])

_sessions: dict[str, SessionInfo] = {}


def _extract_interrupt_question(result) -> str | None:
    """Extract the question from an interrupt triggered by the ask_user tool."""
    if not result.interrupts:
        return None
    interrupt_value = result.interrupts[0].value
    if isinstance(interrupt_value, dict) and "question" in interrupt_value:
        return interrupt_value["question"]
    return str(interrupt_value)


def _extract_final_message(result) -> str:
    """Extract the agent's final text response (the evaluation feedback)."""
    messages = result.value.get("messages", [])
    for msg in reversed(messages):
        if hasattr(msg, "content") and isinstance(msg.content, str) and msg.content.strip():
            if not hasattr(msg, "tool_calls") or not msg.tool_calls:
                return msg.content
    return ""


@router.post("", response_model=SessionResponse)
async def create_session(image: UploadFile = File(...)):
    if image.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(status_code=400, detail="Unsupported image format. Use JPEG, PNG, or WebP.")

    image_bytes = await image.read()
    if len(image_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large. Maximum 5MB.")

    session_id = str(uuid4())
    config = {"configurable": {"thread_id": session_id}}

    image_b64 = base64.b64encode(image_bytes).decode()

    result = get_agent().invoke(
        {"messages": [
            {"role": "user", "content": [
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/{image.content_type.split('/')[-1]};base64,{image_b64}"},
                },
                {"type": "text", "text": "Please look at this image and start asking me English practice questions about it."},
            ]},
        ]},
        config=config,
        version="v2",
    )

    question = _extract_interrupt_question(result)
    if not question:
        raise HTTPException(status_code=500, detail="Agent did not generate a question.")

    info = SessionInfo(thread_id=session_id, step=1)
    info.questions_asked.append(question)
    _sessions[session_id] = info

    return SessionResponse(
        session_id=session_id,
        step=1,
        total=5,
        question=question,
        done=False,
    )


@router.post("/{session_id}/answer", response_model=SessionResponse)
async def submit_answer(session_id: str, body: AnswerRequest):
    if session_id not in _sessions:
        raise HTTPException(status_code=404, detail="Session not found.")

    info = _sessions[session_id]
    config = {"configurable": {"thread_id": info.thread_id}}

    result = get_agent().invoke(
        Command(resume=body.answer),
        config=config,
        version="v2",
    )

    question = _extract_interrupt_question(result)

    if question:
        info.step += 1
        info.questions_asked.append(question)
        return SessionResponse(
            session_id=session_id,
            step=info.step,
            total=5,
            question=question,
            done=False,
        )
    else:
        evaluation = _extract_final_message(result)
        del _sessions[session_id]
        return SessionResponse(
            session_id=session_id,
            step=5,
            total=5,
            evaluation=evaluation,
            done=True,
        )
