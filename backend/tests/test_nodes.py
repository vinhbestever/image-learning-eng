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
