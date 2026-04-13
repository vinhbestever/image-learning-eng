"""Shared SQLite path for LangGraph checkpoints and API session metadata."""

import os
from pathlib import Path


def get_app_sqlite_path() -> str:
    override = os.environ.get("APP_SQLITE_PATH", "").strip()
    if override:
        return override
    data_dir = Path(__file__).resolve().parent.parent / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    return str(data_dir / "app.sqlite")
