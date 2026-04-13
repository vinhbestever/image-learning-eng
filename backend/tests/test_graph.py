import os
import pytest
from unittest.mock import patch, MagicMock
from langchain_core.messages import AIMessage, AIMessageChunk, HumanMessage, ToolCall
from langgraph.types import Command

os.environ.setdefault("OPENAI_API_KEY", "sk-test-fake-key-for-testing")


def _make_fake_model():
    """Create a mock chat model that simulates GPT-4o asking questions via ask_user."""
    model = MagicMock()
    model.bind_tools = MagicMock(return_value=model)
    return model


def test_agent_compiles():
    from agent.graph import build_agent
    g = build_agent()
    assert g is not None


def test_build_agent_returns_compiled_graph():
    from agent.graph import build_agent
    g = build_agent()
    assert hasattr(g, "invoke")
    assert hasattr(g, "get_state")


def test_ask_user_tool_schema():
    """Verify ask_user tool has the right parameter schema."""
    from agent.tools import ask_user
    schema = ask_user.args_schema.model_json_schema()
    assert "question" in schema["properties"]
    assert schema["properties"]["question"]["type"] == "string"
