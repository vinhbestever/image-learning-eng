# English Learning Image Q&A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web app where users upload an image, answer 5 GPT-4o-generated English questions about it, and receive conversational teacher-style feedback.

**Architecture:** React (Vite + TypeScript) frontend calls a FastAPI backend that drives a custom LangGraph `StateGraph` — using LangGraph's `interrupt()` for human-in-the-loop Q&A and `MemorySaver` for session persistence.

**Tech Stack:** Python 3.11+, FastAPI, LangGraph, LangChain OpenAI, React 18, TypeScript 5, Vite 5, Vitest, React Testing Library.

---

## File Structure

### Backend (`backend/`)

```
backend/
├── main.py                     # FastAPI app, CORS, router registration
├── store.py                    # Session registry: thread_id → config mapping
├── agent/
│   ├── __init__.py
│   ├── state.py                # SessionState TypedDict
│   ├── prompts.py              # System prompts for GPT-4o
│   ├── nodes.py                # analyze_image, evaluate node functions
│   └── graph.py                # LangGraph StateGraph + build_graph()
├── api/
│   ├── __init__.py
│   ├── models.py               # Pydantic request/response schemas
│   └── sessions.py             # FastAPI router: /sessions endpoints
├── .env                        # OPENAI_API_KEY (not committed)
├── .env.example
├── requirements.txt
└── tests/
    ├── conftest.py             # Shared fixtures
    ├── test_nodes.py           # Unit tests for agent nodes
    ├── test_graph.py           # Integration tests for LangGraph graph
    └── test_sessions_api.py    # HTTP endpoint tests
```

### Frontend (`frontend/`)

```
frontend/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html
└── src/
    ├── main.tsx                # React entry point
    ├── App.tsx                 # Root: AppState reducer + screen routing
    ├── types.ts                # Shared TypeScript types
    ├── api.ts                  # fetch wrappers for backend endpoints
    └── components/
        ├── UploadScreen.tsx    # Screen 1: image upload + start
        ├── ImageDropzone.tsx   # Drag-and-drop file picker
        ├── ChatScreen.tsx      # Screen 2: Q&A conversation
        ├── ImageThumbnail.tsx  # Fixed image preview
        ├── ProgressIndicator.tsx  # "Question X / 5"
        ├── MessageList.tsx     # Scrollable message history
        ├── MessageBubble.tsx   # Single agent/user message
        ├── AnswerInput.tsx     # Text input + submit button
        ├── EvaluationScreen.tsx  # Screen 3: teacher feedback
        └── FeedbackCard.tsx    # Feedback text + retry button
```

---

## Task 1: Backend Scaffold

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/.env.example`
- Create: `backend/main.py`
- Create: `backend/tests/conftest.py`

- [ ] **Step 1: Create `backend/requirements.txt`**

```
fastapi==0.111.0
uvicorn[standard]==0.29.0
python-multipart==0.0.9
langgraph==0.1.19
langchain-openai==0.1.8
langchain-core==0.2.5
pydantic==2.7.1
python-dotenv==1.0.1
pytest==8.2.1
pytest-asyncio==0.23.7
httpx==0.27.0
```

- [ ] **Step 2: Create `backend/.env.example`**

```
OPENAI_API_KEY=sk-...
```

- [ ] **Step 3: Create `.env` from example and fill in your key**

```bash
cp backend/.env.example backend/.env
# Edit backend/.env and set OPENAI_API_KEY=your_actual_key
```

- [ ] **Step 4: Install backend dependencies**

```bash
cd backend && pip install -r requirements.txt
```

Expected: All packages install without error.

- [ ] **Step 5: Write the failing health check test**

Create `backend/tests/conftest.py`:

```python
import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch


@pytest.fixture
def client():
    from main import app
    return TestClient(app)
```

Create `backend/tests/test_sessions_api.py` (just the health check for now):

```python
def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

- [ ] **Step 6: Run test to verify it fails**

```bash
cd backend && python -m pytest tests/test_sessions_api.py::test_health -v
```

Expected: `FAILED` — `ModuleNotFoundError: No module named 'main'` or `ImportError`.

- [ ] **Step 7: Create `backend/main.py`**

```python
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()


app = FastAPI(title="English Learning Image Q&A")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 8: Run test to verify it passes**

```bash
cd backend && python -m pytest tests/test_sessions_api.py::test_health -v
```

Expected: `PASSED`.

- [ ] **Step 9: Commit**

```bash
git add backend/
git commit -m "feat: backend scaffold with FastAPI health check"
```

---

## Task 2: SessionState and Prompts

**Files:**
- Create: `backend/agent/__init__.py`
- Create: `backend/agent/state.py`
- Create: `backend/agent/prompts.py`

- [ ] **Step 1: Write the failing state test**

Create `backend/tests/test_nodes.py`:

```python
from agent.state import SessionState


def test_session_state_keys():
    state: SessionState = {
        "image_b64": "abc",
        "questions": [],
        "answers": [],
        "current_step": 0,
        "evaluation": "",
    }
    assert state["image_b64"] == "abc"
    assert state["questions"] == []
    assert state["current_step"] == 0
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && python -m pytest tests/test_nodes.py::test_session_state_keys -v
```

Expected: `FAILED` — `ModuleNotFoundError: No module named 'agent'`.

- [ ] **Step 3: Create `backend/agent/__init__.py`**

```python
```
(empty file)

- [ ] **Step 4: Create `backend/agent/state.py`**

```python
from typing import Annotated
from typing_extensions import TypedDict
import operator


class SessionState(TypedDict):
    image_b64: str
    questions: list[str]
    answers: Annotated[list[str], operator.add]
    current_step: int
    evaluation: str
