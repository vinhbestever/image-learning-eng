import os
import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch

os.environ.setdefault("OPENAI_API_KEY", "sk-test-fake-key-for-testing")


@pytest.fixture(autouse=True)
def _isolate_app_sqlite(tmp_path, monkeypatch):
    """In-memory LangGraph checkpointer in tests (async-safe); API session DB still isolated per tmp file."""
    monkeypatch.setenv("APP_SQLITE_PATH", str(tmp_path / "app.sqlite"))
    monkeypatch.setenv("USE_MEMORY_CHECKPOINTER", "1")
    yield
    from api import session_store
    from agent import graph

    session_store.reset_connection()
    graph.reset_agent()


@pytest.fixture
def client():
    from main import app
    return TestClient(app)
