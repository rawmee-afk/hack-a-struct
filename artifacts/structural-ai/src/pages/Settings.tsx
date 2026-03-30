import { AppLayout } from "@/components/layout/AppLayout";
import {
  Settings,
  Cpu,
  Database,
  GitBranch,
  Shield,
  Hexagon,
  Activity,
  ChevronRight,
  Info,
} from "lucide-react";

const FORMULA_WEIGHTS = [
  { label: "Structural Strength", weight: "35%", color: "text-primary", bar: "bg-primary" },
  { label: "Cost Efficiency", weight: "30%", color: "text-blue-400", bar: "bg-blue-500" },
  { label: "Durability Rating", weight: "20%", color: "text-purple-400", bar: "bg-purple-500" },
  { label: "Climate Fitness", weight: "15%", color: "text-orange-400", bar: "bg-orange-500" },
];

const MATERIALS = [
  { name: "Red Brick", strength: "7.5 MPa", cost: "₹1,200/m²", durability: "80 yrs", climate: "Moderate" },
  { name: "RCC (Reinforced Concrete)", strength: "25 MPa", cost: "₹1,800/m²", durability: "100 yrs", climate: "All zones" },
  { name: "AAC Block", strength: "4 MPa", cost: "₹1,600/m²", durability: "70 yrs", climate: "Thermal insulation" },
  { name: "Structural Steel", strength: "250 MPa", cost: "₹3,500/m²", durability: "60 yrs", climate: "High wind zones" },
];

const BUDGET_MULTIPLIERS = [
  { tier: "Economic / Low", mult: "1.5×", desc: "Heavily favours low-cost materials" },
  { tier: "Standard / Medium", mult: "1.0×", desc: "Balanced evaluation" },
  { tier: "Premium / High", mult: "0.6×", desc: "Prioritises strength and durability" },
];