```

- [ ] **Step 5: Create `backend/agent/prompts.py`**

```python
GENERATE_QUESTIONS_PROMPT = """Look at this image carefully and generate exactly 5 English questions for a language learner to answer.

Mix the question types:
- 2 description questions (e.g. "What do you see in the foreground?", "Describe the scene.")
- 1 vocabulary question (e.g. "What word best describes the mood/texture/color of X?")
- 2 reasoning questions (e.g. "What do you think is happening here?", "Why might the person be doing this?")

Output ONLY the 5 questions, one per line, numbered 1-5. No extra commentary."""


EVALUATE_PROMPT = """You are a warm and encouraging English language teacher. A student has just answered 5 questions about an image in English.

Here are their questions and answers:

{qa_pairs}

Please give them conversational, teacher-style feedback on their English. Cover:
- Grammar correctness (give specific corrections if needed, with examples)
- Vocabulary appropriateness
- Fluency and naturalness of expression
- How accurately they described what was in the image

Be encouraging and specific. Do NOT give a numeric score. Write as if speaking directly to the student."""
```

- [ ] **Step 6: Run test to verify it passes**

```bash
cd backend && python -m pytest tests/test_nodes.py::test_session_state_keys -v
```

Expected: `PASSED`.

- [ ] **Step 7: Commit**

```bash
git add backend/agent/
git commit -m "feat: add SessionState TypedDict and LLM prompts"
```

---

## Task 3: Agent Nodes

**Files:**
- Create: `backend/agent/nodes.py`
- Modify: `backend/tests/test_nodes.py`

- [ ] **Step 1: Write the failing tests for `analyze_image`**

Append to `backend/tests/test_nodes.py`:

```python
from unittest.mock import MagicMock, patch
from langchain_core.messages import AIMessage
from agent.state import SessionState


def make_state(**kwargs) -> SessionState:
    base: SessionState = {
        "image_b64": "ZmFrZQ==",
        "questions": [],
        "answers": [],
        "current_step": 0,
        "evaluation": "",
    }
    base.update(kwargs)
    return base


def test_analyze_image_returns_five_questions():
    mock_response = AIMessage(
        content="1. What do you see?\n2. Describe the colors.\n3. What is the mood?\n4. What word describes this?\n5. Why is this happening?"
    )
    with patch("agent.nodes.llm") as mock_llm:
        mock_llm.invoke.return_value = mock_response
        from agent.nodes import analyze_image
        result = analyze_image(make_state())

    assert len(result["questions"]) == 5
    assert result["current_step"] == 0
    assert result["answers"] == []


def test_analyze_image_pads_to_five_if_short():
    mock_response = AIMessage(content="1. Only one question")
    with patch("agent.nodes.llm") as mock_llm:
        mock_llm.invoke.return_value = mock_response
        from agent.nodes import analyze_image
        result = analyze_image(make_state())

    assert len(result["questions"]) == 5


def test_evaluate_returns_feedback_string():
    mock_response = AIMessage(content="Great effort! Your grammar was mostly correct...")
    with patch("agent.nodes.llm") as mock_llm:
        mock_llm.invoke.return_value = mock_response
        from agent.nodes import evaluate
        state = make_state(
            questions=["Q1", "Q2", "Q3", "Q4", "Q5"],
            answers=["A1", "A2", "A3", "A4", "A5"],
            current_step=5,
        )
        result = evaluate(state)

    assert "evaluation" in result
    assert "Great effort" in result["evaluation"]
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && python -m pytest tests/test_nodes.py -v -k "analyze_image or evaluate"
```

Expected: `FAILED` — `ModuleNotFoundError: No module named 'agent.nodes'`.

- [ ] **Step 3: Create `backend/agent/nodes.py`**

```python
import os
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from .state import SessionState
from .prompts import GENERATE_QUESTIONS_PROMPT, EVALUATE_PROMPT

llm = ChatOpenAI(model="gpt-4o", temperature=0.7)

_FALLBACK_QUESTION = "Can you describe something else you notice in this image?"


def analyze_image(state: SessionState) -> dict:
    """Call GPT-4o vision to generate 5 mixed English questions from the image."""
    message = HumanMessage(content=[
        {
            "type": "image_url",
            "image_url": {"url": f"data:image/jpeg;base64,{state['image_b64']}"},
        },
        {"type": "text", "text": GENERATE_QUESTIONS_PROMPT},
    ])
    response = llm.invoke([message])
    raw_lines = [line.strip() for line in response.content.strip().split("\n") if line.strip()]
    # Strip leading numbering like "1. ", "1) ", etc.
    questions = []
    for line in raw_lines[:5]:
        if len(line) > 2 and line[0].isdigit() and line[1] in ".):":
            line = line[2:].strip()
        questions.append(line)
    # Pad to exactly 5 if LLM returns fewer
    while len(questions) < 5:
        questions.append(_FALLBACK_QUESTION)
    return {"questions": questions, "current_step": 0, "answers": []}


def evaluate(state: SessionState) -> dict:
    """Call GPT-4o to generate conversational teacher-style feedback on all 5 answers."""
    qa_pairs = "\n".join(
        f"Q{i + 1}: {q}\nA{i + 1}: {a}"
        for i, (q, a) in enumerate(zip(state["questions"], state["answers"]))
    )
    message = HumanMessage(content=[
        {
            "type": "image_url",
            "image_url": {"url": f"data:image/jpeg;base64,{state['image_b64']}"},
        },
        {"type": "text", "text": EVALUATE_PROMPT.format(qa_pairs=qa_pairs)},
    ])
    response = llm.invoke([message])
    return {"evaluation": response.content}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && python -m pytest tests/test_nodes.py -v -k "analyze_image or evaluate"
```

Expected: All 3 tests `PASSED`.

- [ ] **Step 5: Commit**

```bash
git add backend/agent/nodes.py backend/tests/test_nodes.py
git commit -m "feat: add analyze_image and evaluate agent nodes"
```

---

## Task 4: LangGraph Graph

**Files:**
- Create: `backend/agent/graph.py`
- Create: `backend/tests/test_graph.py`

- [ ] **Step 1: Write the failing graph tests**

Create `backend/tests/test_graph.py`:

```python
import pytest
from unittest.mock import patch, MagicMock
from langchain_core.messages import AIMessage
from langgraph.types import Command


