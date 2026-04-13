import os
import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch

os.environ.setdefault("OPENAI_API_KEY", "sk-test-fake-key-for-testing")


@pytest.fixture
def client():
    from main import app
    return TestClient(app)
