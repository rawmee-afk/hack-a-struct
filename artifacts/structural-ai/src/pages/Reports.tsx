import { AppLayout } from "@/components/layout/AppLayout";
import { useListReports } from "@workspace/api-client-react";
import { Link } from "wouter";
import { FileText, Calendar, ShieldCheck, ArrowRight, Loader2, Hexagon } from "lucide-react";
import { formatArea } from "@/lib/utils";

export default function Reports() {
  const { data: reports, isLoading, error } = useListReports();

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-white mb-2">Intelligence Archive</h1>
        <p className="text-muted-foreground font-mono text-sm">Immutable records of past structural analyses.</p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64 border border-dashed border-border rounded-xl">
          <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
          <p className="font-mono text-sm text-muted-foreground">ACCESSING_SECURE_ARCHIVE...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive font-mono text-sm">
          ERR_RETRIEVING_DATA: Could not load report history.
        </div>
      ) : !reports || reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border border-dashed border-border rounded-xl glass-panel">
          <FileText className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-white mb-1">No reports found</h3>
          <p className="text-sm text-muted-foreground mb-4">You haven't run any analyses yet.</p>
          <Link href="/" className="px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-md hover:bg-primary/20 transition-colors font-mono text-sm">
            INITIATE_FIRST_SCAN
          </Link>
        </div>
      ) : (
        <div className="bg-card/50 backdrop-blur-md rounded-xl border border-border overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/50 bg-secondary/30">
                <th className="py-4 px-6 text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider">Date/ID</th>
                <th className="py-4 px-6 text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider">Specs</th>
                <th className="py-4 px-6 text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider">Top Material</th>
                <th className="py-4 px-6 text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider">Verification</th>
                <th className="py-4 px-6 text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-secondary/20 transition-colors group">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium text-white text-sm">REP-{report.id.toString().padStart(4, '0')}</p>
                        <p className="text-xs text-muted-foreground font-mono flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          {new Date(report.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-sm text-foreground">{formatArea(report.totalArea)}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{report.roomCount} Rooms</p>
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {report.topMaterial}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    {report.blockchainHash ? (
                      <div className="flex items-center gap-2 text-xs font-mono text-success bg-success/10 border border-success/20 px-2 py-1 rounded w-fit">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Verified
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground font-mono">Unverified</span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <Link href={`/reports/${report.id}`} className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-secondary text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  );
}
