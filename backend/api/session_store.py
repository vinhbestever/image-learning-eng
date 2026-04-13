"""Persistent API session metadata (survives process restarts; same DB as checkpoints)."""

from __future__ import annotations

import json
import sqlite3
import threading

from agent.state import SessionInfo
from agent.storage import get_app_sqlite_path

_lock = threading.Lock()
_conn: sqlite3.Connection | None = None

_NEW_TABLE_SQL = """
CREATE TABLE api_sessions (
    session_id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL,
    step INTEGER NOT NULL,
    phase TEXT NOT NULL DEFAULT 'vocabulary',
    questions_json TEXT NOT NULL
)
"""


def _ensure_api_sessions_schema(conn: sqlite3.Connection) -> None:
    """Create api_sessions or migrate legacy table (had ``total``, no ``phase``)."""
    row = conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name='api_sessions'"
    ).fetchone()
    if row is None:
        conn.execute(_NEW_TABLE_SQL)
        conn.commit()
        return

    cols = {r[1] for r in conn.execute("PRAGMA table_info(api_sessions)").fetchall()}
    if "phase" in cols:
        return

    conn.execute("BEGIN")
    try:
        conn.execute("ALTER TABLE api_sessions RENAME TO api_sessions_legacy")
        conn.execute(_NEW_TABLE_SQL)
        conn.execute(
            """
            INSERT INTO api_sessions (session_id, thread_id, step, phase, questions_json)
            SELECT session_id, thread_id, step, 'vocabulary', questions_json
            FROM api_sessions_legacy
            """
        )
        conn.execute("DROP TABLE api_sessions_legacy")
        conn.commit()
    except Exception:
        conn.rollback()
        raise


def reset_connection() -> None:
    """Close DB handle (for tests / process reload)."""
    global _conn
    with _lock:
        if _conn is not None:
            _conn.close()
            _conn = None


def _get_conn() -> sqlite3.Connection:
    global _conn
    with _lock:
        if _conn is None:
            path = get_app_sqlite_path()
            _conn = sqlite3.connect(path, check_same_thread=False)
            _ensure_api_sessions_schema(_conn)
        return _conn


def save_session(session_id: str, info: SessionInfo) -> None:
    conn = _get_conn()
    with _lock:
        conn.execute(
            """
            INSERT INTO api_sessions (session_id, thread_id, step, phase, questions_json)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(session_id) DO UPDATE SET
                thread_id = excluded.thread_id,
                step = excluded.step,
                phase = excluded.phase,
                questions_json = excluded.questions_json
            """,
            (
                session_id,
                info.thread_id,
                info.step,
                info.phase,
                json.dumps(info.questions_asked),
            ),
        )
        conn.commit()


def load_session(session_id: str) -> SessionInfo | None:
    conn = _get_conn()
    with _lock:
        row = conn.execute(
            "SELECT thread_id, step, phase, questions_json FROM api_sessions WHERE session_id = ?",
            (session_id,),
        ).fetchone()
    if row is None:
        return None
    thread_id, step, phase, questions_json = row
    questions = json.loads(questions_json)
    return SessionInfo(
        thread_id=thread_id,
        step=step,
        phase=phase,
        questions_asked=list(questions),
    )


def delete_session(session_id: str) -> None:
    conn = _get_conn()
    with _lock:
        conn.execute("DELETE FROM api_sessions WHERE session_id = ?", (session_id,))
        conn.commit()
