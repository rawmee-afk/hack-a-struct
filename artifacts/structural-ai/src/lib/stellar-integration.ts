import {
  Horizon,
  Networks,
  rpc,
  Contract,
  TransactionBuilder,
  Operation,
  scValToNative,
  nativeToScVal,
  Address,
} from "@stellar/stellar-sdk";

const HORIZON_URL = "https://horizon-testnet.stellar.org";
const RPC_URL = "https://soroban-testnet.stellar.org";

// The pre-funded testnet account used for anchoring hashes
const ANCHOR_PUBLIC_KEY =
  "GABJGR3IP74R7A5J2HJTM5QVJUWXZHQ6FHBEH5JCDP3ZXVDMTQYZNCOV";

// Deployed Soroban hash-anchor contract on Stellar testnet
export const HASH_ANCHOR_CONTRACT_ID =
  "CC4S4DUCM7FRWU2OZZA7F76JBXDWRFQLXFXNTON6XSC6DXH567B3WDOZ";

const horizonServer = new Horizon.Server(HORIZON_URL);
const sorobanServer = new rpc.Server(RPC_URL);

export interface StellarTxResult {
  txId: string;
  network: string;
  explorerUrl: string;
}

/**
 * Look up a transaction on the Stellar testnet and return its details.
 * Called from the frontend to verify a report hash is genuinely on-chain.
 */
export async function verifyTransaction(txId: string): Promise<{
  confirmed: boolean;
  ledger?: number;
  createdAt?: string;
  memo?: string;
}> {
  try {
    const tx = await horizonServer.transactions().transaction(txId).call();
    return {
      confirmed: true,
      ledger: tx.ledger as unknown as number,
      createdAt: tx.created_at,
      memo: tx.memo,
    };
  } catch {
    return { confirmed: false };
  }
}

/**
 * Fetch the transaction history for our anchor account.
 * Used on the Reports page to show blockchain activity.
 */
export async function fetchAnchorHistory(limit = 10): Promise<
  Array<{
    txId: string;
    createdAt: string;
    memo: string;
    ledger: number;
  }>
> {
  try {
    const txs = await horizonServer
      .transactions()
      .forAccount(ANCHOR_PUBLIC_KEY)
      .limit(limit)
      .order("desc")
      .call();

    return txs.records.map((tx) => ({
      txId: tx.id,
      createdAt: tx.created_at,
      memo: tx.memo ?? "",
      ledger: tx.ledger as unknown as number,
    }));
  } catch {
    return [];
  }
}

/**
 * Call get_count() on the deployed hash-anchor Soroban contract.
 * Returns the total number of report hashes stored on-chain.
 * This is a read-only simulation — no signing required.
 */
export async function contractGetCount(): Promise<number> {
  try {
    const contract = new Contract(HASH_ANCHOR_CONTRACT_ID);
    const account = await sorobanServer.getAccount(ANCHOR_PUBLIC_KEY);
    const tx = new TransactionBuilder(account, {
      fee: "100",
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(contract.call("get_count"))
      .setTimeout(30)
      .build();

    const sim = await sorobanServer.simulateTransaction(tx);
    if ("error" in sim) return 0;
    const result = (sim as rpc.Api.SimulateTransactionSuccessResponse).result;
    if (!result) return 0;
    return Number(scValToNative(result.retval));
  } catch {
    return 0;
  }
}

/**
 * Call get_hash(id) on the deployed hash-anchor Soroban contract.
 * Returns the SHA-256 hex string stored at that record ID, or null if not found.
 * This is a read-only simulation — no signing required.
 */
export async function contractGetHash(recordId: number): Promise<string | null> {
  try {
    const contract = new Contract(HASH_ANCHOR_CONTRACT_ID);
    const account = await sorobanServer.getAccount(ANCHOR_PUBLIC_KEY);
    const tx = new TransactionBuilder(account, {
      fee: "100",
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(contract.call("get_hash", nativeToScVal(BigInt(recordId), { type: "u64" })))
      .setTimeout(30)
      .build();

    const sim = await sorobanServer.simulateTransaction(tx);
    if ("error" in sim) return null;
    const result = (sim as rpc.Api.SimulateTransactionSuccessResponse).result;
    if (!result) return null;
    const val = scValToNative(result.retval);
    if (val === null || val === undefined) return null;
    return String(val);
  } catch {
    return null;
  }
}

/**
 * Build the Stellar Expert explorer URL for a given TX ID.
 */
export function explorerUrl(txId: string, network: string = "testnet"): string {
  const net = network.includes("testnet") ? "testnet" : "public";
  return `https://stellar.expert/explorer/${net}/tx/${txId}`;
}

/**
 * Build the Stellar Expert account URL for the anchor account.
 */
export function anchorAccountUrl(): string {
  return `https://stellar.expert/explorer/testnet/account/${ANCHOR_PUBLIC_KEY}`;
}

/**
 * Build the Stellar Expert contract URL for the deployed contract.
 */
export function contractExplorerUrl(): string {
  return `https://stellar.expert/explorer/testnet/contract/${HASH_ANCHOR_CONTRACT_ID}`;
}
