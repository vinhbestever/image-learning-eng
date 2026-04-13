# Adaptive Conversation Flow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the fixed 5-question English session with an adaptive 3-phase conversation (Vocabulary → Grammar → Sentence Construction) using a main orchestrator plus `image_analyzer` and `evaluator` subagents, as specified in @docs/superpowers/specs/2026-04-13-adaptive-conversation-design.md.

**Architecture:** The main multimodal agent uses the virtual `/session/` filesystem (`image_context.md`, `qa_log.md`, `phase_state.md`), calls `image_analyzer` once at start and `evaluator` at end, and uses `ask_user` interrupts for each turn. API metadata drops the fixed `total=5`; `SessionInfo` gains a `phase` field (default `vocabulary`) persisted beside `step` and `questions_asked`. The frontend must accept `total: null` in JSON/SSE so events are not dropped.

**Tech Stack:** Python 3.11+, FastAPI, LangGraph, deepagents, OpenAI GPT-4o, SQLite (`api_sessions` + checkpointer), React 18, TypeScript, Vite.

---

## Prerequisites

- Read the approved design: `docs/superpowers/specs/2026-04-13-adaptive-conversation-design.md`.
- After schema changes, **delete** `backend/data/app.sqlite` before running the app locally (existing `api_sessions` rows are incompatible). Tests use isolated DBs via `tmp_path` / env.

---

## File Map

| Action | Path |
|--------|------|
| Create | `backend/skills/image-analysis/SKILL.md` |
| Create | `backend/skills/adaptive-conversation/SKILL.md` |
| Modify | `backend/skills/english-evaluation/SKILL.md` |
| Delete (optional cleanup) | `backend/skills/image-question-generation/SKILL.md` — remove after `load_all_skill_files` no longer references it |
| Modify | `backend/agent/skills.py` |
| Modify | `backend/agent/state.py` |
| Modify | `backend/api/models.py` |
| Modify | `backend/api/session_store.py` |
| Modify | `backend/agent/prompts.py` (full replacement — **Appendix A**) |
| Modify | `backend/agent/graph.py` |
| Modify | `backend/api/sessions.py` |
| Modify | `backend/tests/test_skills.py` |
| Create | `backend/tests/test_state.py` |
| Create | `backend/tests/test_prompts.py` |
| Modify | `backend/tests/test_graph.py` |
| Modify | `backend/tests/test_nodes.py` |
| Modify | `backend/tests/test_sessions_api.py` |
| Modify | `frontend/src/types.ts` |
| Modify | `frontend/src/api.ts` |
| Modify | `frontend/src/App.tsx` |
| Modify | `frontend/src/components/ProgressIndicator.tsx` |
| Modify | `frontend/src/components/ChatScreen.tsx` |
| Modify | `frontend/src/components/UploadScreen.tsx` |
| Modify | `frontend/src/api.test.ts` |
| Modify | `frontend/src/App.test.tsx` |
| Modify | `frontend/src/components/ChatScreen.test.tsx` |
| Modify | `frontend/src/components/UploadScreen.test.tsx` |

---

### Task 1: `image-analysis` skill + test

**Files:**
- Create: `backend/skills/image-analysis/SKILL.md`
- Modify: `backend/tests/test_skills.py`

**Step 1: Write the failing test**

Append:

```python
def test_image_analysis_skill_exists_and_has_content():
    from agent.skills import IMAGE_ANALYZER_SKILLS_PATH
    files = load_all_skill_files()
    key = f"{IMAGE_ANALYZER_SKILLS_PATH}image-analysis/SKILL.md"
    assert key in files
    text = _get_skill_text(files, key)
    assert "image_context.md" in text
    assert "Key Vocabulary" in text
    assert "Suggested Grammar" in text
```

**Step 2: Run test — expect failure**

Run: `cd /home/pc600/Desktop/harness-agent-learning-english/backend && pytest tests/test_skills.py::test_image_analysis_skill_exists_and_has_content -v`

Expected: `FAILED` — `ImportError` or `KeyError`.

**Step 3: Add `backend/skills/image-analysis/SKILL.md`**

Use the full markdown body from **Task 1 Step 3** in `docs/superpowers/plans/2026-04-13-adaptive-conversation.md` (same repo; duplicate untracked copy), or paste from this structure: YAML frontmatter (`name: image-analysis`), sections Purpose, Output Format (`## Scene`, `## Key Vocabulary`, `## Suggested Grammar Topics`), vocabulary/grammar guidelines, closing line to return `"Image analysis complete."` after `write_file`.

