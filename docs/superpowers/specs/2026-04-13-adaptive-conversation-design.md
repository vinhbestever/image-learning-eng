# Adaptive Conversation Flow Design

**Date:** 2026-04-13
**Status:** Approved

## Overview

Redesign the English learning agent from a fixed 5-question flow to an adaptive, 3-phase conversational flow targeting students grade 9 and below. The agent interacts naturally around an uploaded image, progresses through Vocabulary → Grammar → Sentence Construction phases, and decides autonomously when to end the session based on session context memory.

---

## Architecture

### Agent Structure

**Main agent** acts as orchestrator and conversation handler. Calls two subagents:

```
[User uploads image]
        ↓
Main agent calls → image_analyzer subagent
        ↓ (writes structured context to /session/image_context.md)
Main agent runs adaptive conversation loop:
  ┌──────────────────────────────────┐
  │  Phase 1: VOCABULARY             │
  │  Phase 2: GRAMMAR                │  ← flexible sequential, can backtrack
  │  Phase 3: SENTENCE CONSTRUCTION  │
  └──────────────────────────────────┘
        ↓ (agent decides to end based on session context memory)
Main agent calls → evaluator subagent
        ↓
Child-friendly feedback + ⭐ rating → returned to frontend
```

### Subagents

**`image_analyzer`**
- Called once at session start
- Analyzes the image and writes `/session/image_context.md` containing:
  - Key vocabulary (nouns, adjectives, verbs visible in the image)
  - Scene description
  - Suggested grammar topics appropriate for grade 9 and below
- Prompt: `IMAGE_ANALYZER_PROMPT`

**`evaluator`**
- Called once at session end
- Reads `/session/qa_log.md`
- Returns simplified child-friendly feedback in 3 sections + star rating
- Prompt: `EVALUATOR_PROMPT` (simplified)

### Main Agent Responsibilities

1. Orchestrate subagent calls (image_analyzer at start, evaluator at end)
2. Manage the 3-phase adaptive conversation loop
3. Track and update phase state in `/session/phase_state.md`
4. Append each Q&A turn to `/session/qa_log.md`
5. Provide brief feedback (1-2 sentences) after each student answer
6. **Answer student questions** — if the student asks a question (e.g., "what does this word mean?"), answer it naturally then resume the lesson flow
7. Decide when to transition between phases based on holistic assessment
8. Decide when to end the session based on session context memory

---

## Virtual Filesystem (per session)

| File | Written by | Purpose |
|------|-----------|---------|
| `/session/image_context.md` | `image_analyzer` | Vocabulary, scene, grammar topics |
| `/session/qa_log.md` | Main agent | Full Q&A history, appended each turn |
| `/session/phase_state.md` | Main agent | Current phase, notes on student progress |

---

## Conversation Phases

### Phase 1 — Vocabulary

- Agent selects 3–5 key vocabulary items from `image_context.md`
- Asks about meaning, usage, and similar examples related to the image
- After each answer: brief praise or correction in English; error explanations in Vietnamese
- Transitions to Phase 2 when agent holistically judges student has grasped the core vocabulary

### Phase 2 — Grammar

- Agent introduces 1–2 grammar structures relevant to the image content (e.g., present continuous, there is/are, comparatives)
- Asks student to recognize or produce the structure in context
- If student asks a grammar question → answer it, then continue
- **Backtracks to Phase 1** if errors indicate vocabulary gaps, not grammar gaps
- Transitions to Phase 3 when agent holistically judges student understands the structure well enough to use it

### Phase 3 — Sentence Construction

- Agent prompts student to form sentences using vocabulary and grammar learned
- Each turn: agent suggests a topic/prompt (does not write the sentence for them)
- Correct sentences: praise + prompt for extension
- Incorrect sentences: specific correction + retry
- Phase 3 is the primary signal for the end decision

---

## Ending Decision

After every turn, before calling `ask_user`, the main agent reads `/session/qa_log.md` and `/session/phase_state.md` and reasons:

> "Looking at the full conversation so far — has the student demonstrated sufficient learning? Have the key aspects of the image been covered across all phases? Should I continue or wrap up?"

The agent chooses one of:
- **Continue** → call `ask_user` with the next question (or answer the student's question first)
- **End** → do NOT call `ask_user`; call `evaluator` subagent instead

The student may also end the session naturally — the agent recognizes goodbye intent from natural language ("thôi", "bye", "xong rồi", "em mệt", "done", etc.) through language understanding, not keyword matching.

---

## Language Policy

| Content | Language |
|---------|----------|
| Questions to student | English |
| Praise / encouragement | English |
| Error explanations | Vietnamese |
| Grammar explanations (when student asks) | Vietnamese |
| Final evaluation feedback | Vietnamese |

---

## Evaluation Format (evaluator subagent)

Simple, child-friendly, 3 sections + star rating:

```
⭐⭐⭐⭐ (4/5 sao)

📝 Từ vựng
[1-2 câu nhận xét, thân thiện]

📖 Ngữ pháp
[1-2 câu nhận xét, thân thiện]

✍️ Đặt câu
[1-2 câu nhận xét, thân thiện]

💪 [Lời động viên ngắn và gợi ý luyện tập tiếp theo]
```

Rating scale: 1–5 stars, based on overall performance across all 3 phases.

---

## Code Changes Required

### `agent/state.py`
- Remove `total: int = 5`
- Add `phase: str = "vocabulary"` to track current phase

### `agent/graph.py`
- Add `image_analyzer_subagent` definition with `IMAGE_ANALYZER_PROMPT` and `IMAGE_ANALYZER_SKILLS_PATH`
- Add to `subagents` list alongside existing `evaluator_subagent`

### `agent/skills.py`
- Add `IMAGE_ANALYZER_SKILLS_PATH` constant pointing to `image-analysis/SKILL.md`
- Include in `load_all_skill_files()` so it's passed to the subagent on each `POST /sessions`

### `agent/prompts.py`
- Add `IMAGE_ANALYZER_PROMPT`: instructs subagent to analyze image and write structured context
- Replace `SYSTEM_PROMPT`: remove 5-question fixed flow; implement 3-phase adaptive loop with context-memory-based ending decision and student Q&A handling
- Update `EVALUATOR_PROMPT`: simplified 3-section format + star rating for young learners

### `api/sessions.py`
- Remove hardcoded `total=5` from `SessionResponse` construction
- `total` field becomes `null` or omitted (dynamic session length)

### `backend/skills/`
- Add `image-analysis/SKILL.md`: instructs `image_analyzer` subagent on how to extract vocabulary, describe scene, and suggest grammar topics appropriate for grade 9 and below — defines the exact output format written to `/session/image_context.md`
- Replace `image-question-generation/SKILL.md` with `adaptive-conversation/SKILL.md`: 3-phase guidance, holistic phase transition criteria, ending decision guidance
- Update `english-evaluation/SKILL.md`: simplified rubric for young learners, star rating instructions

---

## What Does NOT Change

- `ask_user` tool and interrupt mechanism — unchanged
- SSE streaming endpoints — unchanged
- `session_store.py` and SQLite persistence — unchanged
- LangGraph checkpointer setup — unchanged
- Frontend components and API contract — `done`/`question`/`delta` event types unchanged; only `total` becomes dynamic
