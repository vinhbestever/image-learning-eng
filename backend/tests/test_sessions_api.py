import io
import base64
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def make_fake_image() -> bytes:
    return base64.b64decode(
        "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8U"
        "HRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAARC"
        "AABAAEDASIA2gABAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAU"
        "AQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k="
    )


def _mock_invoke_interrupt(question):
    """Create a mock result that simulates an ask_user interrupt."""
    interrupt = SimpleNamespace(value={"question": question})
    return SimpleNamespace(interrupts=[interrupt], value={"messages": []})


def _mock_invoke_done(evaluation):
    """Create a mock result that simulates completion with evaluation."""
    msg = SimpleNamespace(content=evaluation, tool_calls=[])
    return SimpleNamespace(interrupts=[], value={"messages": [msg]})


def _patch_ainvoke(mock_agent, *, return_value=None, side_effect=None):
    mock_agent.ainvoke = AsyncMock(return_value=return_value, side_effect=side_effect)


def test_create_session(client):
    with patch("api.sessions.get_agent") as mock_get_agent:
        mock_agent = mock_get_agent.return_value
        _patch_ainvoke(mock_agent, return_value=_mock_invoke_interrupt("What do you see?"))

        image_bytes = make_fake_image()
        response = client.post(
            "/sessions",
            files={"image": ("test.jpg", io.BytesIO(image_bytes), "image/jpeg")},
        )

    assert response.status_code == 200
    data = response.json()
    assert "session_id" in data
    assert data["step"] == 1
    assert data["total"] == 5
    assert data["done"] is False
    assert data["question"] == "What do you see?"


def test_submit_answer_mid_session(client):
    with patch("api.sessions.get_agent") as mock_get_agent:
        mock_agent = mock_get_agent.return_value
        _patch_ainvoke(
            mock_agent,
            side_effect=[
                _mock_invoke_interrupt("What do you see?"),
                _mock_invoke_interrupt("Describe the colors."),
            ],
        )

        image_bytes = make_fake_image()
        create_resp = client.post(
            "/sessions",
            files={"image": ("test.jpg", io.BytesIO(image_bytes), "image/jpeg")},
        )
        session_id = create_resp.json()["session_id"]

        answer_resp = client.post(
            f"/sessions/{session_id}/answer",
            json={"answer": "I see a white background."},
        )

    assert answer_resp.status_code == 200
    data = answer_resp.json()
    assert data["step"] == 2
    assert data["done"] is False
    assert data["question"] == "Describe the colors."


def test_submit_all_answers_returns_evaluation(client):
    with patch("api.sessions.get_agent") as mock_get_agent:
        mock_agent = mock_get_agent.return_value
        _patch_ainvoke(
            mock_agent,
            side_effect=[
                _mock_invoke_interrupt("Q1?"),
                _mock_invoke_interrupt("Q2?"),
                _mock_invoke_interrupt("Q3?"),
                _mock_invoke_interrupt("Q4?"),
                _mock_invoke_interrupt("Q5?"),
                _mock_invoke_done("Well done! Your answers were descriptive."),
            ],
        )

        image_bytes = make_fake_image()
        create_resp = client.post(
            "/sessions",
            files={"image": ("test.jpg", io.BytesIO(image_bytes), "image/jpeg")},
        )
        session_id = create_resp.json()["session_id"]

        last_resp = None
        for i in range(5):
            last_resp = client.post(
                f"/sessions/{session_id}/answer",
                json={"answer": f"Answer {i + 1}"},
            )

    assert last_resp.status_code == 200
    data = last_resp.json()
    assert data["done"] is True
    assert data["evaluation"] == "Well done! Your answers were descriptive."
    assert data["question"] is None
    assert data["step"] == 5
    assert data["total"] == 5


def test_session_not_found(client):
    response = client.post(
        "/sessions/nonexistent-id/answer",
        json={"answer": "test"},
    )
    assert response.status_code == 404


def test_create_session_rejects_unsupported_mime(client):
    with patch("api.sessions.get_agent"):
        response = client.post(
            "/sessions",
            files={"image": ("x.gif", io.BytesIO(b"x"), "image/gif")},
        )
    assert response.status_code == 400


def test_create_session_rejects_oversized_image(client):
    with patch("api.sessions.get_agent"):
        big = b"x" * (5 * 1024 * 1024 + 1)
        response = client.post(
            "/sessions",
            files={"image": ("big.jpg", io.BytesIO(big), "image/jpeg")},
        )
    assert response.status_code == 400


def test_create_session_fails_when_agent_returns_no_interrupt(client):
    with patch("api.sessions.get_agent") as mock_get_agent:
        _patch_ainvoke(
            mock_get_agent.return_value,
            return_value=SimpleNamespace(interrupts=[], value={"messages": []}),
        )
        response = client.post(
            "/sessions",
            files={
                "image": ("t.jpg", io.BytesIO(make_fake_image()), "image/jpeg"),
            },
        )
    assert response.status_code == 500


def test_done_response_reports_current_step_not_hardcoded_five(client):
    """If the flow ends early, step reflects SessionInfo (not literal 5)."""
    with patch("api.sessions.get_agent") as mock_get_agent:
        mock_agent = mock_get_agent.return_value
        _patch_ainvoke(
            mock_agent,
            side_effect=[
                _mock_invoke_interrupt("Only one question?"),
                _mock_invoke_done("Short session."),
            ],
        )
        create_resp = client.post(
            "/sessions",
            files={"image": ("t.jpg", io.BytesIO(make_fake_image()), "image/jpeg")},
        )
        session_id = create_resp.json()["session_id"]
        last = client.post(
            f"/sessions/{session_id}/answer",
            json={"answer": "My answer."},
        )
    assert last.status_code == 200
    body = last.json()
    assert body["done"] is True
    assert body["step"] == 1
    assert body["evaluation"] == "Short session."


def test_extract_final_message_skips_tool_calls_and_parses_blocks():
    from api.sessions import _extract_final_message

    with_tools = SimpleNamespace(
        type="ai",
        content="tool era",
        tool_calls=[{"name": "x"}],
    )
    final = SimpleNamespace(
        type="ai",
        content=[{"type": "text", "text": "  Great work!  "}],
        tool_calls=[],
    )
    result = SimpleNamespace(
        interrupts=[],
        value={"messages": [with_tools, final]},
    )
    assert _extract_final_message(result) == "Great work!"
