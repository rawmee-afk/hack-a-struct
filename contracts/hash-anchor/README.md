# hash-anchor — Soroban Smart Contract

A Soroban smart contract that stores SHA-256 report hashes on the Stellar blockchain. Used by the hack-a-struct system to create tamper-proof records of every structural analysis.

## What it does

- `store_hash(report_hash)` — writes a 64-char SHA-256 digest to persistent storage, returns a record ID
- `get_hash(id)` — retrieves a stored hash by record ID
- `get_count()` — returns the total number of hashes stored

Each call to `store_hash` emits a `hash_set` event with the record ID, so the frontend can pick it up via Stellar's event streaming.

## Build

```bash
cd contracts
cargo build --release --target wasm32-unknown-unknown
```

Requires Rust 1.80+ and the `wasm32-unknown-unknown` target:
```bash
rustup target add wasm32-unknown-unknown
```

## Deploy to testnet

```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/hash_anchor.wasm \
  --source <your-secret-key> \
  --network testnet
```

This prints the Contract ID — add it to `stellar-integration.ts` as `HASH_ANCHOR_CONTRACT_ID`.

## Test

```bash
cargo test
```

## Contract structure

```
hash-anchor/
├── Cargo.toml
├── README.md
└── src/
    └── lib.rs      ← contract implementation
```
