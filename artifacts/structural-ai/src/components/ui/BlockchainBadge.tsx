import { Hexagon, ExternalLink, CheckCircle, Clock, Copy, Check, RefreshCw, FileCode } from "lucide-react";
import { useState, useEffect } from "react";
import {
  verifyTransaction,
  explorerUrl,
  anchorAccountUrl,
  contractExplorerUrl,
  contractGetCount,
  HASH_ANCHOR_CONTRACT_ID,
} from "@/lib/stellar-integration";

interface BlockchainBadgeProps {
  hash: string;
  txId: string;
  network: string;
}

export function BlockchainBadge({ hash, txId, network }: BlockchainBadgeProps) {
  const [copied, setCopied] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState<{ ledger?: number; createdAt?: string } | null>(null);
  const [contractCount, setContractCount] = useState<number | null>(null);

  const isSimulated = network.includes("simulated");
  const txExplorerUrl = explorerUrl(txId, network);
  const accountUrl = anchorAccountUrl();
  const contractUrl = contractExplorerUrl();

  // Auto-verify TX and fetch on-chain contract count
  useEffect(() => {
    if (!isSimulated && txId) {
      setVerifying(true);
      verifyTransaction(txId)
        .then((result) => {
          if (result.confirmed) setVerified({ ledger: result.ledger, createdAt: result.createdAt });
        })
        .finally(() => setVerifying(false));
    }
    // Read from deployed Soroban contract
    contractGetCount().then(setContractCount);
  }, [txId, isSimulated]);

  const copyTxId = () => {
    navigator.clipboard.writeText(txId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const openExplorer = () => window.open(txExplorerUrl, "_blank", "noopener,noreferrer");
  const openAccount  = () => window.open(accountUrl, "_blank", "noopener,noreferrer");
  const openContract = () => window.open(contractUrl, "_blank", "noopener,noreferrer");

  const handleVerify = () => {
    setVerifying(true);
    verifyTransaction(txId)
      .then((r) => { if (r.confirmed) setVerified({ ledger: r.ledger, createdAt: r.createdAt }); })
      .finally(() => setVerifying(false));
    contractGetCount().then(setContractCount);
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-[#0f172a] p-4">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none" />

      <div className="flex items-start gap-4 relative z-10">
        <div className="w-11 h-11 rounded-lg bg-primary/20 border border-primary/50 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)] shrink-0">
          <Hexagon className="w-5 h-5 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-bold text-white tracking-wide">STELLAR BLOCKCHAIN</h4>
            <span className="px-2 py-0.5 rounded text-[9px] bg-primary/20 text-primary font-mono uppercase">
              {network}
            </span>
            {isSimulated ? (
              <span className="flex items-center gap-1 text-[9px] text-amber-400 font-mono">
                <Clock className="w-2.5 h-2.5" /> SIMULATED
              </span>
            ) : verifying ? (
              <span className="flex items-center gap-1 text-[9px] text-sky-400 font-mono animate-pulse">
                <RefreshCw className="w-2.5 h-2.5 animate-spin" /> VERIFYING VIA SDK…
              </span>
            ) : verified ? (
              <span className="flex items-center gap-1 text-[9px] text-emerald-400 font-mono">
                <CheckCircle className="w-2.5 h-2.5" /> CONFIRMED ON-CHAIN · LEDGER {verified.ledger}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[9px] text-emerald-400 font-mono">
                <CheckCircle className="w-2.5 h-2.5" /> CONFIRMED ON-CHAIN
              </span>
            )}
          </div>

          {/* Hash + TX rows */}
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-muted-foreground uppercase w-12 shrink-0">SHA-256</span>
              <span className="text-[10px] font-mono text-white/80 bg-white/5 px-2 py-0.5 rounded truncate">
                {hash}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-muted-foreground uppercase w-12 shrink-0">TX ID</span>
              <span className="text-[10px] font-mono text-cyan-300 bg-white/5 px-2 py-0.5 rounded truncate flex-1">
                {txId}
              </span>
              <button onClick={copyTxId} title="Copy TX ID" className="shrink-0 p-1 rounded hover:bg-white/10 transition-colors">
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
              </button>
            </div>
            {verified?.createdAt && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-muted-foreground uppercase w-12 shrink-0">TIME</span>
                <span className="text-[10px] font-mono text-white/60 bg-white/5 px-2 py-0.5 rounded">
                  {new Date(verified.createdAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {/* Soroban contract info */}
          <div className="mt-2 flex items-center gap-2 bg-white/5 rounded px-2 py-1.5">
            <FileCode className="w-3 h-3 text-violet-400 shrink-0" />
            <span className="text-[9px] font-mono text-muted-foreground shrink-0">CONTRACT:</span>
            <span className="text-[9px] font-mono text-violet-300 truncate flex-1">{HASH_ANCHOR_CONTRACT_ID}</span>
            {contractCount !== null && (
              <span className="text-[9px] font-mono text-emerald-400 shrink-0">{contractCount} records</span>
            )}
          </div>

          {/* Selectable TX URL */}
          {!isSimulated && (
            <div className="mt-1 flex items-center gap-2 bg-white/5 rounded px-2 py-1">
              <span className="text-[9px] font-mono text-muted-foreground shrink-0">URL:</span>
              <span className="text-[9px] font-mono text-cyan-400 truncate select-all cursor-text">
                {txExplorerUrl}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <button onClick={openExplorer} className="inline-flex items-center gap-1.5 text-xs font-mono text-primary hover:text-primary/80 transition-colors">
              <ExternalLink className="w-3 h-3" />
              View TX
            </button>
            <button onClick={openContract} className="inline-flex items-center gap-1.5 text-xs font-mono text-violet-400 hover:text-violet-300 transition-colors">
              <ExternalLink className="w-3 h-3" />
              Contract
            </button>
            <button onClick={openAccount} className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-white transition-colors">
              <ExternalLink className="w-3 h-3" />
              Account
            </button>
            <button onClick={copyTxId} className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-white transition-colors">
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied!" : "Copy TX"}
            </button>
            {!isSimulated && !verifying && (
              <button onClick={handleVerify} className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-white transition-colors">
                <RefreshCw className="w-3 h-3" />
                Re-verify
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
