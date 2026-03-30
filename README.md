# hack-a-struct

Upload a floor plan. Get a full structural analysis, 3D model, material recommendations, and a blockchain-verified report — in under 5 seconds.

No LLM. No paid API. Everything runs deterministically.

---

## Project Vision

Construction decisions about materials, spans, and structural systems are still made largely by experience and intuition. For smaller projects in developing regions, engineers often don't have access to quick comparative analysis tools. hack-a-struct aims to make structural material intelligence accessible — upload any floor plan, get scored recommendations, and have every result permanently recorded on the blockchain so it can be audited later. The goal is to eventually support architects, site engineers, and approval bodies who need fast, verifiable structural reports.

---

## Key Features

- **Floor plan analysis** — OpenCV detects walls, classifies load-bearing vs partition, measures room polygons to real-world m² using pixel-to-metre calibration
- **37-material scoring** — deterministic formula across 6 categories (Masonry, Concrete, Steel, Timber, Earth, Composite) with real engineering properties
- **3D visualization** — Three.js renders an interactive model from the detected wall data with orbit controls and shadow maps
- **Stellar blockchain anchoring** — every report is SHA-256 hashed and submitted as a real Stellar testnet transaction; TX is live and verifiable
- **Frontend SDK verification** — React app uses `@stellar/stellar-sdk` (JavaScript) to query and verify transactions directly from the browser
- **Soroban smart contract** — `contracts/hash-anchor/` contains the on-chain hash registry (Rust/Soroban), deployable to any Stellar network
- **Report history** — all analyses stored in SQLite, accessible from the Reports page

---

## Deployed Blockchain Details

### Stellar Account (Anchor)

All report hashes are anchored from this testnet account:

| Field | Value |
|---|---|
| Public Key | `GABJGR3IP74R7A5J2HJTM5QVJUWXZHQ6FHBEH5JCDP3ZXVDMTQYZNCOV` |
| Network | Stellar Testnet |
| Explorer | https://stellar.expert/explorer/testnet/account/GABJGR3IP74R7A5J2HJTM5QVJUWXZHQ6FHBEH5JCDP3ZXVDMTQYZNCOV |

### Sample Verified Transactions

These are real transactions from actual analyses — verifiable on stellar.expert right now:

| TX ID | Verified |
|---|---|
| `919a3619dc2565bfca357d7bddee28156a8f9cf967c6cd320b1e29e430d4aa18` | [View on Stellar Expert](https://stellar.expert/explorer/testnet/tx/919a3619dc2565bfca357d7bddee28156a8f9cf967c6cd320b1e29e430d4aa18) |

### Soroban Smart Contract (Deployed)

The `contracts/hash-anchor/` Soroban contract is **live on Stellar testnet**.

| Field | Value |
|---|---|
| Contract ID | `CC4S4DUCM7FRWU2OZZA7F76JBXDWRFQLXFXNTON6XSC6DXH567B3WDOZ` |
| WASM Hash | `4e72496da69557b5d302274aa7103f8df2452df8668dec5362925716be289023` |
| Deploy TX | `a94a3e78b30ff91afb469029e3dd59949efd87d6a10898c7c04e362cd830b271` |
| Network | Stellar Testnet |
| Explorer | https://stellar.expert/explorer/testnet/contract/CC4S4DUCM7FRWU2OZZA7F76JBXDWRFQLXFXNTON6XSC6DXH567B3WDOZ |

**Contract functions:**
- `store_hash(report_hash: String) → u64` — writes a SHA-256 digest, returns record ID
- `get_hash(id: u64) → Option<String>` — retrieves a stored hash by record ID
- `get_count() → u64` — total number of hashes stored

---

## How the scoring works

```
Score = 0.35 × Strength
      + 0.30 × (1 − NormCost) × BudgetMultiplier
      + 0.20 × Durability
      + 0.15 × ClimateFit
      − SpanPenalty
```

- `BudgetMultiplier` — low budget boosts cost weight (1.5×), high reduces it (0.6×)
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

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React + Vite + TypeScript + TailwindCSS |
| 3D rendering | Three.js + @react-three/fiber |
| Stellar (frontend) | @stellar/stellar-sdk (JavaScript) |
| Backend | Python 3.11 + FastAPI + OpenCV |
| Stellar (backend) | stellar-sdk (Python) |
| API gateway | Node.js + Express |
| Smart contract | Rust + Soroban SDK v22 |
| Database | SQLite |

---

## Project layout

```
hack-a-struct/
├── contracts/
│   ├── Cargo.toml                        ← workspace config
│   ├── .gitignore
│   └── hash-anchor/
│       ├── Cargo.toml
│       ├── README.md
│       └── src/lib.rs                    ← Soroban contract (store_hash, get_hash)
│
├── artifacts/
│   ├── structural-ai-backend/
│   │   ├── app/services/
│   │   │   ├── floor_plan_analyzer.py    ← OpenCV wall + room detection
│   │   │   ├── material_recommender.py   ← 37-material scoring engine
│   │   │   └── stellar_blockchain.py     ← SHA-256 hash + Stellar TX (Python SDK)
│   │   └── main.py / requirements.txt
│   │
│   ├── structural-ai/src/
│   │   ├── lib/stellar-integration.ts    ← Stellar JS SDK: verify TX from browser
│   │   ├── pages/Dashboard.tsx           ← upload + results
│   │   ├── components/3d/                ← Three.js viewer
│   │   └── components/ui/BlockchainBadge.tsx  ← live TX verification widget
│   │
│   └── api-server/src/app.ts             ← Express proxy
│
└── README.md
```

---

## Project Setup

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

Stellar uses a pre-funded testnet account — no env vars needed to run locally.

**Smart contract (local deploy)**
```bash
rustup target add wasm32-unknown-unknown
cd contracts
cargo build --release --target wasm32-unknown-unknown
stellar contract deploy \
  --wasm hash-anchor/target/wasm32-unknown-unknown/release/hash_anchor.wasm \
  --source <secret-key> \
  --network testnet
```

---

## Future Scope

- **Soroban contract integration** — once deployed, the React frontend can call `store_hash` directly via `@stellar/stellar-sdk` without going through the Python backend
- **Image hash anchoring** — currently we hash the analysis output; we could also hash the original image file for complete chain of custody
- **Multi-network support** — deploy to Stellar mainnet for production use
- **PDF report generation** — export a signed PDF with the TX ID embedded as a QR code for building permit submissions
- **Seismic/wind load analysis** — extend the scoring formula to include IS:1893 and IS:875 load factors
- **Multi-floor support** — currently handles single-floor plans; extend to multi-storey with staircase detection
- **Mobile app** — React Native app for on-site photo-to-analysis workflow

---

## Honest limitations

- Works best on clean architectural line drawings; noisy or hand-drawn plans give rougher wall detection
- Room labeling is heuristic (largest polygon → Living Room, position-based for others)
- Stellar integration is testnet only — tokens have no real value
- The blockchain records the hash of the analysis output, not the original image file
- Soroban contract needs local Rust toolchain to compile and deploy
