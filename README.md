# hack-a-struct

> **Hack-a-Struct** — AI-powered structural analysis of 2D floor plans, with 3D visualization and blockchain-anchored audit trail on Stellar testnet.

Built for the **PS2 AI/ML track** of the Rise In × Stellar Hackathon.

---

## What it does

Upload any 2D floor plan image and the system:

1. **Detects walls** — OpenCV classifies load-bearing vs partition walls
2. **Identifies rooms** — flood-fill compartment detection with automatic labeling
3. **Generates a 3D model** — Three.js extrudes the floor plan in real-time
4. **Scores 37 materials** — cost-optimized recommendations based on budget + climate
5. **Anchors to Stellar** — SHA-256 report hash stored on-chain via Soroban smart contract

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + Three.js (`@react-three/fiber`) |
| Computer Vision | Python + OpenCV |
| Backend | FastAPI (Python) |
| Blockchain | Stellar Testnet + Soroban smart contract (Rust) |
| SDK | `@stellar/stellar-sdk` v13 |
| Monorepo | pnpm workspaces |

---

## Deployed Contract

| | |
|---|---|
| **Network** | Stellar Testnet |
| **Contract ID** | `CC4S4DUCM7FRWU2OZZA7F76JBXDWRFQLXFXNTON6XSC6DXH567B3WDOZ` |
| **Explorer** | [View on Stellar Expert](https://testnet.stellar.expert/explorer/testnet/contract/CC4S4DUCM7FRWU2OZZA7F76JBXDWRFQLXFXNTON6XSC6DXH567B3WDOZ) |

The contract stores a count of anchored reports and the latest SHA-256 hash. Every analysis triggers a Soroban transaction — verifiable on-chain.

---

## Project Structure

```
hack-a-struct/
├── artifacts/
│   ├── structural-ai/           # React frontend (Three.js 3D viewer, Stellar SDK)
│   └── structural-ai-backend/   # FastAPI backend (OpenCV, material scoring)
├── contracts/
│   └── hash-anchor/             # Soroban smart contract (Rust)
└── lib/
    └── api-client-react/        # Shared TypeScript API types
```

---

## Quick Start

### Prerequisites
- Node.js 20+ and pnpm
- Python 3.11+

### Install

```bash
pnpm install
```

### Run backend

```bash
cd artifacts/structural-ai-backend
pip install -r requirements.txt
python main.py
```

### Run frontend

```bash
pnpm --filter @workspace/structural-ai run dev
```

Open `http://localhost:5173`

---

## How the blockchain integration works

1. After every analysis the backend computes `SHA-256(JSON report)`
2. The hash is submitted to the Soroban contract via `store_hash(hash)`
3. The React frontend reads `get_count()` and `get_hash()` directly from the live contract
4. The `BlockchainBadge` component shows the live record count from chain

---

## Hackathon track

**Full Stack Stellar** — React frontend + deployed Soroban contract + `@stellar/stellar-sdk` JS integration  
Submission: [Rise In Hackathon](https://www.risein.com/programs/hackathon-project-submission-stellar)
