import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from agent import graph as graph_module
from api.sessions import router as sessions_router

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    if os.environ.get("USE_MEMORY_CHECKPOINTER") != "1":
        await graph_module.init_checkpointer()
    yield
    if os.environ.get("USE_MEMORY_CHECKPOINTER") != "1":
        await graph_module.shutdown_checkpointer()


app = FastAPI(title="English Learning Image Q&A", lifespan=lifespan)

_origins = os.environ.get("CORS_ALLOW_ORIGINS", "http://localhost:5173").strip()
_allow_origins = [o.strip() for o in _origins.split(",") if o.strip()]
if not _allow_origins:
    _allow_origins = ["http://localhost:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allow_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sessions_router)


@app.get("/health")
def health():
    return {"status": "ok"}
