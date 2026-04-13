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


# --- ask_user format recovery (model replied as plain text instead of calling ask_user) ---

MAX_ASK_USER_FORMAT_RETRIES = 2

ASK_USER_RETRY_PROMPT = """[Format fix — required now]
The app did not receive your next student prompt because the `ask_user` tool was not invoked (or the turn finished without a valid interrupt).

You are still in the middle of the lesson unless you had already fully decided to end and call the evaluator before this message.

Immediately call the `ask_user` tool exactly once. Its `question` argument must be ONE string containing:
(1) optional brief feedback (English + Vietnamese if you correct an error),
(2) exactly ONE next English question for the student.

Do not put the next question only in normal assistant text — the student will not see it and the session will break."""

FIRST_QUESTION_RETRY_PROMPT = """[Format fix — required now]
The app did not receive the first practice question because `ask_user` was not called.

Call `ask_user` now with one string: a short warm welcome if you like, then exactly ONE English vocabulary question about the image."""


def _looks_like_final_evaluation(text: str) -> bool:
    """Heuristic: evaluator subagent output (Vietnamese rubric + stars)."""
    if not text or not text.strip():
        return False
    head = text.strip()[:600]
    if "⭐" in head:
        return True
    if "Từ vựng" in text and "Ngữ pháp" in text:
        return True
    if "Đặt câu" in text and ("sao" in text or "⭐" in text):
        return True
    return False


def _looks_like_mid_session_leak(text: str) -> bool:
    """Content that belongs in qa_log / tutor bubble, not final evaluation."""
    if not text:
        return False
    if "**Turn" in text or "| Phase:" in text:
        return True
    low = text.lower()
    if "phase: vocabulary" in low or "phase: grammar" in low or "phase: sentence" in low:
        return True
    return False


_VI_MARKS = frozenset(
    "ăâđêôơưỳýỷỹỵàáảãạấầẩẫậắằẳẵặèéẻẽẹếềểễệìíỉĩịòóỏõọốồổỗộớờởỡợùúủũụứửữự"
)


def _has_substantial_vietnamese(text: str) -> bool:
    """Enough Vietnamese letters to treat blob as VN evaluation, not English tutor chat."""
    return sum(1 for c in text.lower() if c in _VI_MARKS) >= 2


def _looks_like_english_tutor_followup(text: str) -> bool:
    """English mid-turn feedback (typo, corrected sentence, 'Would you like…?') without ask_user.

    These are short and were previously misclassified as session end because they are <200 chars.
    """
    if not text or not text.strip():
        return False
    if _looks_like_final_evaluation(text) or _has_substantial_vietnamese(text):
        return False
    if "?" not in text:
        return False
    low = text.lower()
    strong_cues = (
        "would you like" in low,
        "would you want" in low,
        "do you want to try" in low,
        "try another sentence" in low,
        "try another question" in low,
        "try a different sentence" in low,
        "here's the corrected" in low,
        "here is the corrected" in low,
        "corrected sentence" in low,
        "your corrected sentence" in low,
    )
    if any(strong_cues):
        return True
    # Typo / model answer + implicit invite (common pattern when model skips ask_user)
    if ("typo" in low or "spelling" in low or "should be" in low) and (
        "sentence" in low or "running" in low or "corrected" in low or '"' in text
    ):
        return True
    return False


def _should_retry_missing_ask_user(assistant_blob: str) -> bool:
    """True if we likely need a corrective turn (missing ask_user)."""
    if _looks_like_final_evaluation(assistant_blob):
        return False
    if not assistant_blob.strip():
        return True
    if _looks_like_mid_session_leak(assistant_blob):
        return True
    if _looks_like_english_tutor_followup(assistant_blob):
        return True
    if len(assistant_blob.strip()) > 200:
        return True
    return False


async def _retry_until_ask_user_or_give_up(agent, config: dict, retry_prompt: str) -> tuple[str | None, str]:
    """Run up to MAX_ASK_USER_FORMAT_RETRIES corrective invokes; return (question, final_blob)."""
    last_blob = ""
    for _ in range(MAX_ASK_USER_FORMAT_RETRIES):
        await agent.ainvoke(
            {"messages": [{"role": "user", "content": retry_prompt}]},
            config=config,
            version="v2",
        )
        snap = await agent.aget_state(config)
        q = _question_from_interrupts(snap.interrupts)
        if q:
            return q, ""
        msgs = _messages_from_snapshot_values(snap.values)
        last_blob = _extract_final_message_from_messages(msgs)
        if not _should_retry_missing_ask_user(last_blob):
            break
    return None, last_blob


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
                                    "text": "Please look at this image and begin our adaptive English lesson (vocabulary, grammar, and sentence practice) as described in your instructions.",
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

    agent = get_agent()
    result = await agent.ainvoke(
        {
            "messages": [
                {"role": "user", "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/{image.content_type.split('/')[-1]};base64,{image_b64}"},
                    },
                    {"type": "text", "text": "Please look at this image and begin our adaptive English lesson (vocabulary, grammar, and sentence practice) as described in your instructions."},
                ]},
            ],
            "files": skill_files,
        },
        config=config,
        version="v2",
    )

    question = _extract_interrupt_question(result)
    if not question:
        question, _ = await _retry_until_ask_user_or_give_up(agent, config, FIRST_QUESTION_RETRY_PROMPT)
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

    agent = get_agent()
    result = await agent.ainvoke(
        Command(resume=body.answer),
        config=config,
        version="v2",
    )

    question = _extract_interrupt_question(result)
    eval_blob = _extract_final_message(result)
    if not question and _should_retry_missing_ask_user(eval_blob):
        question, eval_blob = await _retry_until_ask_user_or_give_up(agent, config, ASK_USER_RETRY_PROMPT)

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
        final_step = info.step
        session_store.delete_session(session_id)
        return SessionResponse(
            session_id=session_id,
            step=final_step,
            evaluation=eval_blob,
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
            msgs = _messages_from_snapshot_values(snap.values)
            eval_blob = _extract_final_message_from_messages(msgs)

            if q is None and _should_retry_missing_ask_user(eval_blob):
                q, eval_blob = await _retry_until_ask_user_or_give_up(agent, config, ASK_USER_RETRY_PROMPT)

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
                final_step = info.step
                session_store.delete_session(session_id)
                yield _sse_payload(
                    {
                        "type": "done",
                        "step": final_step,
                        "total": None,
                        "evaluation": eval_blob,
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
