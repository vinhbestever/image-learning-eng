import io
import base64
from unittest.mock import patch, MagicMock
from types import SimpleNamespace


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


def test_create_session(client):
    with patch("api.sessions.get_agent") as mock_get_agent:
        mock_agent = mock_get_agent.return_value
        mock_agent.invoke.return_value = _mock_invoke_interrupt("What do you see?")

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
        mock_agent.invoke.side_effect = [
            _mock_invoke_interrupt("What do you see?"),
            _mock_invoke_interrupt("Describe the colors."),
        ]

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
        mock_agent.invoke.side_effect = [
            _mock_invoke_interrupt("Q1?"),
            _mock_invoke_interrupt("Q2?"),
            _mock_invoke_interrupt("Q3?"),
            _mock_invoke_interrupt("Q4?"),
            _mock_invoke_interrupt("Q5?"),
            _mock_invoke_done("Well done! Your answers were descriptive."),
        ]

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


def test_session_not_found(client):
    response = client.post(
        "/sessions/nonexistent-id/answer",
        json={"answer": "test"},
    )
    assert response.status_code == 404
