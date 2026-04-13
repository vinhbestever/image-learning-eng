# Adaptive Conversation Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fixed 5-question flow with an adaptive 3-phase conversation (Vocabulary → Grammar → Sentence Construction) driven by 3 agents: main orchestrator, `image_analyzer` subagent, and `evaluator` subagent.

**Architecture:** Main agent (GPT-4o multimodal) orchestrates a shared virtual filesystem (`/session/`). It describes the image to the `image_analyzer` subagent which writes structured context; main agent then runs an adaptive conversation loop across 3 teaching phases, deciding when to transition phases and when to end based on reading `/session/qa_log.md` and `/session/phase_state.md`; finally calls `evaluator` subagent for child-friendly ⭐ feedback.

**Tech Stack:** Python 3.11, FastAPI, LangGraph, deepagents, GPT-4o, SQLite, React/TypeScript frontend (unchanged)

---

> **DB note:** After completing this plan, delete `backend/data/app.sqlite` before running the app. The `api_sessions` table schema changes (removes `total` column). Tests are unaffected — they use a fresh tmp DB per run.

---

## File Map

| Action | Path |
|--------|------|
| Create | `backend/skills/image-analysis/SKILL.md` |
| Create | `backend/skills/adaptive-conversation/SKILL.md` |
| Modify | `backend/skills/english-evaluation/SKILL.md` |
| Modify | `backend/agent/skills.py` |
| Modify | `backend/agent/state.py` |
| Modify | `backend/api/models.py` |
| Modify | `backend/api/session_store.py` |
| Modify | `backend/agent/prompts.py` |
| Modify | `backend/agent/graph.py` |
| Modify | `backend/api/sessions.py` |
| Modify | `backend/tests/test_skills.py` |
| Modify | `backend/tests/test_sessions_api.py` |

---

## Task 1: Create `image-analysis` skill file

**Files:**
- Create: `backend/skills/image-analysis/SKILL.md`
- Modify: `backend/tests/test_skills.py`

- [ ] **Step 1: Write the failing test**

Add to `backend/tests/test_skills.py`:

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

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd backend && pytest tests/test_skills.py::test_image_analysis_skill_exists_and_has_content -v
```

Expected: `FAILED` — `ImportError` or `KeyError` (constant and file don't exist yet)

- [ ] **Step 3: Create the skill file**

Create `backend/skills/image-analysis/SKILL.md`:

```markdown
---
name: image-analysis
description: Use this skill when analyzing an image for an English learning session. Defines the structured output format to write to /session/image_context.md.
---

# Image Analysis for English Learning Sessions

## Purpose

Analyze the image described to you and write a structured context file that the main teaching agent will use to plan vocabulary, grammar, and sentence construction activities for students grade 9 and below.

## Output Format

Use the `write_file` tool to save your analysis to `/session/image_context.md` using this exact structure:

```
## Scene
[2-3 sentences describing what is happening in the image: who, what, where, mood]

## Key Vocabulary
- [word]: [simple English definition] | [Vietnamese: bản dịch]
- [word]: [simple English definition] | [Vietnamese: bản dịch]
[5–8 words total — mix of nouns, verbs, and adjectives clearly visible or implied by the scene]

## Suggested Grammar Topics
- [grammar topic]: [one sentence explaining why it fits this image]
- [grammar topic]: [one sentence explaining why it fits this image]
```

## Vocabulary Selection Guidelines

Choose words that:
- Are clearly present or strongly implied in the image
- Are useful and relevant for everyday communication
- Cover a mix of word types: at least 2 nouns, 1 verb, 1 adjective
- Are at B1–B2 CEFR level (avoid very basic words like "cat" or "car" unless central to the image)

**Good vocabulary choices for a park scene:**
- "stroll": to walk slowly and relaxedly | Vietnamese: đi dạo
- "lush": (of plants) healthy and growing thickly | Vietnamese: xanh tươi
- "gather": to come together in a group | Vietnamese: tụ tập

## Grammar Topic Selection Guidelines

Choose 2 grammar topics that:
- Are naturally demonstrated by the image content
- Are appropriate for grade 9 and below (no subjunctive, complex passives, etc.)
- Allow the student to practice using the vocabulary selected above

**Suitable grammar topics (examples):**
- Present continuous (for actions happening in the image)
- There is / There are (for describing what exists in the scene)
- Adjective + noun order (for describing objects and people)
- Comparative / superlative (if the image has multiple items to compare)
- Past simple (if the image suggests a completed action)
- Can / could (for speculating about abilities shown)

