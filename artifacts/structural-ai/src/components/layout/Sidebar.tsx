import { Link, useLocation } from "wouter";
import { Hexagon, LayoutDashboard, History, Settings, LogOut, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Analysis Workspace", href: "/" },
  { icon: History, label: "Report History", href: "/reports" },
  { icon: Settings, label: "System Config", href: "/settings" },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-64 flex-shrink-0 border-r border-border bg-card/50 backdrop-blur-xl flex flex-col h-screen sticky top-0">
      <div className="p-6 flex items-center gap-3 border-b border-border/50">
        <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 border border-primary/30">
          <Hexagon className="w-6 h-6 text-primary absolute" />
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
        </div>
        <div>
          <h1 className="font-display font-bold text-lg leading-tight text-white tracking-wide">
            STRUCT<span className="text-primary">.AI</span>
          </h1>
          <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
            Autonomous Engine
          </p>
        </div>
      </div>

      <div className="flex-1 py-6 px-4 space-y-1">
        <p className="px-2 text-xs font-mono font-semibold text-muted-foreground uppercase tracking-widest mb-4">
          Core Modules
        </p>
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group font-medium text-sm",
                isActive 
                  ? "bg-primary/10 text-primary border border-primary/20 shadow-[inset_0_0_12px_rgba(6,182,212,0.1)]" 
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              )} />
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-border/50">
        <div className="bg-secondary/50 rounded-lg p-4 border border-border mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-success" />
            <span className="text-xs font-mono text-success">SYSTEM ONLINE</span>
          </div>
          <p className="text-xs text-muted-foreground">Connected to Stellar Testnet</p>
        </div>
        <button className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors text-sm font-medium">
          <LogOut className="w-5 h-5" />
          Terminate Session
        </button>
      </div>
    </aside>
  );
}
