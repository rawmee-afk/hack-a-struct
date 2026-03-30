import {
  Horizon,
  Keypair,
  TransactionBuilder,
  Networks,
  Operation,
  Asset,
  BASE_FEE,
} from "@stellar/stellar-sdk";

const HORIZON_URL = "https://horizon-testnet.stellar.org";
const NETWORK_PASSPHRASE = Networks.TESTNET;

// The pre-funded testnet account used for anchoring hashes
const ANCHOR_PUBLIC_KEY =
  "GABJGR3IP74R7A5J2HJTM5QVJUWXZHQ6FHBEH5JCDP3ZXVDMTQYZNCOV";

// Deployed Soroban hash-anchor contract on Stellar testnet
export const HASH_ANCHOR_CONTRACT_ID =
  "CC4S4DUCM7FRWU2OZZA7F76JBXDWRFQLXFXNTON6XSC6DXH567B3WDOZ";

const server = new Horizon.Server(HORIZON_URL);

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
    const tx = await server.transactions().transaction(txId).call();
    return {
      confirmed: true,
      ledger: tx.ledger,
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
    const txs = await server
      .transactions()
      .forAccount(ANCHOR_PUBLIC_KEY)
      .limit(limit)
      .order("desc")
      .call();

    return txs.records.map((tx) => ({
      txId: tx.id,
      createdAt: tx.created_at,
      memo: tx.memo ?? "",
      ledger: tx.ledger,
    }));
  } catch {
    return [];
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