FIVE_QUESTIONS = "1. Q1\n2. Q2\n3. Q3\n4. Q4\n5. Q5"
FEEDBACK = "Great job! Your English was very descriptive."


def make_initial_state(image_b64: str = "ZmFrZQ==") -> dict:
    return {
        "image_b64": image_b64,
        "questions": [],
        "answers": [],
        "current_step": 0,
        "evaluation": "",
    }


def test_graph_compiles():
    from agent.graph import build_graph
    g = build_graph()
    assert g is not None


def test_graph_interrupts_after_analyze(monkeypatch):
    """Graph should pause at first ask_question after analyzing image."""
    with patch("agent.nodes.llm") as mock_llm:
        mock_llm.invoke.return_value = AIMessage(content=FIVE_QUESTIONS)

        from agent.graph import build_graph
        g = build_graph()
        config = {"configurable": {"thread_id": "test-interrupt-1"}}

        g.invoke(make_initial_state(), config=config)

        state = g.get_state(config)
        assert len(state.values["questions"]) == 5
        assert state.values["current_step"] == 0
        assert state.next  # Graph is still waiting


def test_full_session_flow(monkeypatch):
    """Full flow: analyze → 5 Q&A cycles → evaluate → done."""
    with patch("agent.nodes.llm") as mock_llm:
        mock_llm.invoke.side_effect = [
            AIMessage(content=FIVE_QUESTIONS),   # analyze_image
            AIMessage(content=FEEDBACK),          # evaluate
        ]

        from agent.graph import build_graph
        g = build_graph()
        config = {"configurable": {"thread_id": "test-full-1"}}

        g.invoke(make_initial_state(), config=config)

        for i in range(5):
            state = g.get_state(config)
            assert state.values["current_step"] == i
            g.invoke(Command(resume=f"My answer {i + 1}"), config=config)

        state = g.get_state(config)
        assert not state.next  # Graph completed
        assert state.values["evaluation"] == FEEDBACK
        assert len(state.values["answers"]) == 5
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && python -m pytest tests/test_graph.py -v
```

Expected: `FAILED` — `ModuleNotFoundError: No module named 'agent.graph'`.

- [ ] **Step 3: Create `backend/agent/graph.py`**

`interrupt()` is called inside `ask_question`: the graph pauses there, and the API reads `questions[current_step]` from state to return to the frontend. When the user answers, `Command(resume=answer)` resumes the graph, `interrupt()` returns the answer, and the node stores it.

```python
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import interrupt
from .state import SessionState
from .nodes import analyze_image, evaluate

_TOTAL_QUESTIONS = 5


def ask_question(state: SessionState) -> dict:
    """Pause execution via interrupt(); resume with Command(resume=answer)."""
    step = state["current_step"]
    question = state["questions"][step]
    answer = interrupt({"question": question, "step": step})
    return {
        "answers": [answer],   # operator.add annotation appends to list
        "current_step": step + 1,
    }


def should_continue(state: SessionState) -> str:
    if state["current_step"] >= _TOTAL_QUESTIONS:
        return "evaluate"
    return "ask_question"


def build_graph() -> StateGraph:
    builder = StateGraph(SessionState)
    builder.add_node("analyze_image", analyze_image)
    builder.add_node("ask_question", ask_question)
    builder.add_node("evaluate", evaluate)

    builder.set_entry_point("analyze_image")
    builder.add_edge("analyze_image", "ask_question")
    builder.add_conditional_edges(
        "ask_question",
        should_continue,
        {"ask_question": "ask_question", "evaluate": "evaluate"},
    )
    builder.add_edge("evaluate", END)

    memory = MemorySaver()
    return builder.compile(checkpointer=memory)


graph = build_graph()
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && python -m pytest tests/test_graph.py -v
```

Expected: All 3 tests `PASSED`.

- [ ] **Step 5: Commit**

```bash
git add backend/agent/graph.py backend/tests/test_graph.py
git commit -m "feat: LangGraph state machine with interrupt()-based Q&A"
```

---

## Task 5: Pydantic Models

**Files:**
- Create: `backend/api/__init__.py`
- Create: `backend/api/models.py`

- [ ] **Step 1: Create `backend/api/__init__.py`**

```python
```
(empty file)

- [ ] **Step 2: Create `backend/api/models.py`**

```python
from pydantic import BaseModel
from typing import Optional


class AnswerRequest(BaseModel):
    answer: str


class SessionResponse(BaseModel):
    session_id: str
    step: int
    total: int = 5
    question: Optional[str] = None
    evaluation: Optional[str] = None
    done: bool
```

- [ ] **Step 3: Commit**

```bash
git add backend/api/
git commit -m "feat: add Pydantic request/response models"
```

---

## Task 6: FastAPI Session Endpoints

**Files:**
- Create: `backend/api/sessions.py`
- Modify: `backend/main.py`
- Modify: `backend/tests/test_sessions_api.py`

- [ ] **Step 1: Write the failing endpoint tests**

Append to `backend/tests/test_sessions_api.py`:

```python
import io
import base64
from unittest.mock import patch, MagicMock
from langchain_core.messages import AIMessage
from langgraph.types import Command


FIVE_QUESTIONS_RESPONSE = AIMessage(
    content="1. What do you see?\n2. Describe the colors.\n3. What is the mood?\n4. What word fits?\n5. Why is this?"
)
FEEDBACK_RESPONSE = AIMessage(content="Well done! Your answers were descriptive.")


def make_fake_image() -> bytes:
    # 1x1 white JPEG — valid enough for multipart upload in tests
    return base64.b64decode(
        "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8U"
        "HRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAARC"
        "AABAAEDASIA2gABAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAU"
        "AQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k="
    )


