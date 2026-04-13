import pytest

from agent.state import SessionInfo
from api.models import SessionResponse


def test_session_info_has_phase_not_total():
    info = SessionInfo(thread_id="abc")
    assert info.phase == "vocabulary"
    assert not hasattr(info, "total")


def test_session_info_custom_phase():
    info = SessionInfo(thread_id="abc", phase="grammar")
    assert info.phase == "grammar"


def test_session_response_total_optional_null():
    r = SessionResponse(session_id="x", step=1, done=False)
    assert r.total is None


def test_session_response_total_can_be_int_for_back_compat():
    r = SessionResponse(session_id="x", step=1, total=5, done=False)
    assert r.total == 5


@pytest.fixture()
def fresh_session_store(monkeypatch, tmp_path):
    monkeypatch.setenv("APP_SQLITE_PATH", str(tmp_path / "api.sqlite"))
    from api import session_store

    session_store.reset_connection()
    yield session_store
    session_store.reset_connection()


def test_session_store_round_trip_without_total(fresh_session_store):
    store = fresh_session_store
    info = SessionInfo(thread_id="t1", step=3, phase="grammar", questions_asked=["Q1"])
    store.save_session("sess1", info)
    loaded = store.load_session("sess1")
    assert loaded is not None
    assert loaded.thread_id == "t1"
    assert loaded.step == 3
    assert loaded.phase == "grammar"
    assert loaded.questions_asked == ["Q1"]
    assert not hasattr(loaded, "total")
