# hack-a-struct

**AI-powered 2D floor plan analysis with 3D visualization and Stellar blockchain audit trail**

> Built for the Rise In × Stellar Hackathon — PS2 AI/ML + Full Stack Stellar tracks

---

## Demo

Upload any floor plan image → the system detects every wall, identifies rooms, renders an interactive 3D model, scores 37 construction materials for your budget, and permanently anchors the report hash on the Stellar blockchain — all in under 10 seconds.

---

## Key Features

| Feature | Details |
|---|---|
| **GPT-4o Assessment** | Expert structural narrative generated per analysis via GPT-4o-mini |
| **CV Wall Detection** | OpenCV flood-fill + morphology detects load-bearing vs partition walls |
| **Room Labeling** | Area + centroid heuristics auto-label Living Room, Bedroom, Kitchen… |
| **3D Extrusion** | Three.js (`@react-three/fiber`) renders walls at correct heights with room labels |
| **37-Material Scoring** | Cost-ranked material recs filtered by budget tier + climate zone |
| **Stellar Blockchain** | SHA-256 of every report stored on-chain via Soroban smart contract |
| **Live Contract Reads** | React frontend calls `get_count()` / `get_hash()` directly via `@stellar/stellar-sdk` |

---

## Architecture

```
┌────────────────────┐     REST API      ┌─────────────────────────────┐
│  React Frontend    │ ─────────────────▶│  FastAPI Backend (Python)   │
│  Three.js 3D view  │                   │  OpenCV wall detection       │
│  Stellar SDK reads │                   │  37-material scorer          │
│  BlockchainBadge   │                   │  SHA-256 report hashing      │
└────────────────────┘                   └──────────┬──────────────────┘
                                                    │ Stellar SDK
                                         ┌──────────▼──────────────────┐
                                         │  Soroban Smart Contract      │
                                         │  store_hash(hash: String)    │
                                         │  get_count() → u32           │
                                         │  get_hash()  → String        │
                                         │  Stellar Testnet             │
                                         └─────────────────────────────┘
```

---

## Deployed Contract

| | |
|---|---|
| **Network** | Stellar Testnet |
| **Contract ID** | `CC4S4DUCM7FRWU2OZZA7F76JBXDWRFQLXFXNTON6XSC6DXH567B3WDOZ` |
| **Explorer** | [testnet.stellar.expert →](https://testnet.stellar.expert/explorer/testnet/contract/CC4S4DUCM7FRWU2OZZA7F76JBXDWRFQLXFXNTON6XSC6DXH567B3WDOZ) |

Every analysis anchors a `SHA-256(JSON report)` to the live contract. The frontend reads the record count and latest hash directly from the chain in real time.

---

## Tech Stack

```
Frontend     React 19 · Vite · TypeScript · Three.js · @react-three/fiber · Tailwind CSS
Backend      Python 3.11 · FastAPI · OpenCV · NumPy · SQLite
Blockchain   Stellar Testnet · Soroban (Rust) · @stellar/stellar-sdk v13
Monorepo     pnpm workspaces · TypeScript project references
```

---

## Project Structure

```
hack-a-struct/
├── artifacts/
│   ├── structural-ai/               # React + Three.js frontend
│   │   └── src/
│   │       ├── components/3d/       # Three.js floor plan extrusion
│   │       ├── components/ui/       # BlockchainBadge + design system
│   │       ├── lib/stellar-integration.ts   # Soroban contract calls
│   │       └── pages/               # Dashboard, Reports, Settings
│   └── structural-ai-backend/       # Python AI backend
│       └── app/
│           ├── services/
│           │   ├── floor_plan_analyzer.py   # OpenCV detection
│           │   └── material_recommender.py  # 37-material scorer
│           └── routes/analysis.py           # Main analysis endpoint
└── contracts/
    └── hash-anchor/                 # Soroban smart contract (Rust)
        └── src/lib.rs
```

---

## Quick Start

### Requirements
- Node.js 20+ · pnpm · Python 3.11+

### Install & Run

```bash
# Install JS dependencies
pnpm install

# Start backend (port 8000)
cd artifacts/structural-ai-backend
pip install -r requirements.txt
python main.py

# Start frontend (port 5173)
pnpm --filter @workspace/structural-ai run dev
```

Open `http://localhost:5173`, upload a floor plan, click **Initiate Analysis**.

---

## How It Works

1. **Upload** — Drop any PNG/JPG floor plan (hand-drawn or digital)
2. **Detect** — OpenCV applies Gaussian blur → adaptive threshold → morphological ops to extract wall skeletons; a second pass classifies walls by thickness ratio (load-bearing ≥ 2× partition threshold)
3. **Rooms** — Flood-fill from image borders removes exterior; connected-component analysis labels remaining compartments by area and centroid position
4. **3D Model** — Each wall segment becomes a `BoxGeometry` mesh in Three.js; `Bounds` auto-fits the camera; room labels float at floor level via `Html` overlay
5. **Materials** — 37 materials scored on: structural suitability · climate compatibility · cost · sustainability · local availability; top 5 returned with pros/cons
6. **Blockchain** — `SHA-256(full JSON report)` computed in Python → `store_hash()` invoked on the Soroban contract → transaction ID returned and displayed

---

## Smart Contract (Rust)

```rust
// contracts/hash-anchor/src/lib.rs
#[contractimpl]
impl HashAnchor {
    pub fn store_hash(env: Env, hash: String) -> u32 { ... }
    pub fn get_hash(env: Env) -> String { ... }
    pub fn get_count(env: Env) -> u32 { ... }
}
```

Compiled with `soroban-sdk`, deployed to testnet via `stellar contract deploy`.

---

## Originality

- End-to-end pipeline: CV → 3D → Blockchain in a single upload
- Real Soroban contract (not mocked) called live from the browser
- 37-material scoring model with budget + climate parameters
- Three.js extrusion directly from OpenCV polygon output — no intermediate format

---

## Impact

Structural analysis that would normally cost ₹15,000–50,000 (engineer consultation) can now run instantly on any smartphone photo of a hand-drawn floor plan. Target users: self-builders in India, Africa, and Southeast Asia where formal engineering access is limited.