def test_create_session(client):
    with patch("agent.nodes.llm") as mock_llm:
        mock_llm.invoke.return_value = FIVE_QUESTIONS_RESPONSE

        image_bytes = make_fake_image()
        response = client.post(
            "/sessions",
            files={"image": ("test.jpg", io.BytesIO(image_bytes), "image/jpeg")},
        )

    assert response.status_code == 200
    data = response.json()
    assert "session_id" in data
    assert data["step"] == 1
    assert data["total"] == 5
    assert data["done"] is False
    assert data["question"] is not None


def test_submit_answer_mid_session(client):
    with patch("agent.nodes.llm") as mock_llm:
        mock_llm.invoke.return_value = FIVE_QUESTIONS_RESPONSE

        image_bytes = make_fake_image()
        create_resp = client.post(
            "/sessions",
            files={"image": ("test.jpg", io.BytesIO(image_bytes), "image/jpeg")},
        )
        session_id = create_resp.json()["session_id"]

        answer_resp = client.post(
            f"/sessions/{session_id}/answer",
            json={"answer": "I see a white background."},
        )

    assert answer_resp.status_code == 200
    data = answer_resp.json()
    assert data["step"] == 2
    assert data["done"] is False
    assert data["question"] is not None


def test_submit_all_answers_returns_evaluation(client):
    with patch("agent.nodes.llm") as mock_llm:
        mock_llm.invoke.side_effect = [
            FIVE_QUESTIONS_RESPONSE,  # analyze_image
            FEEDBACK_RESPONSE,         # evaluate
        ]

        image_bytes = make_fake_image()
        create_resp = client.post(
            "/sessions",
            files={"image": ("test.jpg", io.BytesIO(image_bytes), "image/jpeg")},
        )
        session_id = create_resp.json()["session_id"]

        last_resp = None
        for i in range(5):
            last_resp = client.post(
                f"/sessions/{session_id}/answer",
                json={"answer": f"Answer {i + 1}"},
            )

    assert last_resp.status_code == 200
    data = last_resp.json()
    assert data["done"] is True
    assert data["evaluation"] == "Well done! Your answers were descriptive."
    assert data["question"] is None


def test_session_not_found(client):
    response = client.post(
        "/sessions/nonexistent-id/answer",
        json={"answer": "test"},
    )
    assert response.status_code == 404
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && python -m pytest tests/test_sessions_api.py -v -k "session"
```

Expected: `FAILED` — endpoints don't exist yet.

- [ ] **Step 3: Create `backend/api/sessions.py`**

```python
import base64
from uuid import uuid4
from fastapi import APIRouter, UploadFile, File, HTTPException
from langgraph.types import Command
from .models import AnswerRequest, SessionResponse
from agent.graph import graph

router = APIRouter(prefix="/sessions", tags=["sessions"])

# In-memory registry: session_id → LangGraph thread config
_sessions: dict[str, dict] = {}


@router.post("", response_model=SessionResponse)
async def create_session(image: UploadFile = File(...)):
    # Validate content type
    if image.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(status_code=400, detail="Unsupported image format. Use JPEG, PNG, or WebP.")

    image_bytes = await image.read()
    if len(image_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large. Maximum 5MB.")

    session_id = str(uuid4())
    config = {"configurable": {"thread_id": session_id}}
    _sessions[session_id] = config

    image_b64 = base64.b64encode(image_bytes).decode()
    initial_state = {
        "image_b64": image_b64,
        "questions": [],
        "answers": [],
        "current_step": 0,
        "evaluation": "",
    }

    # Run until first interrupt (after analyze_image, paused at ask_question)
    graph.invoke(initial_state, config=config)

    state = graph.get_state(config)
    step = state.values["current_step"]
    question = state.values["questions"][step]

    return SessionResponse(
        session_id=session_id,
        step=step + 1,
        total=5,
        question=question,
        done=False,
    )


@router.post("/{session_id}/answer", response_model=SessionResponse)
async def submit_answer(session_id: str, body: AnswerRequest):
    if session_id not in _sessions:
        raise HTTPException(status_code=404, detail="Session not found.")

    config = _sessions[session_id]

    # Resume the graph with the user's answer
    graph.invoke(Command(resume=body.answer), config=config)

    state = graph.get_state(config)

    if state.next:
        # Graph interrupted again — another question pending
        step = state.values["current_step"]
        question = state.values["questions"][step]
        return SessionResponse(
            session_id=session_id,
            step=step + 1,
            total=5,
            question=question,
            done=False,
        )
    else:
        # Graph completed — return evaluation
        del _sessions[session_id]
        return SessionResponse(
            session_id=session_id,
            step=5,
            total=5,
            evaluation=state.values["evaluation"],
            done=True,
        )
```

- [ ] **Step 4: Register router in `backend/main.py`**

```python
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from api.sessions import router as sessions_router

load_dotenv()

app = FastAPI(title="English Learning Image Q&A")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sessions_router)


@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 5: Run all backend tests**

```bash
cd backend && python -m pytest tests/ -v
```

Expected: All tests `PASSED`.

- [ ] **Step 6: Commit**

```bash
git add backend/api/sessions.py backend/main.py backend/tests/test_sessions_api.py
git commit -m "feat: add POST /sessions and POST /sessions/{id}/answer endpoints"
```

---

## Task 7: Frontend Scaffold

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`

- [ ] **Step 1: Create `frontend/package.json`**

```json
{
  "name": "english-learning-image-qa",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.2",
    "@testing-library/jest-dom": "^6.4.6",
    "jsdom": "^24.1.0",
    "typescript": "^5.5.3",
    "vite": "^5.3.4",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Create `frontend/vite.config.ts`**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
  },
  server: {
    proxy: {
      '/sessions': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
    },
  },
})
```

- [ ] **Step 3: Create `frontend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create `frontend/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Learn English with Images</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create `frontend/src/main.tsx`**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 6: Create `frontend/src/test-setup.ts`**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 7: Install frontend dependencies**

```bash
cd frontend && npm install
```

Expected: `node_modules` created, no errors.

- [ ] **Step 8: Commit**

```bash
git add frontend/
git commit -m "feat: frontend project scaffold (Vite + React + TypeScript + Vitest)"
```

---

## Task 8: TypeScript Types and API Client

**Files:**
- Create: `frontend/src/types.ts`
- Create: `frontend/src/api.ts`
- Create: `frontend/src/api.test.ts`

- [ ] **Step 1: Write failing API client tests**

Create `frontend/src/api.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSession, submitAnswer } from './api'

