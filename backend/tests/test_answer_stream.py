"""SSE streaming endpoint for /sessions/{id}/answer/stream."""

import io
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from langgraph.types import Interrupt

from tests.test_sessions_api import make_fake_image, _mock_invoke_interrupt


class FakeStreamAgent:
    def __init__(self, done: bool = False):
        self._done = done

    async def astream_events(self, *args, **kwargs):
        yield {
            "event": "on_chat_model_stream",
            "data": {"chunk": SimpleNamespace(content="partial")},
        }

    async def aget_state(self, config):
        if self._done:
            return SimpleNamespace(
                interrupts=(),
                values={
                    "messages": [
                        SimpleNamespace(type="ai", content="Final feedback text.", tool_calls=[]),
                    ],
                },
            )
        return SimpleNamespace(
            interrupts=(Interrupt(value={"question": "Second question?"}, id="1"),),
            values={"messages": []},
        )


def test_answer_stream_emits_question_event(client):
    with patch("api.sessions.get_agent") as mock_get:
        mock_get.return_value.ainvoke = AsyncMock(
            return_value=_mock_invoke_interrupt("First?"),
        )
        create = client.post(
            "/sessions",
            files={"image": ("t.jpg", io.BytesIO(make_fake_image()), "image/jpeg")},
        )
    assert create.status_code == 200
    session_id = create.json()["session_id"]

    with patch("api.sessions.get_agent", return_value=FakeStreamAgent(done=False)):
        with client.stream(
            "POST",
            f"/sessions/{session_id}/answer/stream",
            json={"answer": "my answer"},
        ) as resp:
            assert resp.status_code == 200
            body = resp.read().decode()

    assert '"type": "delta"' in body
    assert '"type": "question"' in body
    assert "Second question?" in body


def test_answer_stream_emits_done_event(client):
    with patch("api.sessions.get_agent") as mock_get:
        mock_get.return_value.ainvoke = AsyncMock(
            return_value=_mock_invoke_interrupt("Only one?"),
        )
        create = client.post(
            "/sessions",
            files={"image": ("t.jpg", io.BytesIO(make_fake_image()), "image/jpeg")},
        )
    session_id = create.json()["session_id"]

    with patch("api.sessions.get_agent", return_value=FakeStreamAgent(done=True)):
        with client.stream(
            "POST",
            f"/sessions/{session_id}/answer/stream",
            json={"answer": "done"},
        ) as resp:
            body = resp.read().decode()

    assert '"type": "done"' in body
    assert "Final feedback text." in body
