# Deployment Design: Vercel + Railway

**Date:** 2026-04-13

## Overview

Deploy the English learning app with:
- **Frontend** (React/Vite) → Vercel (static hosting, CDN)
- **Backend** (FastAPI/LangGraph) → Railway (Python service)
- **Database** (SQLite) → Railway persistent volume

Auto-deploy on push to `main` via GitHub integration on both platforms.

## Architecture

```
GitHub (main branch)
    ├── Vercel: detects frontend/ → npm run build → serves dist/
    └── Railway: detects backend/ → pip install → uvicorn start

Browser → https://your-app.vercel.app
    └── API calls → https://your-app.railway.app
                        └── FastAPI + LangGraph + SQLite
                                └── /app/data/app.sqlite (Railway volume)
```

## Code Changes

### 1. `frontend/src/api.ts`
Add `const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''` and prefix all fetch paths with `${API_BASE}`. Affected paths: `/sessions`, `/sessions/stream`, `/sessions/${id}/answer/stream`.

### 2. `backend/railway.toml` (new file)
```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "uvicorn main:app --host 0.0.0.0 --port $PORT"
healthcheckPath = "/health"
```

## Configuration

### Vercel (frontend)
- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API_BASE_URL=https://<railway-url>`

### Railway (backend)
- Root directory: `backend`
- Persistent volume mounted at `/app/data`
- Environment variables:
  - `OPENAI_API_KEY=sk-...`
  - `CORS_ALLOW_ORIGINS=https://<vercel-url>`
  - `APP_SQLITE_PATH=/app/data/app.sqlite`

## Post-Deploy Steps

After first deploy, both platforms assign URLs. Update:
1. Railway: set `CORS_ALLOW_ORIGINS` to the actual Vercel URL
2. Vercel: set `VITE_API_BASE_URL` to the actual Railway URL
3. Redeploy both to pick up the new env vars

## Out of Scope

- Custom domains
- PostgreSQL migration
- CI test runs before deploy