describe('createSession', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('POSTs to /sessions with FormData and returns SessionResponse', async () => {
    const mockResponse = {
      session_id: 'abc-123',
      step: 1,
      total: 5,
      question: 'What do you see?',
      done: false,
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    }))

    const file = new File(['fake'], 'test.jpg', { type: 'image/jpeg' })
    const result = await createSession(file)

    expect(fetch).toHaveBeenCalledWith('/sessions', expect.objectContaining({
      method: 'POST',
    }))
    expect(result.session_id).toBe('abc-123')
    expect(result.question).toBe('What do you see?')
  })

  it('throws on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ detail: 'Image too large' }),
    }))

    const file = new File(['fake'], 'test.jpg', { type: 'image/jpeg' })
    await expect(createSession(file)).rejects.toThrow('Image too large')
  })
})

describe('submitAnswer', () => {
  it('POSTs to /sessions/{id}/answer with answer body', async () => {
    const mockResponse = {
      session_id: 'abc-123',
      step: 2,
      total: 5,
      question: 'Next question?',
      done: false,
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    }))

    const result = await submitAnswer('abc-123', 'I see a dog.')

    expect(fetch).toHaveBeenCalledWith('/sessions/abc-123/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer: 'I see a dog.' }),
    })
    expect(result.step).toBe(2)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npm test
```

Expected: `FAILED` — `Cannot find module './api'`.

- [ ] **Step 3: Create `frontend/src/types.ts`**

```typescript
export interface SessionResponse {
  session_id: string
  step: number
  total: number
  question?: string
  evaluation?: string
  done: boolean
}

export interface Message {
  role: 'agent' | 'user'
  text: string
}

export type AppScreen = 'upload' | 'chat' | 'evaluation'

export type AppState =
  | { screen: 'upload' }
  | {
      screen: 'chat'
      sessionId: string
      step: number
      messages: Message[]
      currentQuestion: string
    }
  | { screen: 'evaluation'; evaluation: string }
```

- [ ] **Step 4: Create `frontend/src/api.ts`**

```typescript
import type { SessionResponse } from './types'

export async function createSession(image: File): Promise<SessionResponse> {
  const formData = new FormData()
  formData.append('image', image)

  const res = await fetch('/sessions', { method: 'POST', body: formData })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail ?? 'Failed to create session')
  return data as SessionResponse
}

