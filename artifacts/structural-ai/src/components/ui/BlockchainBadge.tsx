import { Hexagon, ExternalLink, CheckCircle, Clock, Copy, Check } from "lucide-react";
import { useState } from "react";

interface BlockchainBadgeProps {
  hash: string;
  txId: string;
  network: string;
}

export function BlockchainBadge({ hash, txId, network }: BlockchainBadgeProps) {
  const [copied, setCopied] = useState(false);
  const isSimulated = network.includes("simulated");
  const netBase     = network.includes("testnet") ? "testnet" : "public";
  const explorerUrl = `https://stellar.expert/explorer/${netBase}/tx/${txId}`;

  const copyTxId = () => {
    navigator.clipboard.writeText(txId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const openExplorer = () => {
    window.open(explorerUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-[#0f172a] p-4 group">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none" />

      <div className="flex items-start gap-4 relative z-10">
        {/* Icon */}
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
            ) : (
              <span className="flex items-center gap-1 text-[9px] text-emerald-400 font-mono">
                <CheckCircle className="w-2.5 h-2.5" /> CONFIRMED ON-CHAIN
              </span>
            )}
          </div>

          {/* Hash + TX ID */}
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
              <button
                onClick={copyTxId}
                title="Copy TX ID"
                className="shrink-0 p-1 rounded hover:bg-white/10 transition-colors"
              >
                {copied
                  ? <Check className="w-3 h-3 text-emerald-400" />
                  : <Copy className="w-3 h-3 text-muted-foreground hover:text-white" />
                }
              </button>
            </div>
          </div>

          {/* Explorer URL (selectable text for manual copy) */}
          {!isSimulated && (
            <div className="mt-2 flex items-center gap-2 bg-white/5 rounded px-2 py-1">
              <span className="text-[9px] font-mono text-muted-foreground shrink-0">URL:</span>
              <span className="text-[9px] font-mono text-cyan-400 truncate select-all cursor-text">
                {explorerUrl}
              </span>
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <button
              onClick={openExplorer}
              className="inline-flex items-center gap-1.5 text-xs font-mono text-primary hover:text-primary/80 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              View on Stellar Expert
            </button>
            <button
              onClick={copyTxId}
              className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-white transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied!" : "Copy TX ID"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