export default function SystemConfig() {
  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-white mb-2">System Configuration</h1>
        <p className="text-muted-foreground font-mono text-sm">
          Runtime parameters, scoring model, and infrastructure status.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        <div className="lg:col-span-2 space-y-8">

          {/* Scoring Formula */}
          <section className="glass-panel p-8 rounded-xl border-t-4 border-t-primary">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                <Cpu className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-display font-bold text-white">Material Scoring Formula</h2>
                <p className="text-xs text-muted-foreground font-mono">AI decision weights</p>
              </div>
            </div>

            <div className="bg-secondary/40 border border-border rounded-lg p-4 mb-6 font-mono text-sm text-center text-foreground/90">
              Score = <span className="text-primary font-bold">0.35</span>×Strength +{" "}
              <span className="text-blue-400 font-bold">0.30</span>×(1−NormCost)×BudgetMult +{" "}
              <span className="text-purple-400 font-bold">0.20</span>×Durability +{" "}
              <span className="text-orange-400 font-bold">0.15</span>×ClimateFit
            </div>

            <div className="space-y-4">
              {FORMULA_WEIGHTS.map((w) => (
                <div key={w.label}>
                  <div className="flex justify-between text-xs font-mono mb-1.5">
                    <span className={w.color}>{w.label}</span>
                    <span className="text-foreground font-bold">{w.weight}</span>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full ${w.bar} rounded-full`} style={{ width: w.weight }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Budget Multipliers */}
          <section className="glass-panel p-8 rounded-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <Settings className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="font-display font-bold text-white">Budget Multipliers</h2>
                <p className="text-xs text-muted-foreground font-mono">How budget tier affects cost scoring</p>
              </div>
            </div>

            <div className="space-y-3">
              {BUDGET_MULTIPLIERS.map((b) => (
                <div key={b.tier} className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg border border-border/50">
                  <div className="flex items-center gap-3">
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{b.tier}</p>
                      <p className="text-xs text-muted-foreground font-mono">{b.desc}</p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-primary text-lg">{b.mult}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Material Database */}
          <section className="glass-panel p-8 rounded-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                <Database className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h2 className="font-display font-bold text-white">Material Database</h2>
                <p className="text-xs text-muted-foreground font-mono">4 supported construction materials</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="pb-3 text-xs font-mono text-muted-foreground uppercase">Material</th>
                    <th className="pb-3 text-xs font-mono text-muted-foreground uppercase">Strength</th>
                    <th className="pb-3 text-xs font-mono text-muted-foreground uppercase">Cost</th>
                    <th className="pb-3 text-xs font-mono text-muted-foreground uppercase">Durability</th>
                    <th className="pb-3 text-xs font-mono text-muted-foreground uppercase">Climate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {MATERIALS.map((m) => (
                    <tr key={m.name} className="hover:bg-secondary/20 transition-colors">
                      <td className="py-3 font-medium text-foreground">{m.name}</td>
                      <td className="py-3 font-mono text-primary">{m.strength}</td>
                      <td className="py-3 font-mono text-blue-400">{m.cost}</td>
                      <td className="py-3 font-mono text-purple-400">{m.durability}</td>
                      <td className="py-3 text-xs text-muted-foreground">{m.climate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

        </div>

        {/* Right column: infrastructure */}
        <div className="space-y-6">

          {/* AI Engine */}
          <div className="glass-panel p-6 rounded-xl">
            <h3 className="font-display font-bold text-white mb-4 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-primary" /> AI Engine
            </h3>
            <div className="space-y-3">
              <InfoRow label="Model" value="GPT-4o Mini" />
              <InfoRow label="Provider" value="Replit AI Integration" />
              <InfoRow label="Auth" value="Managed (no key needed)" />
              <InfoRow label="Fallback" value="Rule-based formula" />
              <InfoRow label="CV Engine" value="OpenCV (headless)" />
            </div>
          </div>

          {/* Blockchain */}
          <div className="glass-panel p-6 rounded-xl">
            <h3 className="font-display font-bold text-white mb-4 flex items-center gap-2">
              <Hexagon className="w-4 h-4 text-primary" /> Blockchain
            </h3>
            <div className="space-y-3">
              <InfoRow label="Network" value="Stellar Testnet" />
              <InfoRow label="Hash Algo" value="SHA-256" />
              <InfoRow label="Payload" value="Canonical report JSON" />
              <InfoRow label="Storage" value="Tx memo field" />
            </div>
          </div>

          {/* Storage */}
          <div className="glass-panel p-6 rounded-xl">
            <h3 className="font-display font-bold text-white mb-4 flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-400" /> Storage
            </h3>
            <div className="space-y-3">
              <InfoRow label="DB Engine" value="SQLite" />
              <InfoRow label="ORM" value="Python sqlite3" />
              <InfoRow label="Location" value="structural-ai-backend/" />
            </div>
          </div>

          {/* System Status */}
          <div className="glass-panel p-6 rounded-xl">
            <h3 className="font-display font-bold text-white mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-success" /> System Status
            </h3>
            <div className="space-y-2">
              <StatusRow label="Python AI Backend" online />
              <StatusRow label="Express API Proxy" online />
              <StatusRow label="Stellar Testnet" online />
              <StatusRow label="SQLite Database" online />
            </div>
          </div>

          {/* Version */}
          <div className="glass-panel p-6 rounded-xl">
            <h3 className="font-display font-bold text-white mb-4 flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-muted-foreground" /> Build Info
            </h3>
            <div className="space-y-3">
              <InfoRow label="Stack" value="FastAPI + React + Three.js" />
              <InfoRow label="Analysis Proxy" value="Express 5 / Node http" />
              <InfoRow label="3D Renderer" value="@react-three/fiber" />
            </div>
          </div>

          {/* Disclaimer */}
          <div className="p-4 bg-secondary/30 border border-dashed border-border rounded-xl flex gap-3">
            <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground font-mono leading-relaxed">
              AI recommendations are for planning purposes only. Always consult a certified structural engineer before construction.
            </p>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-mono text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-foreground text-right max-w-[60%]">{value}</span>
    </div>
  );
}

function StatusRow({ label, online }: { label: string; online: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-mono text-muted-foreground">{label}</span>
      <span className={`flex items-center gap-1.5 text-xs font-mono font-medium ${online ? "text-success" : "text-destructive"}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${online ? "bg-success animate-pulse" : "bg-destructive"}`} />
        {online ? "ONLINE" : "OFFLINE"}
      </span>
    </div>
  );
}
