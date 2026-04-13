import base64
import json
from uuid import uuid4

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from langgraph.types import Command

from .models import AnswerRequest, SessionResponse
from . import session_store
from agent.graph import get_agent
from agent.state import SessionInfo
from agent.skills import load_all_skill_files

router = APIRouter(prefix="/sessions", tags=["sessions"])


def _sse_payload(obj: dict) -> str:
    return f"data: {json.dumps(obj, ensure_ascii=False)}\n\n"


def _question_from_interrupts(interrupts) -> str | None:
    if not interrupts:
        return None
    interrupt_value = interrupts[0].value
    if isinstance(interrupt_value, dict) and "question" in interrupt_value:
        return interrupt_value["question"]
    return str(interrupt_value)


def _extract_interrupt_question(result) -> str | None:
    """Extract the question from an interrupt triggered by the ask_user tool."""
    return _question_from_interrupts(result.interrupts)


def _message_text_content(msg) -> str:
    """Normalize LangChain message content to plain text."""
    c = getattr(msg, "content", None)
    if isinstance(c, str):
        return c.strip()
    if isinstance(c, list):
        parts: list[str] = []
        for block in c:
            if isinstance(block, dict):
                if block.get("type") == "text" and isinstance(block.get("text"), str):
                    parts.append(block["text"])
                elif isinstance(block.get("text"), str):
                    parts.append(block["text"])
            elif isinstance(block, str):
                parts.append(block)
        return "\n".join(parts).strip()
    return ""


def _extract_final_message_from_messages(messages: list) -> str:
    """Extract the last plain assistant text (evaluation) from message list."""
    for msg in reversed(messages):
        if getattr(msg, "type", None) == "tool":
            continue
        tool_calls = getattr(msg, "tool_calls", None) or []
        if tool_calls:
            continue
        text = _message_text_content(msg)
        if text:
            return text
    return ""


def _extract_final_message(result) -> str:
    """Extract the agent's final text response (the evaluation feedback)."""
    messages = result.value.get("messages", [])
    return _extract_final_message_from_messages(messages)


def _messages_from_snapshot_values(values) -> list:
    if isinstance(values, dict):
        return values.get("messages", []) or []
    return []


def _iter_text_deltas_from_chunk(chunk) -> list[str]:
    """Split an AIMessageChunk into streamable text pieces."""
    out: list[str] = []
    c = getattr(chunk, "content", None)
    if isinstance(c, str) and c:
        out.append(c)
    elif isinstance(c, list):
        for part in c:
            if isinstance(part, dict) and part.get("type") == "text":
                t = part.get("text") or ""
                if t:
                    out.append(t)
    return out


# Tools whose start events we skip entirely (too low-level / noisy for users)
_SILENT_TOOLS = {"ask_user", "ls", "glob", "grep", "read_file", "execute"}


def _reasoning_delta_from_tool_start(ev: dict) -> str | None:
    """Return a human-readable delta to stream for an on_tool_start event, or None to skip.

    Deepagents tools: write_todos, ls, read_file, write_file, edit_file, glob, grep, execute
    + our custom ask_user tool.
    """
    name = ev.get("name", "")
    if name in _SILENT_TOOLS:
        return None

    inp = ev.get("data", {}).get("input") or {}

    if name == "write_file":
        content = inp.get("content") or ""
        path = inp.get("path") or ""
        # Emit the actual content the agent writes — that's its materialised reasoning
        if "/session/" in path and content:
            return content.rstrip() + "\n"
        return None

    if name == "edit_file":
        # Show what the agent is replacing so the student can see progress
        new_string = inp.get("new_string") or inp.get("content") or ""
        if new_string:
            return new_string.rstrip() + "\n"
        return None

    if name == "write_todos":
        todos = inp.get("todos") or []
        if isinstance(todos, list) and todos:
            lines = "\n".join(f"• {t}" for t in todos[:12])
            return f"Planning:\n{lines}\n"
        return "Planning…\n"

    # Subagent / evaluator call — name may be the subagent name
    if "evaluat" in name.lower() or "call_agent" in name.lower() or "subagent" in name.lower():
        return "Requesting evaluation…\n"

    # Generic fallback for unexpected tools
    return None


@router.post("/stream")
async def create_session_stream(image: UploadFile = File(...)):
    """Stream image analysis + first question (SSE).

    Events emitted:
      {"type":"started","session_id":"..."}                              — immediately
      {"type":"delta","text":"..."}                                      — reasoning tokens
      {"type":"question","session_id":"...","step":1,"total":null,"text":"..."}
      {"type":"error","message":"..."}
    """
    if image.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(status_code=400, detail="Unsupported image format. Use JPEG, PNG, or WebP.")

    image_bytes = await image.read()
    if len(image_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large. Maximum 5MB.")

    session_id = str(uuid4())
    config = {"configurable": {"thread_id": session_id}, "recursion_limit": 1000}
    image_b64 = base64.b64encode(image_bytes).decode()
    image_type = image.content_type.split("/")[-1]
    skill_files = load_all_skill_files()

    async def event_gen():
        try:
            yield _sse_payload({"type": "started", "session_id": session_id})

            agent = get_agent()
            async for ev in agent.astream_events(
                {
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "image_url",
                                    "image_url": {"url": f"data:image/{image_type};base64,{image_b64}"},
                                },
                                {
                                    "type": "text",
                                    "text": "Please look at this image and start asking me English practice questions about it.",
                                },
                            ],
                        }
                    ],
                    "files": skill_files,
                },
                config=config,
                version="v2",
                subgraphs=True,
            ):
                event_type = ev.get("event")
                if event_type == "on_chat_model_stream":
                    chunk = ev.get("data", {}).get("chunk")
                    if chunk is not None:
                        for piece in _iter_text_deltas_from_chunk(chunk):
                            yield _sse_payload({"type": "delta", "text": piece})
                elif event_type == "on_tool_start":
                    hint = _reasoning_delta_from_tool_start(ev)
                    if hint:
                        yield _sse_payload({"type": "delta", "text": hint})

            snap = await agent.aget_state(config)
            q = _question_from_interrupts(snap.interrupts)
            if not q:
                yield _sse_payload({"type": "error", "message": "Agent did not generate a question."})
                return

            info = SessionInfo(thread_id=session_id, step=1)
            info.questions_asked.append(q)
            session_store.save_session(session_id, info)

            yield _sse_payload(
                {
                    "type": "question",
                    "session_id": session_id,
                    "step": 1,
                    "total": None,
                    "text": q,
                }
            )
        except Exception as e:
            yield _sse_payload({"type": "error", "message": str(e)})

    headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
    }
    return StreamingResponse(event_gen(), media_type="text/event-stream", headers=headers)