**Step 4: Commit**

```bash
cd /home/pc600/Desktop/harness-agent-learning-english/backend && git add skills/image-analysis/SKILL.md
git commit -m "feat: add image-analysis skill for image_analyzer subagent"
```

---

### Task 2: `adaptive-conversation` skill + test

**Files:**
- Create: `backend/skills/adaptive-conversation/SKILL.md`
- Modify: `backend/tests/test_skills.py`

**Step 1: Write the failing test**

```python
def test_adaptive_conversation_skill_exists_and_has_phase_guidance():
    files = load_all_skill_files()
    key = f"{MAIN_SKILLS_PATH}adaptive-conversation/SKILL.md"
    assert key in files
    text = _get_skill_text(files, key)
    assert "Vocabulary" in text
    assert "Grammar" in text
    assert "Sentence Construction" in text
    assert "phase_state.md" in text
```

**Step 2: Run test — expect failure**

Run: `pytest tests/test_skills.py::test_adaptive_conversation_skill_exists_and_has_phase_guidance -v`

Expected: `FAILED` — `KeyError`.

**Step 3: Create `backend/skills/adaptive-conversation/SKILL.md`**

Full content: copy from **Task 2 Step 3** in `docs/superpowers/plans/2026-04-13-adaptive-conversation.md` (3 phases, file update patterns, ending rules, language table, tone).

**Step 4: Commit**

```bash
git add skills/adaptive-conversation/SKILL.md tests/test_skills.py
git commit -m "feat: add adaptive-conversation skill and tests"
```

---

### Task 3: Young-learner `english-evaluation` skill

**Files:**
- Modify: `backend/skills/english-evaluation/SKILL.md`
- Modify: `backend/tests/test_skills.py`

**Step 1: Replace `test_evaluator_skill_contains_feedback_rubric` with**

```python
def test_evaluator_skill_contains_feedback_rubric():
    files = load_all_skill_files()
    eval_key = f"{EVALUATOR_SKILLS_PATH}english-evaluation/SKILL.md"
    text = _get_skill_text(files, eval_key)
    assert "sao" in text
    assert "Từ vựng" in text
    assert "Ngữ pháp" in text
    assert "Đặt câu" in text
```

**Step 2: Run test — expect failure**

Run: `pytest tests/test_skills.py::test_evaluator_skill_contains_feedback_rubric -v`

**Step 3: Replace `english-evaluation/SKILL.md`**

Full file: **Task 3 Step 3** in `docs/superpowers/plans/2026-04-13-adaptive-conversation.md` (star rubric + 3 sections + 💪 line).

**Step 4: Run test — expect pass**

**Step 5: Commit**

```bash
git add skills/english-evaluation/SKILL.md tests/test_skills.py
git commit -m "feat: align english-evaluation skill with young-learner star format"
```

---

### Task 4: `agent/skills.py` — third skill path + loader

**Files:**
- Modify: `backend/agent/skills.py`
- Modify: `backend/tests/test_skills.py` (consolidate imports and tests as in superpowers **Task 4 Step 1**)

**Step 1: Consolidate `test_skills.py`** so it imports `IMAGE_ANALYZER_SKILLS_PATH`, defines `_get_skill_text`, and includes `test_load_all_skill_files_returns_all_three`, `test_skill_files_have_content`, plus the three skill content tests from Tasks 1–3.

**Step 2: Run tests — expect failures**

Run: `pytest tests/test_skills.py -v`

Expected: `ImportError` / missing keys.

**Step 3: Replace `backend/agent/skills.py`**

```python
"""Load skill files from disk and prepare them for the StateBackend virtual filesystem."""

from pathlib import Path

from deepagents.backends.utils import create_file_data

_SKILLS_DIR = Path(__file__).resolve().parent.parent / "skills"

MAIN_SKILLS_PATH = "/skills/main/"
EVALUATOR_SKILLS_PATH = "/skills/evaluator/"
IMAGE_ANALYZER_SKILLS_PATH = "/skills/image-analyzer/"


def _load_skill(skill_dir: str, virtual_prefix: str) -> dict[str, dict]:
    """Load a skill directory's SKILL.md into a files dict for StateBackend."""
    skill_path = _SKILLS_DIR / skill_dir / "SKILL.md"
    if not skill_path.exists():
        raise FileNotFoundError(f"Skill not found: {skill_path}")
    content = skill_path.read_text()
    virtual_path = f"{virtual_prefix}{skill_dir}/SKILL.md"
    return {virtual_path: create_file_data(content)}


def load_all_skill_files() -> dict[str, dict]:
    """Load all skill files and return a combined files dict for invoke()."""
    files = {}
    files.update(_load_skill("adaptive-conversation", MAIN_SKILLS_PATH))
    files.update(_load_skill("english-evaluation", EVALUATOR_SKILLS_PATH))
    files.update(_load_skill("image-analysis", IMAGE_ANALYZER_SKILLS_PATH))
    return files
```

