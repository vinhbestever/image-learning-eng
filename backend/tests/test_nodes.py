from unittest.mock import MagicMock, patch
from langchain_core.messages import AIMessage
from agent.state import SessionState


def test_session_state_keys():
    state: SessionState = {
        "image_b64": "abc",
        "questions": [],
        "answers": [],
        "current_step": 0,
        "evaluation": "",
    }
    assert state["image_b64"] == "abc"
    assert state["questions"] == []
    assert state["current_step"] == 0


def make_state(**kwargs) -> SessionState:
    base: SessionState = {
        "image_b64": "ZmFrZQ==",
        "questions": [],
        "answers": [],
        "current_step": 0,
        "evaluation": "",
    }
    base.update(kwargs)
    return base


def test_analyze_image_returns_five_questions():
    mock_response = AIMessage(
        content="1. What do you see?\n2. Describe the colors.\n3. What is the mood?\n4. What word describes this?\n5. Why is this happening?"
    )
    with patch("agent.nodes.llm") as mock_llm:
        mock_llm.invoke.return_value = mock_response
        from agent.nodes import analyze_image
        result = analyze_image(make_state())

    assert len(result["questions"]) == 5
    assert result["current_step"] == 0
    assert result["answers"] == []


def test_analyze_image_pads_to_five_if_short():
    mock_response = AIMessage(content="1. Only one question")
    with patch("agent.nodes.llm") as mock_llm:
        mock_llm.invoke.return_value = mock_response
        from agent.nodes import analyze_image
        result = analyze_image(make_state())

    assert len(result["questions"]) == 5


def test_evaluate_returns_feedback_string():
    mock_response = AIMessage(content="Great effort! Your grammar was mostly correct...")
    with patch("agent.nodes.llm") as mock_llm:
        mock_llm.invoke.return_value = mock_response
        from agent.nodes import evaluate
        state = make_state(
            questions=["Q1", "Q2", "Q3", "Q4", "Q5"],
            answers=["A1", "A2", "A3", "A4", "A5"],
            current_step=5,
        )
        result = evaluate(state)

    assert "evaluation" in result
    assert "Great effort" in result["evaluation"]