@router.post("", response_model=SessionResponse)
async def create_session(image: UploadFile = File(...)):
    if image.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(status_code=400, detail="Unsupported image format. Use JPEG, PNG, or WebP.")

    image_bytes = await image.read()
    if len(image_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large. Maximum 5MB.")

    session_id = str(uuid4())
    config = {"configurable": {"thread_id": session_id}, "recursion_limit": 1000}

    image_b64 = base64.b64encode(image_bytes).decode()

    skill_files = load_all_skill_files()

    result = await get_agent().ainvoke(
        {
            "messages": [
                {"role": "user", "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/{image.content_type.split('/')[-1]};base64,{image_b64}"},
                    },
                    {"type": "text", "text": "Please look at this image and start asking me English practice questions about it."},
                ]},
            ],
            "files": skill_files,
        },
        config=config,
        version="v2",
    )

    question = _extract_interrupt_question(result)
    if not question:
        raise HTTPException(status_code=500, detail="Agent did not generate a question.")

    info = SessionInfo(thread_id=session_id, step=1)
    info.questions_asked.append(question)
    session_store.save_session(session_id, info)

    return SessionResponse(
        session_id=session_id,
        step=1,
        question=question,
        done=False,
    )


@router.post("/{session_id}/answer", response_model=SessionResponse)
async def submit_answer(session_id: str, body: AnswerRequest):
    info = session_store.load_session(session_id)
    if info is None:
        raise HTTPException(status_code=404, detail="Session not found.")
    config = {"configurable": {"thread_id": info.thread_id}, "recursion_limit": 1000}

    result = await get_agent().ainvoke(
        Command(resume=body.answer),
        config=config,
        version="v2",
    )

    question = _extract_interrupt_question(result)

    if question:
        info.step += 1
        info.questions_asked.append(question)
        session_store.save_session(session_id, info)
        return SessionResponse(
            session_id=session_id,
            step=info.step,
            question=question,
            done=False,
        )
    else:
        evaluation = _extract_final_message(result)
        final_step = info.step
        session_store.delete_session(session_id)
        return SessionResponse(
            session_id=session_id,
            step=final_step,
            evaluation=evaluation,
            done=True,
        )


@router.post("/{session_id}/answer/stream")
async def submit_answer_stream(session_id: str, body: AnswerRequest):
    """Stream LLM tokens (SSE) then emit `question` or `done` (same semantics as POST /answer)."""
    info = session_store.load_session(session_id)
    if info is None:
        raise HTTPException(status_code=404, detail="Session not found.")

    config = {"configurable": {"thread_id": info.thread_id}, "recursion_limit": 1000}

    async def event_gen():
        try:
            agent = get_agent()
            async for ev in agent.astream_events(
                Command(resume=body.answer),
                config=config,
                version="v2",
                subgraphs=True,
            ):
                event_type = ev.get("event")

                # Stream text tokens when the model generates visible content
                if event_type == "on_chat_model_stream":
                    chunk = ev.get("data", {}).get("chunk")
                    if chunk is not None:
                        for piece in _iter_text_deltas_from_chunk(chunk):
                            yield _sse_payload({"type": "delta", "text": piece})

                # Stream readable summaries of tool calls as reasoning deltas.
                # GPT-4o (and other tool-calling models) express all reasoning through
                # tool calls — there is no plain text content to stream from
                # on_chat_model_stream. Emitting tool activity fills the ThinkingBubble.
                elif event_type == "on_tool_start":
                    hint = _reasoning_delta_from_tool_start(ev)
                    if hint:
                        yield _sse_payload({"type": "delta", "text": hint})

            snap = await agent.aget_state(config)
            q = _question_from_interrupts(snap.interrupts)
            if q is not None:
                info.step += 1
                info.questions_asked.append(q)
                session_store.save_session(session_id, info)
                yield _sse_payload(
                    {
                        "type": "question",
                        "step": info.step,
                        "total": None,
                        "text": q,
                    }
                )
            else:
                msgs = _messages_from_snapshot_values(snap.values)
                evaluation = _extract_final_message_from_messages(msgs)
                final_step = info.step
                session_store.delete_session(session_id)
                yield _sse_payload(
                    {
                        "type": "done",
                        "step": final_step,
                        "total": None,
                        "evaluation": evaluation,
                    }
                )
        except Exception as e:
            yield _sse_payload({"type": "error", "message": str(e)})

    headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
    }
    return StreamingResponse(event_gen(), media_type="text/event-stream", headers=headers)
