from agent.state import SessionInfo
from agent.tools import ask_user


def test_session_info_defaults():
    info = SessionInfo(thread_id="abc")
    assert info.thread_id == "abc"
    assert info.step == 0
    assert info.phase == "vocabulary"
    assert info.questions_asked == []


def test_session_info_tracks_progress():
    info = SessionInfo(thread_id="abc", step=3)
    info.questions_asked.append("What do you see?")
    assert info.step == 3
    assert len(info.questions_asked) == 1


def test_ask_user_tool_is_registered():
    assert ask_user.name == "ask_user"
    assert "question" in ask_user.description.lower() or "question" in ask_user.args_schema.model_json_schema()["properties"]
    assert "only channel" in ask_user.description.lower()
