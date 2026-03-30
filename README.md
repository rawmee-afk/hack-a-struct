# hack-a-struct

**Autonomous Structural Intelligence System**

Upload a 2D floor plan → OpenCV detects walls & rooms → Three.js renders interactive 3D model → deterministic formula scores 37 construction materials → SHA-256 hash anchored on Stellar blockchain testnet → reports persisted in SQLite.

## Features
- OpenCV wall/room detection with real-world m² area calculation
- 37-material scoring across 6 categories (Masonry, Concrete, Steel, Timber, Earth, Composite)
- Three.js interactive 3D rendering with PCFShadowMap
- Real Stellar blockchain (testnet) transaction per analysis
- SQLite report persistence
- Zero LLM/AI API calls — fully deterministic

## Stack
| Layer | Tech |
|---|---|
| Frontend | React + Vite + Three.js + TailwindCSS |
| Backend | Python FastAPI + OpenCV |
| API Gateway | Express (Node.js) |
| Blockchain | Stellar SDK (testnet) |
| Database | SQLite |

## Scoring Formula
```
Score = 0.35×Strength + 0.30×(1−Cost)×BudgetMult + 0.20×Durability + 0.15×ClimateFit − SpanPenalty
```