**Step 4: Run tests — expect pass**

Run: `pytest tests/test_skills.py -v`

**Step 5: Commit**

```bash
git add agent/skills.py tests/test_skills.py
git commit -m "feat: load adaptive-conversation, evaluator, and image-analyzer skills"
```

---

### Task 5: `SessionInfo` — remove `total`, add `phase`

**Files:**
- Modify: `backend/agent/state.py:4-10`
- Modify: `backend/api/models.py:9-15`
- Create: `backend/tests/test_state.py`

**Step 1: Write failing tests** in `backend/tests/test_state.py`:

```python
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
```

**Step 2: Run tests — expect failure**

Run: `pytest tests/test_state.py -v`

**Step 3: Replace `backend/agent/state.py`**

```python
from dataclasses import dataclass, field


@dataclass
class SessionInfo:
    """Tracks session metadata for the API layer."""
    thread_id: str
    step: int = 0
    phase: str = "vocabulary"
    questions_asked: list[str] = field(default_factory=list)
```

**Step 4: Update `backend/api/models.py`**

```python
from typing import Optional

from pydantic import BaseModel


class AnswerRequest(BaseModel):
    answer: str


class SessionResponse(BaseModel):
    session_id: str
    step: int
    total: Optional[int] = None
    question: Optional[str] = None
    evaluation: Optional[str] = None
    done: bool
```

**Step 5: Run tests — expect pass**

**Step 6: Commit**

```bash
git add agent/state.py api/models.py tests/test_state.py
git commit -m "feat: SessionInfo uses phase; SessionResponse.total optional"
```

---

### Task 6: `api/session_store.py` — drop `total`, add `phase`

**Files:**
- Modify: `backend/api/session_store.py`
- Modify: `backend/tests/test_state.py`

**Step 1: Append failing test**

```python
import json

import pytest


@pytest.fixture()
def fresh_session_store(monkeypatch, tmp_path):
    monkeypatch.setenv("APP_SQLITE_PATH", str(tmp_path / "api.sqlite"))
    from api import session_store

    session_store.reset_connection()
    yield session_store
    session_store.reset_connection()


def test_session_store_round_trip_without_total(fresh_session_store):
    from agent.state import SessionInfo

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
```

**Step 2: Run test — expect failure** (`save_session` still references `total`).

**Step 3: Replace `backend/api/session_store.py`** so:
- `CREATE TABLE api_sessions` columns: `session_id`, `thread_id`, `step`, `phase` (TEXT NOT NULL DEFAULT `'vocabulary'`), `questions_json`
- `save_session` / `load_session` read/write `phase` and never `total`

Reference implementation (extends the older superpowers plan by persisting `phase`):

```python
"""Persistent API session metadata (survives process restarts; same DB as checkpoints)."""

from __future__ import annotations

import json
import sqlite3
import threading

from agent.state import SessionInfo
from agent.storage import get_app_sqlite_path

_lock = threading.Lock()
_conn: sqlite3.Connection | None = None


def reset_connection() -> None:
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
            _conn.execute(
                """
                CREATE TABLE IF NOT EXISTS api_sessions (
                    session_id TEXT PRIMARY KEY,
                    thread_id TEXT NOT NULL,
                    step INTEGER NOT NULL,
                    phase TEXT NOT NULL DEFAULT 'vocabulary',
                    questions_json TEXT NOT NULL
                )
                """
            )
            _conn.commit()
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
```

**Step 4: Run `pytest tests/test_state.py -v` — expect pass**

**Step 5: Commit**

```bash
git add api/session_store.py tests/test_state.py
git commit -m "feat: persist session phase; remove total from api_sessions"
```

---

### Task 7: `agent/prompts.py` — three prompts