export async function submitAnswer(
  sessionId: string,
  answer: string
): Promise<SessionResponse> {
  const res = await fetch(`/sessions/${sessionId}/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answer }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail ?? 'Failed to submit answer')
  return data as SessionResponse
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd frontend && npm test
```

Expected: All tests `PASSED`.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/types.ts frontend/src/api.ts frontend/src/api.test.ts
git commit -m "feat: TypeScript types and API client with tests"
```

---

## Task 9: UploadScreen Components

**Files:**
- Create: `frontend/src/components/ImageDropzone.tsx`
- Create: `frontend/src/components/UploadScreen.tsx`
- Create: `frontend/src/components/UploadScreen.test.tsx`

- [ ] **Step 1: Write failing UploadScreen tests**

Create `frontend/src/components/UploadScreen.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UploadScreen from './UploadScreen'

describe('UploadScreen', () => {
  it('renders upload prompt and disabled button', () => {
    render(<UploadScreen onSessionCreated={vi.fn()} />)
    expect(screen.getByText(/Learn English with Images/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Start Session/i })).toBeDisabled()
  })

  it('enables Start Session button after file is selected', async () => {
    render(<UploadScreen onSessionCreated={vi.fn()} />)
    const input = screen.getByTestId('file-input')
    const file = new File(['fake'], 'photo.jpg', { type: 'image/jpeg' })

    await userEvent.upload(input, file)

    expect(screen.getByRole('button', { name: /Start Session/i })).toBeEnabled()
  })

  it('calls onSessionCreated with session data on submit', async () => {
    const mockSession = {
      session_id: 'abc',
      step: 1,
      total: 5,
      question: 'What do you see?',
      done: false,
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockSession,
    }))

    const onSessionCreated = vi.fn()
    render(<UploadScreen onSessionCreated={onSessionCreated} />)

    const input = screen.getByTestId('file-input')
    const file = new File(['fake'], 'photo.jpg', { type: 'image/jpeg' })
    await userEvent.upload(input, file)
    await userEvent.click(screen.getByRole('button', { name: /Start Session/i }))

    expect(onSessionCreated).toHaveBeenCalledWith(mockSession, file)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npm test
```

Expected: `FAILED` — `Cannot find module './UploadScreen'`.

- [ ] **Step 3: Create `frontend/src/components/ImageDropzone.tsx`**

```tsx
import React, { useRef } from 'react'

interface Props {
  onFileSelected: (file: File) => void
  preview: string | null
}

export default function ImageDropzone({ onFileSelected, preview }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) onFileSelected(file)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onFileSelected(file)
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => inputRef.current?.click()}
      style={{
        border: '2px dashed #aaa',
        borderRadius: 8,
        padding: 32,
        textAlign: 'center',
        cursor: 'pointer',
        minHeight: 160,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {preview ? (
        <img src={preview} alt="Preview" style={{ maxHeight: 140, maxWidth: '100%', borderRadius: 4 }} />
      ) : (
        <p style={{ color: '#666' }}>Drag & drop an image here, or click to browse</p>
      )}
      <input
        data-testid="file-input"
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handleChange}
      />
    </div>
  )
}
```

- [ ] **Step 4: Create `frontend/src/components/UploadScreen.tsx`**

```tsx
import React, { useState } from 'react'
import ImageDropzone from './ImageDropzone'
import { createSession } from '../api'
import type { SessionResponse } from '../types'

interface Props {
  onSessionCreated: (session: SessionResponse, image: File) => void
}

export default function UploadScreen({ onSessionCreated }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelected = (selected: File) => {
    setFile(selected)
    setPreview(URL.createObjectURL(selected))
    setError(null)
  }

  const handleSubmit = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const session = await createSession(file)
      onSessionCreated(session, file)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: '80px auto', padding: 24 }}>
      <h1 style={{ textAlign: 'center', marginBottom: 24 }}>Learn English with Images</h1>
      <ImageDropzone onFileSelected={handleFileSelected} preview={preview} />
      {error && <p style={{ color: 'red', marginTop: 8 }}>{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={!file || loading}
        style={{
          marginTop: 16,
          width: '100%',
          padding: '12px 0',
          fontSize: 16,
          cursor: file && !loading ? 'pointer' : 'not-allowed',
        }}
      >
        {loading ? 'Analyzing image...' : 'Start Session'}
      </button>
    </div>
  )
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd frontend && npm test
```

Expected: All UploadScreen tests `PASSED`.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/
git commit -m "feat: UploadScreen and ImageDropzone components with tests"
```

---

## Task 10: ChatScreen Components

**Files:**
- Create: `frontend/src/components/ProgressIndicator.tsx`
- Create: `frontend/src/components/ImageThumbnail.tsx`
- Create: `frontend/src/components/MessageBubble.tsx`
- Create: `frontend/src/components/MessageList.tsx`
- Create: `frontend/src/components/AnswerInput.tsx`
- Create: `frontend/src/components/ChatScreen.tsx`
- Create: `frontend/src/components/ChatScreen.test.tsx`

- [ ] **Step 1: Write failing ChatScreen tests**

Create `frontend/src/components/ChatScreen.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ChatScreen from './ChatScreen'
import type { Message } from '../types'

const defaultProps = {
  sessionId: 'abc-123',
  step: 1,
  imagePreview: 'data:image/jpeg;base64,fake',
  messages: [{ role: 'agent' as const, text: 'What do you see?' }],
  onAnswerSubmitted: vi.fn(),
}

describe('ChatScreen', () => {
  it('renders progress indicator', () => {
    render(<ChatScreen {...defaultProps} />)
    expect(screen.getByText('Question 1 / 5')).toBeInTheDocument()
  })

  it('renders all messages', () => {
    const messages: Message[] = [
      { role: 'agent', text: 'What do you see?' },
      { role: 'user', text: 'I see a cat.' },
    ]
    render(<ChatScreen {...defaultProps} messages={messages} />)
    expect(screen.getByText('What do you see?')).toBeInTheDocument()
    expect(screen.getByText('I see a cat.')).toBeInTheDocument()
  })

  it('calls onAnswerSubmitted with typed answer on submit', async () => {
    const onAnswerSubmitted = vi.fn()
    render(<ChatScreen {...defaultProps} onAnswerSubmitted={onAnswerSubmitted} />)

    await userEvent.type(screen.getByRole('textbox'), 'I see a red bicycle.')
    await userEvent.click(screen.getByRole('button', { name: /Send/i }))

    expect(onAnswerSubmitted).toHaveBeenCalledWith('I see a red bicycle.')
  })

  it('clears input after submit', async () => {
    render(<ChatScreen {...defaultProps} />)
    const input = screen.getByRole('textbox')
    await userEvent.type(input, 'Some answer')
    await userEvent.click(screen.getByRole('button', { name: /Send/i }))
    expect(input).toHaveValue('')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npm test
```

Expected: `FAILED` — `Cannot find module './ChatScreen'`.

- [ ] **Step 3: Create `frontend/src/components/ProgressIndicator.tsx`**

```tsx
interface Props { step: number; total: number }

export default function ProgressIndicator({ step, total }: Props) {
  return (
    <div style={{ fontWeight: 600, color: '#444' }}>
      Question {step} / {total}
    </div>
  )
}
```

- [ ] **Step 4: Create `frontend/src/components/ImageThumbnail.tsx`**

```tsx
interface Props { src: string }

export default function ImageThumbnail({ src }: Props) {
  return (
    <img
      src={src}
      alt="Session image"
      style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 6 }}
    />
  )
}
```

- [ ] **Step 5: Create `frontend/src/components/MessageBubble.tsx`**

```tsx
import type { Message } from '../types'

interface Props { message: Message }

export default function MessageBubble({ message }: Props) {
  const isAgent = message.role === 'agent'
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isAgent ? 'flex-start' : 'flex-end',
        marginBottom: 8,
      }}
    >
      <div
        style={{
          maxWidth: '75%',
          padding: '10px 14px',
          borderRadius: 12,
          background: isAgent ? '#f0f0f0' : '#0078d4',
          color: isAgent ? '#111' : '#fff',
        }}
      >
        {message.text}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Create `frontend/src/components/MessageList.tsx`**

```tsx
import type { Message } from '../types'
import MessageBubble from './MessageBubble'

interface Props { messages: Message[] }

export default function MessageList({ messages }: Props) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
      {messages.map((msg, i) => (
        <MessageBubble key={i} message={msg} />
      ))}
    </div>
  )
}
```

- [ ] **Step 7: Create `frontend/src/components/AnswerInput.tsx`**

```tsx
import React, { useState } from 'react'

interface Props { onSubmit: (answer: string) => void; disabled?: boolean }

