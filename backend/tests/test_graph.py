import os

os.environ.setdefault("OPENAI_API_KEY", "sk-test-fake-key-for-testing")

from agent.graph import build_agent
from agent.tools import ask_user


def test_agent_compiles():
    g = build_agent()
    assert g is not None


def test_build_agent_returns_compiled_graph():
    g = build_agent()
    assert hasattr(g, "invoke")
    assert hasattr(g, "get_state")


def test_ask_user_tool_schema():
    """Verify ask_user tool has the right parameter schema."""
    schema = ask_user.args_schema.model_json_schema()
    assert "question" in schema["properties"]
    assert schema["properties"]["question"]["type"] == "string"
