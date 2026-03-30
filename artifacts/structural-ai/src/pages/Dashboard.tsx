import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Uploader } from "@/components/ui/Uploader";
import { FloorPlanModel } from "@/components/3d/FloorPlanModel";
import { MaterialCard } from "@/components/ui/MaterialCard";
import { BlockchainBadge } from "@/components/ui/BlockchainBadge";
import { useAnalyzeFloorPlan } from "@workspace/api-client-react";
import { AnalysisResult } from "@workspace/api-client-react";
import {
  Layers, Maximize, BoxSelect, Cpu, RefreshCw, Loader2,
  Hexagon, TriangleAlert, Ruler, Building2, ShieldCheck,
} from "lucide-react";
import { formatArea } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const [file, setFile]       = useState<File | null>(null);
  const [budget, setBudget]   = useState<string>("medium");
  const [location, setLocation] = useState<string>("Temperate");
  const [result, setResult]   = useState<AnalysisResult | null>(null);

  const { toast }         = useToast();
  const analyzeMutation   = useAnalyzeFloorPlan();

  const handleAnalyze = () => {
    if (!file) return;
    analyzeMutation.mutate(
      { data: { file, budget, location } },
      {
        onSuccess: (data) => {
          setResult(data);
          toast({
            title: "Analysis Complete",
            description: "Neural network successfully processed structural integrity.",
          });
        },
        onError: (err) => {
          toast({
            variant: "destructive",
            title: "System Fault",
            description: (err as any).error?.error || "Failed to analyze floor plan",
          });
        },
      }
    );
  };

  const handleReset = () => { setFile(null); setResult(null); };

  // Span colour helper
  const spanColor = (span: number) =>
    span > 6 ? "text-red-400" : span > 3 ? "text-amber-400" : "text-emerald-400";

  return (
    <AppLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">Analysis Workspace</h1>
          <p className="text-muted-foreground font-mono text-sm">Upload blueprints for autonomous AI processing.</p>
        </div>
        {result && (
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-sm font-medium transition-colors border border-border"
          >
            <RefreshCw className="w-4 h-4" />
            Analyze Another
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {/* ── UPLOAD PHASE ─────────────────────────────────────────────────── */}
        {!result ? (
          <motion.div
            key="upload-phase"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            <div className="lg:col-span-2">
              <Uploader onFileSelect={setFile} isLoading={analyzeMutation.isPending} />
            </div>

            <div className="glass-panel p-6 rounded-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Cpu className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold">Parameters</h3>
                    <p className="text-xs text-muted-foreground font-mono">Configure AI constraints</p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Project Budget</label>
                    <select
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      disabled={analyzeMutation.isPending}
                      className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all disabled:opacity-50"
                    >
                      <option value="low">Economic / Cost-optimized</option>
                      <option value="medium">Standard / Balanced</option>
                      <option value="high">Premium / High-end</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Climate Location</label>
                    <select
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      disabled={analyzeMutation.isPending}
                      className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all disabled:opacity-50"
                    >
                      <option value="Tropical">Tropical / High Humidity</option>
                      <option value="Temperate">Temperate / Moderate</option>
                      <option value="Arid">Arid / Dry &amp; Hot</option>
                      <option value="Continental">Continental / Freezing Winters</option>
                    </select>
                  </div>
                </div>
              </div>

              <button
                onClick={handleAnalyze}
                disabled={!file || analyzeMutation.isPending}
                className="mt-8 w-full px-6 py-4 rounded-xl font-bold font-mono tracking-wider
                  bg-primary text-primary-foreground
                  hover:bg-primary/90 hover:shadow-[0_0_24px_rgba(6,182,212,0.5)]
                  active:scale-[0.98]
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none
                  transition-all duration-200 relative overflow-hidden group"
              >
                {analyzeMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    INITIALIZING SEQUENCE...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Cpu className="w-5 h-5" />
                    INITIATE ANALYSIS
                  </span>
                )}
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              </button>
            </div>
          </motion.div>
        ) : (
          /* ── RESULTS PHASE ───────────────────────────────────────────────── */
          <motion.div
            key="results-phase"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* ── Row 1: Key Metrics (5 cards) ─────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <MetricCard
                icon={<Maximize className="w-5 h-5 text-blue-400" />}
                bgColor="bg-blue-500/10"
                borderColor="border-blue-500/20"
                label="Carpet Area"
                value={formatArea(result.totalArea)}
              />
              <MetricCard
                icon={<Building2 className="w-5 h-5 text-indigo-400" />}
                bgColor="bg-indigo-500/10"
                borderColor="border-indigo-500/20"
                label="Built-up Area"
                value={formatArea(result.builtUpArea ?? result.totalArea)}
                subtitle="incl. walls"
              />
              <MetricCard
                icon={<BoxSelect className="w-5 h-5 text-emerald-400" />}
                bgColor="bg-emerald-500/10"
                borderColor="border-emerald-500/20"
                label="Rooms"
                value={String(result.rooms.length)}
              />
              <MetricCard
                icon={<Layers className="w-5 h-5 text-purple-400" />}
                bgColor="bg-purple-500/10"
                borderColor="border-purple-500/20"
                label="Wall Length"
                value={`${result.totalWallLength.toFixed(1)} m`}
              />
              <MetricCard
                icon={<Ruler className="w-5 h-5 text-amber-400" />}
                bgColor="bg-amber-500/10"
                borderColor="border-amber-500/20"
                label="Max Span"
                value={`${(result.maxSpan ?? 0).toFixed(1)} m`}
                subtitle={result.spanCategory}
                valueClass={spanColor(result.maxSpan ?? 0)}
              />
            </div>

            {/* ── Row 2: Structural Classification ─────────────────────────── */}
            <div className="glass-panel rounded-xl p-5">
              <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" /> Structural Classification
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <ClassCell
                  color="text-cyan-400"
                  value={String(result.loadBearingCount ?? 0)}
                  label="Load-bearing walls"
                  sub="SF = 1.5 · 230 mm"
                />
                <ClassCell
                  color="text-slate-400"
                  value={String(result.partitionCount ?? 0)}
                  label="Partition walls"
                  sub="SF = 1.23 · 115 mm"
                />
                <ClassCell
                  color={spanColor(result.maxSpan ?? 0)}
                  value={`${(result.maxSpan ?? 0).toFixed(1)} m`}
                  label="Max structural span"
                  sub={result.spanCategory}
                />
                <ClassCell
                  color="text-emerald-400"
                  value={`${(result.avgSpan ?? 0).toFixed(1)} m`}
                  label="Average span"
                  sub="per room"
                />
              </div>
            </div>

            {/* ── Row 3: 3-D Model + Intelligence Report ────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <h2 className="text-lg font-display font-bold text-white mb-4 flex items-center gap-2">
                  <Hexagon className="w-5 h-5 text-primary" /> Structural Topography
                </h2>
                <FloorPlanModel model={result.model3d} rooms={result.rooms} />

                {/* GPT Structural Assessment */}
                {result.structuralAssessment && (
                  <div className="mt-4 glass-panel rounded-xl p-5 border border-primary/20">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                      <span className="text-xs font-mono text-violet-400 uppercase tracking-widest font-bold">
                        AI Structural Assessment
                      </span>
                      <span className="ml-auto text-[10px] font-mono text-muted-foreground border border-border rounded px-1.5 py-0.5">
                        GPT-4o
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-300 font-mono">
                      {result.structuralAssessment}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-5">
                <h2 className="text-lg font-display font-bold text-white mb-1 flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-primary" /> Intelligence Report
                </h2>

                {/* AI Summary */}
                <div className="glass-panel p-5 rounded-xl">
                  <p className="text-sm leading-relaxed text-muted-foreground font-mono whitespace-pre-wrap">
                    {result.summary}
                  </p>
                </div>

                {/* Room table */}
                <div className="glass-panel p-4 rounded-xl">
                  <p className="text-xs font-mono text-muted-foreground uppercase mb-3">Detected Rooms</p>
                  <div className="space-y-1.5">
                    {result.rooms.map((r) => (
                      <div key={r.id} className="flex justify-between text-xs font-mono">
                        <span className="text-white/80">{r.label}</span>
                        <span className="text-primary">{r.area.toFixed(1)} m²</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Blockchain badge */}
                {result.blockchainHash && result.blockchainTxId && (
                  <BlockchainBadge
                    hash={result.blockchainHash}
                    txId={result.blockchainTxId}
                    network={result.stellarNetwork}
                  />
                )}
              </div>
            </div>

            {/* ── Row 4: Material Recommendations ──────────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-primary" /> Material Recommendations
                </h2>
                <span className="text-xs font-mono text-muted-foreground bg-secondary px-3 py-1 rounded-full">
                  Top {result.recommendations.length} of 39 materials · ranked by score
                </span>
              </div>
              {result.maxSpan > 4.5 && (
                <div className="mb-4 flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 text-sm text-amber-300 font-mono">
                  <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  Max span {result.maxSpan.toFixed(1)} m — masonry-only systems are structurally insufficient.
                  RCC, Steel, or composite systems are required for load-bearing elements at this span.
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {result.recommendations.map((rec, i) => (
                  <MaterialCard key={i} rec={rec} index={i} />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}

/* ── Sub-components ───────────────────────────────────────────────────────── */

function MetricCard({
  icon, bgColor, borderColor, label, value, subtitle, valueClass = "text-white",
}: {
  icon: React.ReactNode;
  bgColor: string;
  borderColor: string;
  label: string;
  value: string;
  subtitle?: string;
  valueClass?: string;
}) {
  return (
    <div className="glass-panel p-4 rounded-xl flex items-center gap-3">
      <div className={`w-10 h-10 rounded-full ${bgColor} flex items-center justify-center border ${borderColor} shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-mono text-muted-foreground uppercase truncate">{label}</p>
        <h3 className={`text-xl font-display font-bold ${valueClass}`}>{value}</h3>
        {subtitle && <p className="text-[9px] font-mono text-muted-foreground truncate">{subtitle}</p>}
      </div>
    </div>
  );
}

function ClassCell({
  color, value, label, sub,
}: {
  color: string;
  value: string;
  label: string;
  sub: string;
}) {
  return (
    <div className="space-y-1">
      <p className={`text-2xl font-display font-bold ${color}`}>{value}</p>
      <p className="text-xs text-white/80">{label}</p>
      <p className="text-[10px] font-mono text-muted-foreground">{sub}</p>
    </div>
  );
}