export default function AnswerInput({ onSubmit, disabled }: Props) {
  const [value, setValue] = useState('')

  const handleSubmit = () => {
    if (!value.trim()) return
    onSubmit(value.trim())
    setValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() }
  }

  return (
    <div style={{ display: 'flex', gap: 8, padding: '12px 0' }}>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Type your answer..."
        style={{ flex: 1, padding: '10px 12px', borderRadius: 6, border: '1px solid #ccc', fontSize: 15 }}
      />
      <button onClick={handleSubmit} disabled={disabled || !value.trim()} style={{ padding: '10px 20px' }}>
        Send
      </button>
    </div>
  )
}
```

- [ ] **Step 8: Create `frontend/src/components/ChatScreen.tsx`**

```tsx
import ImageThumbnail from './ImageThumbnail'
import ProgressIndicator from './ProgressIndicator'
import MessageList from './MessageList'
import AnswerInput from './AnswerInput'
import type { Message } from '../types'

interface Props {
  sessionId: string
  step: number
  imagePreview: string
  messages: Message[]
  onAnswerSubmitted: (answer: string) => void
  submitting?: boolean
}

export default function ChatScreen({
  step, imagePreview, messages, onAnswerSubmitted, submitting
}: Props) {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: 16, display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 12, borderBottom: '1px solid #eee' }}>
        <ImageThumbnail src={imagePreview} />
        <ProgressIndicator step={step} total={5} />
      </div>
      <MessageList messages={messages} />
      <AnswerInput onSubmit={onAnswerSubmitted} disabled={submitting} />
    </div>
  )
}
```

- [ ] **Step 9: Run tests to verify they pass**

```bash
cd frontend && npm test
```

Expected: All ChatScreen tests `PASSED`.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/components/
git commit -m "feat: ChatScreen and sub-components with tests"
```

---

## Task 11: EvaluationScreen Component

**Files:**
- Create: `frontend/src/components/FeedbackCard.tsx`
- Create: `frontend/src/components/EvaluationScreen.tsx`
- Create: `frontend/src/components/EvaluationScreen.test.tsx`

- [ ] **Step 1: Write failing EvaluationScreen tests**

Create `frontend/src/components/EvaluationScreen.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EvaluationScreen from './EvaluationScreen'

describe('EvaluationScreen', () => {
  it('renders evaluation feedback text', () => {
    render(<EvaluationScreen evaluation="Great job!" onRetry={vi.fn()} />)
    expect(screen.getByText('Great job!')).toBeInTheDocument()
  })

  it('calls onRetry when button is clicked', async () => {
    const onRetry = vi.fn()
    render(<EvaluationScreen evaluation="Well done!" onRetry={onRetry} />)
    await userEvent.click(screen.getByRole('button', { name: /Try another image/i }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npm test
```

Expected: `FAILED` — `Cannot find module './EvaluationScreen'`.

- [ ] **Step 3: Create `frontend/src/components/FeedbackCard.tsx`**

```tsx
interface Props { evaluation: string; onRetry: () => void }

export default function FeedbackCard({ evaluation, onRetry }: Props) {
  return (
    <div style={{ background: '#f9f9f9', borderRadius: 10, padding: 24, lineHeight: 1.7 }}>
      <p style={{ whiteSpace: 'pre-wrap', marginBottom: 24 }}>{evaluation}</p>
      <button onClick={onRetry} style={{ padding: '10px 24px', fontSize: 15, cursor: 'pointer' }}>
        Try another image
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Create `frontend/src/components/EvaluationScreen.tsx`**

```tsx
import FeedbackCard from './FeedbackCard'

interface Props { evaluation: string; onRetry: () => void }

