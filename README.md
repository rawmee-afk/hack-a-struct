# hack-a-struct

Upload a floor plan. Get a full structural analysis, 3D model, material recommendations, and a blockchain-verified report — in under 5 seconds.

No LLM. No paid API. Everything runs deterministically.

---

## The problem

Construction teams make expensive material choices based on experience and guesswork. There's no fast, objective tool that looks at an actual floor plan and says: given this span, this budget, and this climate — here are your best 6 options with scores and tradeoffs.

This project tries to be that tool.

---

## What happens when you upload a floor plan

1. **OpenCV** scans the image for wall contours, classifies each as load-bearing or partition, and measures room polygons to get real-world m² areas
2. A **scoring formula** runs across 37 materials and ranks them based on your span length, budget tier (low/medium/high), and climate
3. The report gets **SHA-256 hashed** and submitted as a real transaction to the Stellar testnet — timestamp and hash are permanently on-chain
4. **Three.js** renders an interactive 3D model from the detected wall data
5. Everything is saved to **SQLite** so you can revisit past reports

---

## Scoring formula

```
Score = 0.35 × Strength
      + 0.30 × (1 − NormCost) × BudgetMultiplier
      + 0.20 × Durability
      + 0.15 × ClimateFit
      − SpanPenalty
```

- `BudgetMultiplier` — low budget boosts cost weight (1.5×), high budget reduces it (0.6×)
- `SpanPenalty` — if detected span > material's safe limit, deduct up to 40 pts proportionally
- `Durability` — service life normalised over 150 years

---

## Materials covered (37 total)

| Category | Count | Typical cost (₹/m²) |
|---|---|---|
| Masonry | 9 | 400 – 1,200 |
| Concrete | 9 | 800 – 2,500 |
| Steel | 4 | 2,000 – 5,000 |
| Timber | 4 | 600 – 1,800 |
| Earth | 4 | 400 – 900 |
| Composite | 7 | 1,500 – 4,500 |

The top 6 scoring materials are shown in the report with category badges, per-score breakdowns, pros/cons, and estimated cost per m².

---

## Blockchain anchoring

Every analysis produces a report hash. That hash gets written to Stellar as a `manage_data` operation — a built-in Stellar transaction type for storing small key-value payloads on-chain.

- Confirms in ~3 seconds
- Costs a fraction of a cent
- Permanently verifiable at `stellar.expert/explorer/testnet/tx/<txId>`

If the report data is changed after the fact, the SHA-256 won't match. That's the tamper-proof guarantee.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React + Vite + TypeScript + TailwindCSS |
| 3D rendering | Three.js + @react-three/fiber |
| Backend | Python 3.11 + FastAPI + OpenCV |
| API gateway | Node.js + Express |
| Blockchain | Stellar SDK (testnet) |
| Database | SQLite |

---

## Project layout

```
artifacts/
  structural-ai-backend/
    app/services/
      floor_plan_analyzer.py     ← OpenCV wall + room detection
      material_recommender.py    ← 37-material scoring engine
      stellar_blockchain.py      ← SHA-256 hash + Stellar TX
    app/routes/
      analysis.py                ← POST /api/analyze
      reports.py                 ← GET /api/reports
    main.py
    requirements.txt

  structural-ai/src/
    pages/Dashboard.tsx          ← main upload + results page
    components/3d/               ← Three.js floor plan viewer
    components/ui/
      BlockchainBadge.tsx        ← TX display + copy button
      MaterialCard.tsx           ← per-material score card

  api-server/src/
    app.ts                       ← Express proxy to Python backend
```

---

## Running it

**Python backend**
```bash
cd artifacts/structural-ai-backend
pip install -r requirements.txt
python main.py
```

**Frontend + API server**
```bash
pnpm install
pnpm --filter @workspace/structural-ai run dev
pnpm --filter @workspace/api-server run dev
```

Stellar uses a pre-funded testnet account — no setup or env vars needed to run locally.

---

## Honest limitations

- Works best on clean architectural line drawings. Noisy or hand-drawn plans give rougher results
- Room labeling is heuristic (largest polygon → Living Room, position-based for others)
- Stellar is testnet only — tokens have no real value
- The blockchain records the hash of the analysis output, not the original image file