## After Writing

Once you have written `/session/image_context.md`, return the message: `"Image analysis complete."`
```

- [ ] **Step 4: Run test (it will still fail — `IMAGE_ANALYZER_SKILLS_PATH` not yet defined)**

```bash
cd backend && pytest tests/test_skills.py::test_image_analysis_skill_exists_and_has_content -v
```

Expected: `FAILED` — `ImportError: cannot import name 'IMAGE_ANALYZER_SKILLS_PATH'`

This is expected — we fix `skills.py` in Task 4. Skip to commit for now.

- [ ] **Step 5: Commit skill file only**

```bash
cd backend && git add skills/image-analysis/SKILL.md
git commit -m "feat: add image-analysis skill file for image_analyzer subagent"
```

---

## Task 2: Create `adaptive-conversation` skill file

**Files:**
- Create: `backend/skills/adaptive-conversation/SKILL.md`
- Modify: `backend/tests/test_skills.py`

- [ ] **Step 1: Write the failing test**

Add to `backend/tests/test_skills.py`:

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

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd backend && pytest tests/test_skills.py::test_adaptive_conversation_skill_exists_and_has_phase_guidance -v
```

Expected: `FAILED` — `KeyError` (file not yet loaded by `skills.py`)

- [ ] **Step 3: Create the skill file**

Create `backend/skills/adaptive-conversation/SKILL.md`:

