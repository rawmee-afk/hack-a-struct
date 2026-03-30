import { useRoute, Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGetReport } from "@workspace/api-client-react";
import { BlockchainBadge } from "@/components/ui/BlockchainBadge";
import { ArrowLeft, Loader2, Calendar, Layout, BoxSelect, Droplets, Ruler } from "lucide-react";
import { formatArea } from "@/lib/utils";

export default function ReportDetail() {
  const [, params] = useRoute("/reports/:id");
  const reportId = params?.id ? parseInt(params.id, 10) : 0;
  
  const { data: report, isLoading, error } = useGetReport(reportId, {
    query: { enabled: !!reportId }
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
          <p className="font-mono text-primary tracking-widest animate-pulse">DECRYPTING_RECORD...</p>
        </div>
      </AppLayout>
    );
  }

  if (error || !report) {
    return (
      <AppLayout>
        <div className="p-6 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive font-mono">
          <h2 className="text-lg font-bold mb-2">SYSTEM_ERROR</h2>
          <p>Failed to retrieve report data. It may have been purged or corrupted.</p>
          <Link href="/reports" className="inline-block mt-4 px-4 py-2 bg-secondary text-white rounded hover:bg-secondary/80">
            RETURN_TO_ARCHIVE
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-8">
        <Link href="/reports" className="inline-flex items-center gap-2 text-sm font-mono text-muted-foreground hover:text-primary transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Archive
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-white mb-2">
              Report <span className="text-primary">#{report.id.toString().padStart(4, '0')}</span>
            </h1>
            <p className="text-muted-foreground font-mono text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Generated on {new Date(report.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="glass-panel p-8 rounded-xl border-t-4 border-t-primary">
            <h2 className="text-lg font-display font-bold text-white mb-6 uppercase tracking-wider">Executive Summary</h2>
            <p className="text-base leading-relaxed text-muted-foreground font-mono">
              {report.summary}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-secondary/40 border border-border rounded-lg p-4 flex flex-col items-center justify-center text-center">
              <Layout className="w-6 h-6 text-blue-400 mb-2" />
              <p className="text-[10px] text-muted-foreground font-mono uppercase mb-1">Total Area</p>
              <p className="font-bold text-white">{formatArea(report.totalArea)}</p>
            </div>
            <div className="bg-secondary/40 border border-border rounded-lg p-4 flex flex-col items-center justify-center text-center">
              <BoxSelect className="w-6 h-6 text-emerald-400 mb-2" />
              <p className="text-[10px] text-muted-foreground font-mono uppercase mb-1">Rooms Detected</p>
              <p className="font-bold text-white">{report.roomCount}</p>
            </div>
            <div className="bg-secondary/40 border border-border rounded-lg p-4 flex flex-col items-center justify-center text-center">
              <Ruler className="w-6 h-6 text-purple-400 mb-2" />
              <p className="text-[10px] text-muted-foreground font-mono uppercase mb-1">Wall Length</p>
              <p className="font-bold text-white">{report.totalWallLength.toFixed(1)}m</p>
            </div>
            <div className="bg-secondary/40 border border-border rounded-lg p-4 flex flex-col items-center justify-center text-center">
              <Droplets className="w-6 h-6 text-orange-400 mb-2" />
              <p className="text-[10px] text-muted-foreground font-mono uppercase mb-1">Primary Material</p>
              <p className="font-bold text-white text-sm truncate w-full">{report.topMaterial}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-xl">
            <h3 className="font-display font-bold text-white mb-4">Security Verification</h3>
            {report.blockchainHash && report.blockchainTxId ? (
              <BlockchainBadge 
                hash={report.blockchainHash}
                txId={report.blockchainTxId}
                network={report.stellarNetwork}
              />
            ) : (
              <div className="p-4 rounded bg-secondary text-muted-foreground text-sm font-mono border border-dashed border-border text-center">
                NO_BLOCKCHAIN_RECORD_FOUND
              </div>
            )}
            
            <div className="mt-6 pt-6 border-t border-border/50">
              <p className="text-xs text-muted-foreground font-mono mb-2">Note: Full 3D topological data is not retained in the immutable archive to conserve storage. Only summary statistics and decisions are hashed.</p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
