import { MaterialRecommendation } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/utils";
import { CheckCircle2, XCircle, Zap, IndianRupee, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

const CATEGORY_COLOURS: Record<string, string> = {
  Masonry:   "bg-orange-500/20 text-orange-300 border-orange-500/30",
  Concrete:  "bg-blue-500/20 text-blue-300 border-blue-500/30",
  Steel:     "bg-slate-400/20 text-slate-300 border-slate-400/30",
  Timber:    "bg-green-500/20 text-green-300 border-green-500/30",
  Earth:     "bg-yellow-700/20 text-yellow-400 border-yellow-700/30",
  Composite: "bg-purple-500/20 text-purple-300 border-purple-500/30",
};

export function MaterialCard({ 
  rec, 
  index 
}: { 
  rec: MaterialRecommendation, 
  index: number 
}) {
  const catStyle = CATEGORY_COLOURS[rec.category ?? ""] ?? "bg-primary/10 text-primary border-primary/20";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className="glass-panel p-6 rounded-xl relative overflow-hidden group hover:border-primary/50 transition-colors"
    >
      {index === 0 && (
        <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-mono font-bold px-3 py-1 rounded-bl-lg tracking-wider">
          OPTIMAL MATCH
        </div>
      )}
      {index === 1 && (
        <div className="absolute top-0 right-0 bg-secondary text-foreground text-[10px] font-mono font-bold px-3 py-1 rounded-bl-lg tracking-wider">
          2ND BEST
        </div>
      )}
      
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0 pr-2">
          <h3 className="text-lg font-display font-bold text-foreground mb-1 group-hover:text-primary transition-colors leading-tight">
            {rec.material}
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            {rec.category && (
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${catStyle}`}>
                {rec.category.toUpperCase()}
              </span>
            )}
            <p className="text-sm font-mono text-primary flex items-center gap-1">
              <IndianRupee className="w-3.5 h-3.5" /> 
              {formatCurrency(rec.estimatedCostPerSqM)} <span className="text-muted-foreground">/ m²</span>
            </p>
          </div>
        </div>
        <div className="w-16 h-16 rounded-full border-4 border-secondary flex items-center justify-center relative shrink-0">
          <svg className="absolute inset-0 w-full h-full transform -rotate-90">
            <circle 
              cx="30" cy="30" r="28" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="4" 
              className="text-primary/20"
            />
            <circle 
              cx="30" cy="30" r="28" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="4" 
              strokeDasharray={`${rec.overallScore * 1.75} 175`} 
              className="text-primary drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]"
            />
          </svg>
          <span className="font-mono font-bold text-lg">{rec.overallScore}</span>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-5 line-clamp-2">{rec.reason}</p>

      <div className="space-y-3 mb-5">
        <div>
          <div className="flex justify-between text-xs font-mono mb-1">
            <span className="text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3"/> Cost Efficiency</span>
            <span className="text-foreground">{rec.costScore}/100</span>
          </div>
          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${rec.costScore}%` }}
              transition={{ duration: 1, delay: 0.5 }}
              className="h-full bg-blue-500" 
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs font-mono mb-1">
            <span className="text-muted-foreground flex items-center gap-1"><Zap className="w-3 h-3"/> Structural Strength</span>
            <span className="text-foreground">{rec.strengthScore}/100</span>
          </div>
          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${rec.strengthScore}%` }}
              transition={{ duration: 1, delay: 0.6 }}
              className="h-full bg-primary" 
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
        <div>
          <h4 className="text-xs font-mono font-bold text-success mb-2 uppercase">Advantages</h4>
          <ul className="space-y-1.5">
            {rec.pros.slice(0, 3).map((pro, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                <span>{pro}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-mono font-bold text-destructive mb-2 uppercase">Constraints</h4>
          <ul className="space-y-1.5">
            {rec.cons.slice(0, 3).map((con, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <XCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                <span>{con}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </motion.div>
  );
}