```markdown
---
name: adaptive-conversation
description: Use this skill when managing the adaptive 3-phase English conversation loop. Guides phase progression, transition criteria, and ending decision for students grade 9 and below.
---

# Adaptive English Conversation Teaching

## Overview

You teach English through 3 sequential phases tied to the image the student uploaded. Progress through phases based on holistic assessment — not turn counts. You may backtrack and you decide when to end.

## The Three Phases

### Phase 1: Vocabulary

**Goal:** Student learns and can use the key vocabulary from the image.

**What to do:**
- Select 3–5 vocabulary items from `/session/image_context.md`
- Ask one item at a time: meaning, usage in a sentence, or a similar example
- Correct gently in English; explain errors in Vietnamese
- Example questions:
  - "Can you tell me what 'lush' means? Have you seen it used before?"
  - "How would you use the word 'gather' in a sentence about the image?"

**When to move to Phase 2:**
Read the conversation so far in `/session/qa_log.md`. Ask yourself: has the student shown they understand the core vocabulary? If yes — even imperfectly — move on. Don't drill until perfection; move when understanding is evident.

**When to backtrack here from Phase 2:**
If the student's grammar errors are clearly caused by not knowing the words (e.g., using wrong words, not wrong structure), return to vocabulary practice.

### Phase 2: Grammar

**Goal:** Student can recognize and produce 1–2 grammar structures in the context of the image.

**What to do:**
- Use the grammar topics from `/session/image_context.md`
- Introduce the structure conversationally: "I notice the image shows people doing something — in English we use present continuous for this. Can you make a sentence with it?"
- Ask recognition or production questions:
  - "Look at the image — can you make a sentence using 'is/are + verb-ing'?"
  - "How would you say 'có một người đang chạy' in English using 'there is'?"
- If the student asks about grammar → answer in Vietnamese, then continue

**When to move to Phase 3:**
Student can produce or recognize the target structure, even if not perfectly. Holistic judgment — not a checklist.

### Phase 3: Sentence Construction

**Goal:** Student writes complete sentences combining the vocabulary and grammar learned.

**What to do:**
- Prompt the student with a topic/angle — do NOT write the sentence for them
  - "Can you describe what the person in the foreground is doing, using words we learned?"
  - "Write a sentence about the mood of the scene using an adjective we discussed."
- For correct sentences: praise specifically + prompt for extension ("Can you add a detail about the background?")
- For incorrect sentences: quote the error, explain clearly (Vietnamese for grammar/vocab), ask them to try again

**This phase is the primary signal for ending** — once the student has successfully constructed 1–2 sentences combining the session's vocabulary and grammar, you have a strong signal to wrap up.

## Updating Session Files

After each turn, always:

1. Append to `/session/qa_log.md`:
```
**Turn [N]** | Phase: [vocabulary/grammar/sentence]
Q: [your question]
A: [student's answer]
Feedback: [1-sentence summary of your feedback]
```

2. Update `/session/phase_state.md` — rewrite the whole file:
```
## Current Phase
[vocabulary / grammar / sentence]

## Phase History
[brief note: e.g., "Moved to grammar after turn 4. Student grasped 'stroll' and 'gather'."]

## Notes
[anything to remember for next question]
```

## Deciding Whether to Continue or End

After updating session files, read both files and reason:

> "Have I covered the key aspects of this image? Has the student had sufficient practice across the phases they've reached? Is this a natural stopping point?"

**End when:**
- Phase 3 is underway AND student has produced at least one good sentence, AND image content is well-covered, OR
- Student expresses goodbye intent through natural language (any language)

**Continue when:**
- A phase hasn't been meaningfully attempted yet, OR
- Student's answers suggest they need more practice on a specific aspect

## Responding to Student Questions

If the student asks you a question (not an answer to your question):
- Grammar/vocabulary questions → answer in Vietnamese, be specific and clear
- Then resume the lesson: "Bây giờ mình thử lại nhé! [original question restated]"

## Language Policy

| Content | Language |
|---------|----------|
| Questions | English |
| Praise | English |
| Error explanations | Vietnamese |
| Grammar explanations (when student asks) | Vietnamese |

## Tone

You are talking to students grade 9 and below. Be warm, patient, and encouraging. Short sentences. No jargon. Celebrate small wins. Never make the student feel embarrassed for making mistakes.
```

- [ ] **Step 4: Commit**

```bash
cd backend && git add skills/adaptive-conversation/SKILL.md tests/test_skills.py
git commit -m "feat: add adaptive-conversation skill and failing tests for new skill paths"
```

---

## Task 3: Update `english-evaluation` skill for young learners + ⭐ rating

**Files:**
- Modify: `backend/skills/english-evaluation/SKILL.md`
- Modify: `backend/tests/test_skills.py`

- [ ] **Step 1: Write the failing test**

Replace the existing `test_evaluator_skill_contains_feedback_rubric` test in `backend/tests/test_skills.py`:

```python
def test_evaluator_skill_contains_feedback_rubric():
    files = load_all_skill_files()
    eval_key = f"{EVALUATOR_SKILLS_PATH}english-evaluation/SKILL.md"
    text = _get_skill_text(files, eval_key)
    assert "sao" in text          # Vietnamese for "stars" — star rating section
    assert "Từ vựng" in text      # Vietnamese section headers
    assert "Ngữ pháp" in text
    assert "Đặt câu" in text
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd backend && pytest tests/test_skills.py::test_evaluator_skill_contains_feedback_rubric -v
```

Expected: `FAILED` — "sao", "Từ vựng" not in current skill file

- [ ] **Step 3: Rewrite the skill file**

Replace `backend/skills/english-evaluation/SKILL.md` entirely:

```markdown
---
name: english-evaluation
description: Use this skill when evaluating a student's English answers from an adaptive conversation session. Provides a simplified child-friendly rubric with star rating for students grade 9 and below.
---

# English Evaluation — Young Learners (Grade 9 and below)

## Overview

You are reviewing a student's English practice session. Write warm, simple feedback in Vietnamese with a star rating. Keep it short — these are young learners who need encouragement, not a detailed report.

## How to Evaluate

Read `/session/qa_log.md`. Look at:
- **Vocabulary**: Did the student use the target words correctly? Did they understand meanings?
- **Grammar**: Did the student use the target grammar structures? Were sentences structurally correct?
- **Sentence Construction**: Did the student write complete, meaningful sentences? (If the session ended before Phase 3, note overall progress instead.)

## Output Format

Write your feedback using exactly this format (in Vietnamese):

```
⭐⭐⭐⭐ (4/5 sao)

📝 **Từ vựng**
[1-2 câu nhận xét thân thiện. Khen điểm tốt, nêu 1 gợi ý nếu cần.]

📖 **Ngữ pháp**
[1-2 câu nhận xét thân thiện. Khen điểm tốt, nêu 1 gợi ý nếu cần.]

✍️ **Đặt câu**
[1-2 câu nhận xét thân thiện. Nếu học sinh chưa đến giai đoạn này, nhận xét về tiến bộ tổng thể.]

💪 [1 câu động viên ngắn + 1 gợi ý luyện tập cụ thể]
```

## Star Rating Guide

Rate the student's overall performance across all phases:

| Rating | When to use |
|--------|-------------|
| ⭐ (1/5 sao) | Chưa hiểu nhiều, hầu hết câu trả lời chưa đúng |
| ⭐⭐ (2/5 sao) | Đã cố gắng nhưng còn nhiều lỗi cơ bản |
| ⭐⭐⭐ (3/5 sao) | Hiểu được, đôi khi mắc lỗi nhỏ |
| ⭐⭐⭐⭐ (4/5 sao) | Làm tốt, rất ít lỗi, câu rõ ràng |
| ⭐⭐⭐⭐⭐ (5/5 sao) | Xuất sắc, gần như không có lỗi |

## Tone Rules

- Write as if talking directly to the student: "Em đã dùng từ 'lush' rất đúng chỗ!"
- Never say "Bạn mắc lỗi cơ bản" or anything that sounds harsh
- Always end with something positive and a concrete next step
- Keep each section to 1-2 sentences — this is feedback, not a lecture
- No jargon: avoid terms like "subject-verb agreement"; say "động từ cần hợp với chủ ngữ" or give a specific example instead
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
cd backend && pytest tests/test_skills.py::test_evaluator_skill_contains_feedback_rubric -v
```

Expected: `PASSED`

- [ ] **Step 5: Commit**

```bash
cd backend && git add skills/english-evaluation/SKILL.md tests/test_skills.py
git commit -m "feat: update english-evaluation skill for young learners with star rating format"
```

---

## Task 4: Update `agent/skills.py` — add `IMAGE_ANALYZER_SKILLS_PATH`, swap main skill

**Files:**
- Modify: `backend/agent/skills.py`
- Modify: `backend/tests/test_skills.py`

- [ ] **Step 1: Write the failing tests**

Replace the entire content of `backend/tests/test_skills.py` with:

```python
from agent.skills import (
    load_all_skill_files,
    MAIN_SKILLS_PATH,
    EVALUATOR_SKILLS_PATH,
    IMAGE_ANALYZER_SKILLS_PATH,
)


def _get_skill_text(files: dict, key: str) -> str:
    """Extract the text content from a create_file_data dict (lines stored as list)."""
    data = files[key]
    content = data.get("content", [])
    return "\n".join(content)


def test_load_all_skill_files_returns_all_three():
    files = load_all_skill_files()
    main_key = f"{MAIN_SKILLS_PATH}adaptive-conversation/SKILL.md"
    eval_key = f"{EVALUATOR_SKILLS_PATH}english-evaluation/SKILL.md"
    analyzer_key = f"{IMAGE_ANALYZER_SKILLS_PATH}image-analysis/SKILL.md"
    assert main_key in files
    assert eval_key in files
    assert analyzer_key in files


def test_skill_files_have_content():
    files = load_all_skill_files()
    for path, data in files.items():
        assert "content" in data, f"Skill file {path} missing content key"
        assert len(data["content"]) > 0, f"Skill file {path} has empty content"


def test_adaptive_conversation_skill_exists_and_has_phase_guidance():
    files = load_all_skill_files()
    key = f"{MAIN_SKILLS_PATH}adaptive-conversation/SKILL.md"
    assert key in files
    text = _get_skill_text(files, key)
    assert "Vocabulary" in text
    assert "Grammar" in text
    assert "Sentence Construction" in text
    assert "phase_state.md" in text


def test_image_analysis_skill_exists_and_has_content():
    files = load_all_skill_files()
    key = f"{IMAGE_ANALYZER_SKILLS_PATH}image-analysis/SKILL.md"
    assert key in files
    text = _get_skill_text(files, key)
    assert "image_context.md" in text
    assert "Key Vocabulary" in text
    assert "Suggested Grammar" in text


def test_evaluator_skill_contains_feedback_rubric():
    files = load_all_skill_files()
    eval_key = f"{EVALUATOR_SKILLS_PATH}english-evaluation/SKILL.md"
    text = _get_skill_text(files, eval_key)
    assert "sao" in text
    assert "Từ vựng" in text
    assert "Ngữ pháp" in text
    assert "Đặt câu" in text
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd backend && pytest tests/test_skills.py -v
```

Expected: Several `FAILED` — `ImportError: cannot import name 'IMAGE_ANALYZER_SKILLS_PATH'`

- [ ] **Step 3: Update `agent/skills.py`**

Replace the entire file `backend/agent/skills.py`:

```python
"""Load skill files from disk and prepare them for the StateBackend virtual filesystem."""

import os
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

- [ ] **Step 4: Run tests to confirm they all pass**

```bash
cd backend && pytest tests/test_skills.py -v
```

Expected: All `PASSED`

- [ ] **Step 5: Commit**

```bash
cd backend && git add agent/skills.py tests/test_skills.py
git commit -m "feat: add IMAGE_ANALYZER_SKILLS_PATH, switch main skill to adaptive-conversation"
```

---

## Task 5: Update `agent/state.py` and `api/models.py` — remove `total`, keep `step`

**Files:**
- Modify: `backend/agent/state.py`
- Modify: `backend/api/models.py`

- [ ] **Step 1: Write the failing test**

Add a new test file `backend/tests/test_state.py`:

```python
from agent.state import SessionInfo
from api.models import SessionResponse


def test_session_info_has_no_total_field():
    info = SessionInfo(thread_id="abc", step=1)
    assert not hasattr(info, "total")


def test_session_info_has_step_and_questions():
    info = SessionInfo(thread_id="abc", step=2)
    assert info.step == 2
    assert info.questions_asked == []


def test_session_response_total_is_optional():
    r = SessionResponse(session_id="x", step=1, done=False)
    assert r.total is None


def test_session_response_total_can_be_set():
    r = SessionResponse(session_id="x", step=1, total=5, done=False)
    assert r.total == 5
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd backend && pytest tests/test_state.py -v
```

Expected: `test_session_info_has_no_total_field` FAILED (SessionInfo has `total`), `test_session_response_total_is_optional` FAILED (`total` defaults to 5 not None)

- [ ] **Step 3: Update `agent/state.py`**

Replace the entire file `backend/agent/state.py`:

```python
from dataclasses import dataclass, field


@dataclass
class SessionInfo:
    """Tracks session metadata for the API layer."""
    thread_id: str
    step: int = 0
    questions_asked: list[str] = field(default_factory=list)
```

- [ ] **Step 4: Update `api/models.py`**

Replace the entire file `backend/api/models.py`:

```python
from pydantic import BaseModel
from typing import Optional


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

- [ ] **Step 5: Run tests to confirm they pass**

```bash
cd backend && pytest tests/test_state.py -v
```

Expected: All `PASSED`

- [ ] **Step 6: Commit**

```bash
cd backend && git add agent/state.py api/models.py tests/test_state.py
git commit -m "feat: remove hardcoded total=5 from SessionInfo and SessionResponse"
```

---

## Task 6: Update `api/session_store.py` — remove `total` column

**Files:**
- Modify: `backend/api/session_store.py`

- [ ] **Step 1: Write the failing test**

Add to `backend/tests/test_state.py`:

```python
import pytest
import os
import tempfile


def test_session_store_save_and_load_without_total(tmp_path, monkeypatch):
    monkeypatch.setenv("APP_SQLITE_PATH", str(tmp_path / "test.sqlite"))
    from api import session_store
    session_store.reset_connection()

    info = SessionInfo(thread_id="t1", step=3, questions_asked=["Q1", "Q2"])
    session_store.save_session("sess1", info)

    loaded = session_store.load_session("sess1")
    assert loaded is not None
    assert loaded.thread_id == "t1"
    assert loaded.step == 3
    assert loaded.questions_asked == ["Q1", "Q2"]
    assert not hasattr(loaded, "total")

    session_store.reset_connection()
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd backend && pytest tests/test_state.py::test_session_store_save_and_load_without_total -v
```

Expected: `FAILED` — `TypeError` because `save_session` passes `info.total` which no longer exists

- [ ] **Step 3: Update `api/session_store.py`**

Replace the entire file `backend/api/session_store.py`:

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
            _conn.execute(
                """
                CREATE TABLE IF NOT EXISTS api_sessions (
                    session_id TEXT PRIMARY KEY,
                    thread_id TEXT NOT NULL,
                    step INTEGER NOT NULL,
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
            INSERT INTO api_sessions (session_id, thread_id, step, questions_json)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(session_id) DO UPDATE SET
                thread_id = excluded.thread_id,
                step = excluded.step,
                questions_json = excluded.questions_json
            """,
            (
                session_id,
                info.thread_id,
                info.step,
                json.dumps(info.questions_asked),
            ),
        )
        conn.commit()


def load_session(session_id: str) -> SessionInfo | None:
    conn = _get_conn()
    with _lock:
        row = conn.execute(
            "SELECT thread_id, step, questions_json FROM api_sessions WHERE session_id = ?",
            (session_id,),
        ).fetchone()
    if row is None:
        return None
    thread_id, step, questions_json = row
    questions = json.loads(questions_json)
    return SessionInfo(thread_id=thread_id, step=step, questions_asked=list(questions))


def delete_session(session_id: str) -> None:
    conn = _get_conn()
    with _lock:
        conn.execute("DELETE FROM api_sessions WHERE session_id = ?", (session_id,))
        conn.commit()
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
cd backend && pytest tests/test_state.py -v
```

Expected: All `PASSED`

- [ ] **Step 5: Commit**

```bash
cd backend && git add api/session_store.py tests/test_state.py
git commit -m "feat: remove total column from api_sessions table in session_store"
```

---

## Task 7: Update `agent/prompts.py` — 3 new/updated prompts

**Files:**
- Modify: `backend/agent/prompts.py`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_prompts.py`:

```python
from agent.prompts import SYSTEM_PROMPT, EVALUATOR_PROMPT, IMAGE_ANALYZER_PROMPT


def test_system_prompt_has_three_phase_references():
    assert "vocabulary" in SYSTEM_PROMPT.lower()
    assert "grammar" in SYSTEM_PROMPT.lower()
    assert "sentence" in SYSTEM_PROMPT.lower()


def test_system_prompt_instructs_image_analyzer_subagent_call():
    assert "image_analyzer" in SYSTEM_PROMPT


def test_system_prompt_instructs_context_memory_based_ending():
    assert "qa_log.md" in SYSTEM_PROMPT
    assert "phase_state.md" in SYSTEM_PROMPT


def test_system_prompt_no_fixed_five_questions():
    assert "5 questions" not in SYSTEM_PROMPT
    assert "exactly 5" not in SYSTEM_PROMPT


def test_evaluator_prompt_has_star_rating_format():
    assert "sao" in EVALUATOR_PROMPT
    assert "qa_log.md" in EVALUATOR_PROMPT


def test_image_analyzer_prompt_instructs_file_write():
    assert "image_context.md" in IMAGE_ANALYZER_PROMPT
    assert "write_file" in IMAGE_ANALYZER_PROMPT
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd backend && pytest tests/test_prompts.py -v
```

Expected: `ImportError: cannot import name 'IMAGE_ANALYZER_PROMPT'` and several other failures

- [ ] **Step 3: Replace `agent/prompts.py`**

Replace the entire file `backend/agent/prompts.py`:

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

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd backend && pytest tests/test_prompts.py -v
```

Expected: All `PASSED`

- [ ] **Step 5: Commit**

```bash
cd backend && git add agent/prompts.py tests/test_prompts.py
git commit -m "feat: replace fixed 5-question prompts with adaptive 3-phase prompts and image_analyzer prompt"
```

---

## Task 8: Update `agent/graph.py` — add `image_analyzer` subagent

**Files:**
- Modify: `backend/agent/graph.py`

- [ ] **Step 1: Write the failing test**

Add to `backend/tests/test_graph.py` (open the file first to see what's already there, then add):

```python
def test_agent_builds_with_image_analyzer_subagent(monkeypatch):
    """Verify that the graph builds without error and registers image_analyzer."""
    monkeypatch.setenv("USE_MEMORY_CHECKPOINTER", "1")
    from agent.graph import build_agent, reset_agent
    reset_agent()
    agent = build_agent()
    assert agent is not None
    reset_agent()
```

- [ ] **Step 2: Run existing graph tests to confirm baseline**

```bash
cd backend && pytest tests/test_graph.py -v
```

Expected: All existing tests `PASSED` (baseline check before changes)

- [ ] **Step 3: Update `agent/graph.py`**

Replace the entire file `backend/agent/graph.py`:

```python
import os

import aiosqlite
from deepagents import create_deep_agent
from langgraph.checkpoint.memory import MemorySaver
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver

from .prompts import SYSTEM_PROMPT, EVALUATOR_PROMPT, IMAGE_ANALYZER_PROMPT
from .skills import MAIN_SKILLS_PATH, EVALUATOR_SKILLS_PATH, IMAGE_ANALYZER_SKILLS_PATH
from .storage import get_app_sqlite_path
from .tools import ask_user

image_analyzer_subagent = {
    "name": "image_analyzer",
    "description": "Analyzes an image description and writes structured context to /session/image_context.md. "
    "Extracts key vocabulary (with Vietnamese translations), scene description, and grammar topics "
    "appropriate for ESL students grade 9 and below.",
    "system_prompt": IMAGE_ANALYZER_PROMPT,
    "skills": [IMAGE_ANALYZER_SKILLS_PATH],
}

evaluator_subagent = {
    "name": "evaluator",
    "description": "Evaluates a student's English answers from an adaptive conversation session. "
    "Reads Q&A logs from the virtual filesystem and generates warm, child-friendly feedback "
    "in Vietnamese covering vocabulary, grammar, and sentence construction, with a star rating.",
    "system_prompt": EVALUATOR_PROMPT,
    "skills": [EVALUATOR_SKILLS_PATH],
}

_agent = None
_async_conn: aiosqlite.Connection | None = None
_async_checkpointer: AsyncSqliteSaver | None = None


def reset_agent() -> None:
    """Clear compiled agent singleton (tests / reload)."""
    global _agent
    _agent = None


async def init_checkpointer() -> None:
    """Open async SQLite + checkpointer. Call from FastAPI lifespan (or tests skip via USE_MEMORY_CHECKPOINTER)."""
    global _async_conn, _async_checkpointer, _agent
    await shutdown_checkpointer()
    path = get_app_sqlite_path()
    _async_conn = await aiosqlite.connect(path)
    _async_checkpointer = AsyncSqliteSaver(_async_conn)
    _agent = None


async def shutdown_checkpointer() -> None:
    """Close async DB handle."""
    global _async_conn, _async_checkpointer, _agent
    _agent = None
    _async_checkpointer = None
    if _async_conn is not None:
        await _async_conn.close()
        _async_conn = None


def _select_checkpointer():
    """Tests use in-memory graph; production uses AsyncSqliteSaver (async-safe with ainvoke / astream_events)."""
    if os.environ.get("USE_MEMORY_CHECKPOINTER") == "1":
        return MemorySaver()
    if _async_checkpointer is None:
        raise RuntimeError(
            "Async SQLite checkpointer not initialized. "
            "Run the app with FastAPI lifespan (see main.py), or set USE_MEMORY_CHECKPOINTER=1 for tests."
        )
    return _async_checkpointer


def build_agent():
    """Build a deep agent with adaptive 3-phase English conversation capabilities.

    Capabilities used:
    - Virtual filesystem: write_file/read_file for image context, Q&A log, phase state
    - Subagents: image_analyzer (context extraction), evaluator (feedback generation)
    - Skills: adaptive-conversation (main), english-evaluation (evaluator), image-analysis (image_analyzer)
    - Summarization: automatic context compression for long sessions
    - Human-in-the-loop: ask_user tool with interrupt() for Q&A
    """
    checkpointer = _select_checkpointer()
    agent = create_deep_agent(
        model="openai:gpt-4o",
        tools=[ask_user],
        system_prompt=SYSTEM_PROMPT,
        subagents=[image_analyzer_subagent, evaluator_subagent],
        skills=[MAIN_SKILLS_PATH],
        checkpointer=checkpointer,
    )
    return agent


def get_agent():
    """Lazy singleton — defers creation until first use so env vars are set."""
    global _agent
    if _agent is None:
        _agent = build_agent()
    return _agent
```

- [ ] **Step 4: Run all graph tests**

```bash
cd backend && pytest tests/test_graph.py -v
```

Expected: All `PASSED`

- [ ] **Step 5: Commit**

```bash
cd backend && git add agent/graph.py
git commit -m "feat: add image_analyzer subagent to agent graph, update evaluator description"
```

---

## Task 9: Update `api/sessions.py` — remove `total=5` hardcoding

**Files:**
- Modify: `backend/api/sessions.py`

- [ ] **Step 1: Write the failing test**

Add to `backend/tests/test_sessions_api.py`:

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
    data = response.json()
    assert data["total"] is None
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd backend && pytest tests/test_sessions_api.py::test_create_session_returns_null_total -v
```

Expected: `FAILED` — `AssertionError: assert 5 is None`

- [ ] **Step 3: Update `api/sessions.py`**

Find and replace all occurrences of `total=5` and `"total": 5` and `total=info.total` in `backend/api/sessions.py`.

There are 4 locations to update:

**Location 1** — SSE stream endpoint, line with `"total": 5` inside the `question` event (around line 219):
```python
# Before:
                    "type": "question",
                    "session_id": session_id,
                    "step": 1,
                    "total": 5,
                    "text": q,
# After:
                    "type": "question",
                    "session_id": session_id,
                    "step": 1,
                    "total": None,
                    "text": q,
```

**Location 2** — `create_session` POST endpoint, `SessionResponse` construction (around line 275):
```python
# Before:
    return SessionResponse(
        session_id=session_id,
        step=1,
        total=5,
        question=question,
        done=False,
    )
# After:
    return SessionResponse(
        session_id=session_id,
        step=1,
        question=question,
        done=False,
    )
```

**Location 3** — `submit_answer` endpoint, mid-session response (around line 303):
```python
# Before:
        return SessionResponse(
            session_id=session_id,
            step=info.step,
            total=info.total,
            question=question,
            done=False,
        )
# After:
        return SessionResponse(
            session_id=session_id,
            step=info.step,
            question=question,
            done=False,
        )
```

**Location 4** — `submit_answer` endpoint, done response (around line 316):
```python
# Before:
        return SessionResponse(
            session_id=session_id,
            step=final_step,
            total=info.total,
            evaluation=evaluation,
            done=True,
        )
# After:
        return SessionResponse(
            session_id=session_id,
            step=final_step,
            evaluation=evaluation,
            done=True,
        )
```

**Location 5** — SSE answer stream endpoint, question event (around line 365):
```python
# Before:
                yield _sse_payload(
                    {
                        "type": "question",
                        "step": info.step,
                        "total": info.total,
                        "text": q,
                    }
                )
# After:
                yield _sse_payload(
                    {
                        "type": "question",
                        "step": info.step,
                        "total": None,
                        "text": q,
                    }
                )
```

**Location 6** — SSE answer stream endpoint, done event (around line 373):
```python
# Before:
                yield _sse_payload(
                    {
                        "type": "done",
                        "step": final_step,
                        "total": info.total,
                        "evaluation": evaluation,
                    }
                )
# After:
                yield _sse_payload(
                    {
                        "type": "done",
                        "step": final_step,
                        "total": None,
                        "evaluation": evaluation,
                    }
                )
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd backend && pytest tests/test_sessions_api.py::test_create_session_returns_null_total -v
```

Expected: `PASSED`

- [ ] **Step 5: Commit**

```bash
cd backend && git add api/sessions.py
git commit -m "feat: remove hardcoded total=5 from sessions.py, use null for dynamic session length"
```

---

## Task 10: Fix existing tests broken by the changes

**Files:**
- Modify: `backend/tests/test_sessions_api.py`

- [ ] **Step 1: Run the full test suite to find all failures**

```bash
cd backend && pytest -v 2>&1 | grep FAILED
```

Expected failures:
- `test_create_session` — asserts `data["total"] == 5`
- `test_submit_all_answers_returns_evaluation` — asserts `data["total"] == 5`

- [ ] **Step 2: Fix `test_create_session`**

In `backend/tests/test_sessions_api.py`, find `test_create_session` and remove the `total` assertion:

```python
# Before:
    assert data["step"] == 1
    assert data["total"] == 5
    assert data["done"] is False
# After:
    assert data["step"] == 1
    assert data["total"] is None
    assert data["done"] is False
```

- [ ] **Step 3: Fix `test_submit_all_answers_returns_evaluation`**

In the same file, find `test_submit_all_answers_returns_evaluation` and update:

```python
# Before:
    assert data["done"] is True
    assert data["evaluation"] == "Well done! Your answers were descriptive."
    assert data["question"] is None
    assert data["step"] == 5
    assert data["total"] == 5
# After:
    assert data["done"] is True
    assert data["evaluation"] == "Well done! Your answers were descriptive."
    assert data["question"] is None
    assert data["step"] == 5
    assert data["total"] is None
```

- [ ] **Step 4: Run the full test suite**

```bash
cd backend && pytest -v
```

Expected: All tests `PASSED`. If any tests still fail due to `info.total` references (e.g., in `test_nodes.py` or `test_graph.py`), search for `.total` usage and update accordingly.

```bash
cd backend && grep -r "\.total" tests/
```

Fix any remaining `.total` references by removing or replacing with `None`.

- [ ] **Step 5: Commit**

```bash
cd backend && git add tests/test_sessions_api.py
git commit -m "fix: update tests to expect null total in SessionResponse"
```

---

## Final Verification

- [ ] **Run the complete test suite one last time**

```bash
cd backend && pytest -v
```

Expected: All tests `PASSED`, no warnings about `total`.

- [ ] **Delete the old SQLite DB (if it exists) before running the dev server**

```bash
rm -f backend/data/app.sqlite
```

- [ ] **Start the dev server and verify the app runs**

```bash
cd backend && uvicorn main:app --reload
```

Expected: Server starts without errors. Upload an image — the agent should now begin with a vocabulary question derived from the image, not a fixed pre-generated question.