**Files:**
- Modify: `backend/agent/prompts.py` (entire file)
- Create: `backend/tests/test_prompts.py`

**Step 1: Create `backend/tests/test_prompts.py`**

```python
from agent.prompts import SYSTEM_PROMPT, EVALUATOR_PROMPT, IMAGE_ANALYZER_PROMPT


def test_system_prompt_three_phases_and_subagents():
    s = SYSTEM_PROMPT.lower()
    assert "vocabulary" in s
    assert "grammar" in s
    assert "sentence" in s
    assert "image_analyzer" in SYSTEM_PROMPT
    assert "qa_log.md" in SYSTEM_PROMPT
    assert "phase_state.md" in SYSTEM_PROMPT


def test_system_prompt_no_fixed_five_questions():
    assert "5 questions" not in SYSTEM_PROMPT
    assert "exactly 5" not in SYSTEM_PROMPT


def test_evaluator_prompt_star_and_log():
    assert "sao" in EVALUATOR_PROMPT
    assert "qa_log.md" in EVALUATOR_PROMPT


def test_image_analyzer_prompt_writes_context_file():
    assert "image_context.md" in IMAGE_ANALYZER_PROMPT
    assert "write_file" in IMAGE_ANALYZER_PROMPT
```

**Step 2: Run tests — expect failure**

Run: `pytest tests/test_prompts.py -v`

**Step 3: Replace `backend/agent/prompts.py`**

Paste **Appendix A** below (same content as **Task 7 Step 3** in `docs/superpowers/plans/2026-04-13-adaptive-conversation.md`).

**Step 4: Run tests — expect pass**

**Step 5: Commit**

```bash
git add agent/prompts.py tests/test_prompts.py
git commit -m "feat: adaptive main prompt, image_analyzer prompt, evaluator prompt"
```

---

### Task 8: `agent/graph.py` — register `image_analyzer`

**Files:**
- Modify: `backend/agent/graph.py` (imports through `build_agent`)
- Modify: `backend/tests/test_graph.py`

**Step 1: Append test**

```python
def test_agent_builds_with_two_subagents(monkeypatch):
    monkeypatch.setenv("USE_MEMORY_CHECKPOINTER", "1")
    from agent.graph import build_agent, reset_agent

    reset_agent()
    agent = build_agent()
    assert agent is not None
    reset_agent()
```

**Step 2: Baseline**

Run: `pytest tests/test_graph.py -v` — all pass before edits.

**Step 3: Update `graph.py`**

- Import `IMAGE_ANALYZER_PROMPT` and `IMAGE_ANALYZER_SKILLS_PATH`.
- Define `image_analyzer_subagent` dict (`name`, `description`, `system_prompt`, `skills`).
- Pass `subagents=[image_analyzer_subagent, evaluator_subagent]` to `create_deep_agent`.
- Refresh docstring to mention adaptive flow and `image_analyzer`.

Full replacement: **Task 8 Step 3** in `docs/superpowers/plans/2026-04-13-adaptive-conversation.md`.

**Step 4: Run `pytest tests/test_graph.py -v`**

**Step 5: Commit**

```bash
git add agent/graph.py tests/test_graph.py
git commit -m "feat: register image_analyzer subagent on deep agent"
```

---

### Task 9: `api/sessions.py` — nullable `total` everywhere

**Files:**
- Modify: `backend/api/sessions.py` (all `SessionResponse` and SSE payloads that use `total`)
- Modify: `backend/tests/test_sessions_api.py`

**Step 1: Add test**

```python
def test_create_session_returns_null_total(client):
    with patch("api.sessions.get_agent") as mock_get_agent:
        mock_agent = mock_get_agent.return_value
        _patch_ainvoke(mock_agent, return_value=_mock_invoke_interrupt("What do you see?"))

        image_bytes = make_fake_image()
        response = client.post(
            "/sessions",
            files={"image": ("test.jpg", io.BytesIO(image_bytes), "image/jpeg")},
        )

    assert response.status_code == 200
    assert response.json()["total"] is None
```

**Step 2: Run test — expect failure** (`total` still `5`).

**Step 3: Edit `sessions.py`**

- `SessionResponse(..., total=5)` → omit `total` or pass `total=None`.
- Replace SSE `"total": 5` and `"total": info.total` with `"total": None` for question/done events where dynamic length applies.
- When constructing `SessionInfo` on new session, use `phase="vocabulary"` and do not set `total`.

