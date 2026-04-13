# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

English learning app where students upload an image and an AI agent asks 5 progressively-harder English questions about it, then evaluates their answers. Built with a FastAPI backend (LangGraph agent via `deepagents`) and a React/TypeScript frontend.

## Commands

### Backend

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Run the dev server
uvicorn main:app --reload

# Run all tests
pytest

# Run a single test file
pytest tests/test_graph.py

# Run a single test by name
pytest tests/test_nodes.py::test_foo
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run dev server (proxies to backend at localhost:8000)
npm run dev

# Run tests
npm test

# Run a single test file
npm test -- src/components/ChatScreen.test.tsx

# Type-check only (no build output)
npx tsc --noEmit

# Type-check + production build
npm run build
```

## Environment Variables

Create `backend/.env`:
```
OPENAI_API_KEY=sk-...
CORS_ALLOW_ORIGINS=http://localhost:5173   # optional, default
APP_SQLITE_PATH=                            # optional override for DB path
```

`main.py` calls `load_dotenv()` at boot, so `.env` is only sourced when the server starts — not by `pytest` directly (the test conftest sets keys explicitly). Set `USE_MEMORY_CHECKPOINTER=1` to skip SQLite init (used automatically in tests via `conftest.py`).

## Architecture

### Backend (`backend/`)

- **`main.py`** — FastAPI app with lifespan that opens/closes the async SQLite checkpointer.
- **`agent/graph.py`** — Builds and holds the LangGraph agent singleton (`get_agent()`). Uses `deepagents.create_deep_agent` with GPT-4o, an `ask_user` interrupt tool, and an `evaluator` subagent.
- **`agent/prompts.py`** — System prompts for both the main agent and evaluator subagent.
- **`agent/tools.py`** — Defines `ask_user`, which calls `langgraph.types.interrupt()` to pause execution and surface a question to the API layer.
- **`agent/skills.py`** — Defines `load_all_skill_files()` and the virtual path constants `MAIN_SKILLS_PATH`/`EVALUATOR_SKILLS_PATH`; called by `api/sessions.py` on each `POST /sessions`.
- **`agent/storage.py`** — Resolves the shared SQLite path (`data/app.sqlite`), overridable via `APP_SQLITE_PATH`.
- **`api/sessions.py`** — REST + SSE endpoints: `POST /sessions` (upload image, starts agent), `POST /sessions/{id}/answer` (resumes agent), `POST /sessions/{id}/answer/stream` (SSE token streaming).
- **`api/session_store.py`** — Persists `SessionInfo` (step, thread_id, questions) in an `api_sessions` SQLite table; separate sync connection from the async LangGraph checkpointer. `SessionInfo` is defined in `agent/state.py`.

### Agent Flow

1. `POST /sessions` invokes the agent with the image; the agent is prompted to plan 5 questions and write them to `/session/questions.md` (virtual FS), then calls `ask_user` which triggers an `interrupt()`.
2. Each `POST /sessions/{id}/answer` resumes with `Command(resume=answer)`. Agent writes Q&A to `/session/qa_log.md`, then either calls `ask_user` again (next question) or delegates to the `evaluator` subagent (after question 5).
3. The evaluator reads `/session/qa_log.md` via the virtual FS and returns structured teacher feedback.
4. Both LangGraph checkpoints and API session metadata share `data/app.sqlite`.

### Frontend (`frontend/src/`)

- **`App.tsx`** — Central reducer managing three screens: `upload → chat → evaluation`.
- **`api.ts`** — `createSession` (multipart POST), `streamSubmitAnswer` (SSE stream consuming `delta`/`question`/`done`/`error` events).
- **`types.ts`** — Shared TypeScript types.
- **`components/`** — Screen-level: `UploadScreen`, `ChatScreen`, `EvaluationScreen`. Sub-components: `ImageDropzone`, `MessageList`, `MessageBubble`, `AnswerInput`, `ProgressIndicator`, `FeedbackCard`.

### Skills (`backend/skills/`)

- `image-question-generation/SKILL.md` — Taxonomy and sequencing guidance for generating questions (description → vocabulary → reasoning).
- `english-evaluation/SKILL.md` — Rubric and ESL error patterns for the evaluator subagent.

Skills are loaded on every `POST /sessions` and placed at virtual paths `/skills/main/image-question-generation/SKILL.md` and `/skills/evaluator/english-evaluation/SKILL.md` so the agent can `read_file` them.

## Testing

Tests use `USE_MEMORY_CHECKPOINTER=1` (set in `conftest.py`) and an isolated SQLite file per test via `tmp_path`. The `client` fixture uses FastAPI's `TestClient`. No real OpenAI calls are made — tests mock the agent via `unittest.mock`.
