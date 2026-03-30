# Autonomous Structural Intelligence System

## Overview

An AI-powered structural analysis platform that processes 2D floor plan images using computer vision, generates interactive 3D models, recommends construction materials using a cost-vs-strength scoring formula, and stores tamper-proof report hashes on the Stellar blockchain.

## Stack

- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS
- **3D Rendering**: Three.js, @react-three/fiber, @react-three/drei
- **Python Backend**: FastAPI + Uvicorn (port 8000)
- **Computer Vision**: OpenCV (opencv-python-headless)
- **Material AI**: GPT-4o-mini via Replit AI Integrations (no API key needed)
- **Blockchain**: Stellar SDK (testnet)
- **Database**: SQLite (Python sqlite3)
- **API Proxy**: Express 5 + native http proxy
- **Monorepo**: pnpm workspaces + TypeScript
- **API Contract**: OpenAPI 3.1 + Orval codegen

## Structure

```
artifacts/
├── structural-ai/              # React frontend (port 24913, preview at /)
│   └── src/
│       ├── components/3d/      # Three.js 3D floor plan viewer
│       ├── components/ui/      # Upload, material cards, blockchain badge
│       ├── pages/              # Dashboard, Reports, ReportDetail
│       └── App.tsx
│
├── structural-ai-backend/      # Python FastAPI backend (port 8000)
│   ├── main.py                 # Entry point, DB init
│   ├── requirements.txt
│   └── app/
│       ├── routes/analysis.py  # POST /api/analyze
│       ├── routes/reports.py   # GET /api/reports, /reports/{id}
│       ├── services/floor_plan_analyzer.py   # OpenCV detection
│       ├── services/material_recommender.py  # Cost/strength scoring
│       ├── services/stellar_blockchain.py    # Blockchain hashing
│       └── database.py         # SQLite persistence
│
└── api-server/                 # Express proxy (port 8080, paths: /api)
    └── src/app.ts              # Proxies /api/analyze, /api/reports → Python

lib/
├── api-spec/openapi.yaml       # OpenAPI contract
├── api-client-react/           # Generated React Query hooks
└── api-zod/                    # Generated Zod schemas
```

## Workflows

- `artifacts/structural-ai: web` — Vite dev server for React frontend
- `artifacts/api-server: API Server` — Express proxy server on port 8080
- `Python AI Backend` — FastAPI backend on port 8000 (auto-reload enabled)

## API Routing

- All traffic goes through the Replit proxy at port 80
- `/api/*` → Express API server (port 8080)
- Express proxies `/api/analyze` and `/api/reports` → Python FastAPI (port 8000)
- `/api/healthz` is handled by Express directly

## Material Scoring Formula

```
Score = 0.35 × Strength + 0.30 × (1-NormCost) × BudgetMultiplier + 0.20 × Durability + 0.15 × ClimateFit
```

Budget multipliers: low=1.5×, medium=1.0×, high=0.6×

## Key Commands

```bash
# Run codegen after OpenAPI changes
pnpm --filter @workspace/api-spec run codegen

# Install Python packages
# Use the installLanguagePackages callback with language: "python"

# Start Python backend manually
cd artifacts/structural-ai-backend && python main.py
```

## Environment Variables

- `STELLAR_NETWORK` — `testnet` (default) or `mainnet`
- `AI_INTEGRATIONS_OPENAI_BASE_URL` — Auto-set by Replit AI Integrations (do not modify)
- `AI_INTEGRATIONS_OPENAI_API_KEY` — Auto-set by Replit AI Integrations (do not modify)
- `DATABASE_URL` — Not needed (uses SQLite in artifacts/structural-ai-backend/)