**Step 4: Run targeted test — expect pass**

**Step 5: Commit**

```bash
git add api/sessions.py tests/test_sessions_api.py
git commit -m "feat: API and SSE emit null total for adaptive sessions"
```

---

### Task 10: Backend test sweep

**Files:**
- Modify: `backend/tests/test_nodes.py:5-10` — replace `total` assertions with `phase`:

```python
def test_session_info_defaults():
    info = SessionInfo(thread_id="abc")
    assert info.thread_id == "abc"
    assert info.step == 0
    assert info.phase == "vocabulary"
    assert info.questions_asked == []
```

- Modify: `backend/tests/test_sessions_api.py` — any `assert data["total"] == 5` → `is None`.

**Step 1: Run full backend suite**

```bash
cd /home/pc600/Desktop/harness-agent-learning-english/backend && pytest -v
```

**Step 2: Fix any remaining `grep '\.total'` hits under `backend/tests/`**

**Step 3: Commit**

```bash
git add tests/
git commit -m "fix: align tests with phase field and nullable total"
```

---

### Task 11: Frontend — nullable `total` and progress UI

**Why:** `frontend/src/api.ts` requires `ev.total != null` for `question` / `done`; JSON `null` fails the guard and drops events.

**Files:**
- Modify: `frontend/src/types.ts` — `SessionResponse.total: number | null`; session state `total: number | null`.
- Modify: `frontend/src/api.ts` — handler types use `total: number | null`; SSE branches check `ev.step != null` and `ev.text` / `ev.evaluation` without requiring `total`.
- Modify: `frontend/src/App.tsx` — reducer types and `ProgressIndicator` props.
- Modify: `frontend/src/components/ProgressIndicator.tsx`:

```tsx
type Props = { step: number; total: number | null; done: boolean }

export default function ProgressIndicator({ step, total, done }: Props) {
  const hasCap = total != null && total > 0
  const pct = done ? 100 : hasCap ? Math.min(100, (step / total!) * 100) : Math.min(100, step * 5)
  const label = done
    ? hasCap
      ? `All ${total} questions`
      : 'Session complete'
    : hasCap
      ? `Question ${step} / ${total}`
      : `Turn ${step}`
  // keep existing layout/styles; swap copy + pct as above
  return (/* ... */)
}
```

- Modify: `frontend/src/components/ChatScreen.tsx` / `UploadScreen.tsx` prop types to `total: number | null`.
- Update tests: `api.test.ts`, `App.test.tsx`, `ChatScreen.test.tsx`, `UploadScreen.test.tsx` — use `"total":null` in SSE fixtures where appropriate; assert handlers receive `total: null`.

**Step 1: Write failing frontend test** — e.g. in `api.test.ts`, feed `data: {"type":"question","step":1,"total":null,"text":"Hi"}` and assert `onQuestion` called with `total: null` (will fail until `api.ts` updated).

**Step 2: Implement TypeScript changes**

**Step 3: Run**

```bash
cd /home/pc600/Desktop/harness-agent-learning-english/frontend && npm test
cd /home/pc600/Desktop/harness-agent-learning-english/frontend && npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add src/
git commit -m "fix: handle null total in SSE and progress UI for adaptive sessions"
```

---

## Final verification

Run:

```bash
cd /home/pc600/Desktop/harness-agent-learning-english/backend && pytest -v
cd /home/pc600/Desktop/harness-agent-learning-english/frontend && npm test && npx tsc --noEmit
```

Remove old DB: `rm -f backend/data/app.sqlite`

Manual smoke: `uvicorn main:app --reload` from `backend/`, upload image, confirm first interrupt is vocabulary-style and progress shows turn-based copy when `total` is null.

---

## Appendix A — full `backend/agent/prompts.py`