export default function EvaluationScreen({ evaluation, onRetry }: Props) {
  return (
    <div style={{ maxWidth: 560, margin: '60px auto', padding: 24 }}>
      <h2 style={{ marginBottom: 20 }}>Here's your feedback</h2>
      <FeedbackCard evaluation={evaluation} onRetry={onRetry} />
    </div>
  )
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd frontend && npm test
```

Expected: All EvaluationScreen tests `PASSED`.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/EvaluationScreen.tsx frontend/src/components/FeedbackCard.tsx frontend/src/components/EvaluationScreen.test.tsx
git commit -m "feat: EvaluationScreen and FeedbackCard with tests"
```

---

## Task 12: App.tsx Root State Machine

**Files:**
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/App.test.tsx`

- [ ] **Step 1: Write failing App tests**

Create `frontend/src/App.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

const SESSION_RESPONSE = {
  session_id: 'abc',
  step: 1,
  total: 5,
  question: 'What do you see?',
  done: false,
}

const ANSWER_RESPONSE = {
  session_id: 'abc',
  step: 2,
  total: 5,
  question: 'Describe the colors.',
  done: false,
}

const EVAL_RESPONSE = {
  session_id: 'abc',
  step: 5,
  total: 5,
  evaluation: 'Great effort!',
  done: true,
}

describe('App', () => {
  it('starts on upload screen', () => {
    render(<App />)
    expect(screen.getByText(/Learn English with Images/i)).toBeInTheDocument()
  })

  it('moves to chat screen after session created', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => SESSION_RESPONSE,
    }))

    render(<App />)
    const input = screen.getByTestId('file-input')
    await userEvent.upload(input, new File(['fake'], 'img.jpg', { type: 'image/jpeg' }))
    await userEvent.click(screen.getByRole('button', { name: /Start Session/i }))

    expect(await screen.findByText('Question 1 / 5')).toBeInTheDocument()
    expect(screen.getByText('What do you see?')).toBeInTheDocument()
  })

  it('moves to evaluation screen after done:true response', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => SESSION_RESPONSE })
      .mockResolvedValue({ ok: true, json: async () => EVAL_RESPONSE })
    )

    render(<App />)
    await userEvent.upload(
      screen.getByTestId('file-input'),
      new File(['fake'], 'img.jpg', { type: 'image/jpeg' })
    )
    await userEvent.click(screen.getByRole('button', { name: /Start Session/i }))

    await screen.findByText('Question 1 / 5')
    await userEvent.type(screen.getByRole('textbox'), 'My answer')
    await userEvent.click(screen.getByRole('button', { name: /Send/i }))

    expect(await screen.findByText("Here's your feedback")).toBeInTheDocument()
    expect(screen.getByText('Great effort!')).toBeInTheDocument()
  })

  it('returns to upload screen on retry', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => SESSION_RESPONSE })
      .mockResolvedValue({ ok: true, json: async () => EVAL_RESPONSE })
    )

    render(<App />)
    await userEvent.upload(
      screen.getByTestId('file-input'),
      new File(['fake'], 'img.jpg', { type: 'image/jpeg' })
    )
    await userEvent.click(screen.getByRole('button', { name: /Start Session/i }))
    await screen.findByText('Question 1 / 5')
    await userEvent.type(screen.getByRole('textbox'), 'answer')
    await userEvent.click(screen.getByRole('button', { name: /Send/i }))
    await screen.findByText("Here's your feedback")

    await userEvent.click(screen.getByRole('button', { name: /Try another image/i }))
    expect(screen.getByText(/Learn English with Images/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npm test
```

Expected: `FAILED` — `Cannot find module './App'`.

- [ ] **Step 3: Update `AppState` in `frontend/src/types.ts` to include `imagePreview`**

`App.tsx` stores the image object URL in state so `ChatScreen` can display the thumbnail. Add it to the `chat` variant now so TypeScript is satisfied when `App.tsx` is created next:

```typescript
export type AppState =
  | { screen: 'upload' }
  | {
      screen: 'chat'
      sessionId: string
      step: number
      messages: Message[]
      currentQuestion: string
      imagePreview: string
    }
  | { screen: 'evaluation'; evaluation: string }
```

- [ ] **Step 4: Create `frontend/src/App.tsx`**

```tsx
import { useReducer } from 'react'
import UploadScreen from './components/UploadScreen'
import ChatScreen from './components/ChatScreen'
import EvaluationScreen from './components/EvaluationScreen'
import { submitAnswer } from './api'
import type { AppState, Message, SessionResponse } from './types'

type Action =
  | { type: 'SESSION_CREATED'; session: SessionResponse; imagePreview: string }
  | { type: 'ANSWER_SUBMITTED'; response: SessionResponse; userAnswer: string }
  | { type: 'RETRY' }

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SESSION_CREATED':
      return {
        screen: 'chat',
        sessionId: action.session.session_id,
        step: action.session.step,
        messages: [{ role: 'agent', text: action.session.question! }],
        currentQuestion: action.session.question!,
        imagePreview: action.imagePreview,
      }
    case 'ANSWER_SUBMITTED': {
      if (state.screen !== 'chat') return state
      const newMessages: Message[] = [
        ...state.messages,
        { role: 'user', text: action.userAnswer },
      ]
      if (action.response.done) {
        return { screen: 'evaluation', evaluation: action.response.evaluation! }
      }
      return {
        ...state,
        step: action.response.step,
        messages: [...newMessages, { role: 'agent', text: action.response.question! }],
        currentQuestion: action.response.question!,
      }
    }
    case 'RETRY':
      return { screen: 'upload' }
    default:
      return state
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, { screen: 'upload' })

  const handleSessionCreated = (session: SessionResponse, image: File) => {
    const imagePreview = URL.createObjectURL(image)
    dispatch({ type: 'SESSION_CREATED', session, imagePreview })
  }

  const handleAnswer = async (answer: string) => {
    if (state.screen !== 'chat') return
    const response = await submitAnswer(state.sessionId, answer)
    dispatch({ type: 'ANSWER_SUBMITTED', response, userAnswer: answer })
  }

  if (state.screen === 'upload') {
    return <UploadScreen onSessionCreated={handleSessionCreated} />
  }
  if (state.screen === 'chat') {
    return (
      <ChatScreen
        sessionId={state.sessionId}
        step={state.step}
        imagePreview={state.imagePreview}
        messages={state.messages}
        onAnswerSubmitted={handleAnswer}
      />
    )
  }
  return <EvaluationScreen evaluation={state.evaluation} onRetry={() => dispatch({ type: 'RETRY' })} />
}
```

- [ ] **Step 5: Run all frontend tests**

```bash
cd frontend && npm test
```

Expected: All tests `PASSED`.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/App.tsx frontend/src/App.test.tsx frontend/src/types.ts
git commit -m "feat: App root component with useReducer state machine and tests"
```

---

## Task 13: Run and Smoke Test

**Files:** None — manual verification.

- [ ] **Step 1: Start the backend**

```bash
cd backend && uvicorn main:app --reload --port 8000
```

Expected: `Application startup complete. Uvicorn running on http://127.0.0.1:8000`

- [ ] **Step 2: Verify backend health**

```bash
curl http://localhost:8000/health
```

Expected: `{"status":"ok"}`

- [ ] **Step 3: Start the frontend**

Open a new terminal:

```bash
cd frontend && npm run dev
```

Expected: `Local: http://localhost:5173/`

- [ ] **Step 4: Smoke test in browser**

1. Open `http://localhost:5173`
2. Upload a JPEG/PNG image
3. Click "Start Session"
4. Verify a question appears in the chat
5. Type an answer and press Enter or click Send
6. Verify the next question appears (progress shows "Question 2 / 5")
7. Answer all 5 questions
8. Verify teacher feedback appears on the evaluation screen
9. Click "Try another image" — verify the upload screen resets

- [ ] **Step 5: Run all tests one final time**

```bash
cd backend && python -m pytest tests/ -v
cd ../frontend && npm test
```

Expected: All tests `PASSED` in both.

- [ ] **Step 6: Final commit**

```bash
git add .
git commit -m "feat: complete English Learning Image Q&A POC

- Backend: FastAPI + LangGraph agent with GPT-4o vision
- Frontend: React + TypeScript chat interface
- Human-in-the-loop Q&A via LangGraph interrupt()
- Conversational teacher feedback after 5 answers"
```