```python
IMAGE_ANALYZER_PROMPT = """You are an image analysis assistant for an English learning app.

First, read the `image-analysis` skill for the exact output format.

You will receive a description of the image from the teaching agent. Analyze it and use the `write_file` tool to save a structured context to `/session/image_context.md` following the skill's format exactly:

- Scene description (2-3 sentences)
- Key Vocabulary (5-8 words: nouns, verbs, adjectives with English definition and Vietnamese translation)
- Suggested Grammar Topics (2 topics with notes on why they fit the image, suitable for grade 9 and below)

After writing the file, return: "Image analysis complete."
"""


SYSTEM_PROMPT = """You are a warm, encouraging English teacher helping students (grade 9 and below) practice English through an image. Speak naturally — like a kind tutor, not a formal exam.

First, read the `adaptive-conversation` skill for detailed phase guidance and transition criteria.

## Session Start

When a student sends you an image:

1. Use your vision to observe the image carefully. Write a brief text description of what you see.
2. Use the `task` tool to call the `image_analyzer` subagent with this prompt:
   "The student uploaded an image showing: [your description]. Please analyze this and write /session/image_context.md."
3. After the subagent completes, read `/session/image_context.md` with `read_file`.
4. Use `write_file` to create `/session/phase_state.md`:
   ```
   ## Current Phase
   vocabulary

   ## Phase History
   Session started.

   ## Notes
   [brief note on which vocabulary and grammar topics to focus on]
   ```
5. Use `write_file` to create `/session/qa_log.md`:
   ```
   # Q&A Log
   ```
6. Use `ask_user` to ask your first vocabulary question in English.

## Conversation Loop

After each student answer, follow this sequence:

### 1. Understand the message type

- **Goodbye intent** (e.g., "bye", "thôi", "xong rồi", "em mệt", "done", "tạm biệt" — any natural language indicating they want to stop) → jump to Ending
- **Question to you** (e.g., "what does X mean?", "tại sao sai?", "cấu trúc này là gì?") → answer it first (Vietnamese for grammar/vocab explanations), then continue from step 2
- **Lesson answer** → continue to step 2

### 2. Give brief feedback

In your response message (before the next question):
- 1-2 sentences in English: praise what was good, or gently note what was wrong
- If there is an error, add 1 sentence in Vietnamese explaining it clearly and specifically
- Example good feedback: "Great answer! 'Lush' is exactly the right word here."
- Example corrective feedback: "Good try! We say 'She is playing', not 'She playing'. (Trong tiếng Anh, sau 'is' ta thêm đuôi -ing cho động từ.)"

### 3. Update session files

Append to `/session/qa_log.md`:
```
**Turn [N]** | Phase: [vocabulary/grammar/sentence]
Q: [your question]
A: [student's answer]
Feedback: [1-sentence summary]
```

Rewrite `/session/phase_state.md` with current phase and any notes.

### 4. Decide: continue or end?

Read `/session/qa_log.md` and `/session/phase_state.md` and reason holistically:
> "Have the key aspects of this image been covered? Has the student had sufficient practice across the phases reached? Is this a natural point to wrap up?"

- If YES → proceed to Ending
- If NO → decide which phase to continue or advance to, then call `ask_user` with the next question

Refer to the `adaptive-conversation` skill for phase transition guidance.

## Ending the Session

When you decide to end (or detect goodbye intent):
1. Do NOT call `ask_user` again.
2. Use the `task` tool to call the `evaluator` subagent:
   "Read /session/qa_log.md and evaluate the student's English performance."
3. Return the evaluator's feedback as your final message. Do not add anything after it.

## Language Policy

| Content | Language |
|---------|----------|
| Questions | English |
| Praise / encouragement | English |
| Error explanations | Vietnamese |
| Grammar explanations (when student asks) | Vietnamese |

## Rules

- ALWAYS use `ask_user` to present questions and wait for student responses
- NEVER ask multiple questions in a single `ask_user` call
- ALWAYS update `/session/qa_log.md` and `/session/phase_state.md` after every turn
- NEVER write sentences for the student — guide them to produce language themselves
- These are young learners — be warm, patient, and celebrate progress"""


EVALUATOR_PROMPT = """You are reviewing a young student's (grade 9 and below) English practice session.

First, read the `english-evaluation` skill for the exact output format and rating guide.

Then read the Q&A log from `/session/qa_log.md`.

Write feedback in Vietnamese following the skill's format exactly:
- Star rating (⭐ out of 5 sao)
- 📝 Từ vựng (1-2 sentences)
- 📖 Ngữ pháp (1-2 sentences)
- ✍️ Đặt câu (1-2 sentences — or overall progress if student did not reach Phase 3)
- 💪 One short encouragement + one specific practice suggestion

Be warm, specific, and encouraging. Speak directly to the student."""
```

---

**Related skills:** @.cursor/skills/executing-plans/SKILL.md · @.cursor/skills/subagent-driven-development/SKILL.md · @.cursor/skills/verification-before-completion/SKILL.md · @.cursor/skills/test-driven-development/SKILL.md
