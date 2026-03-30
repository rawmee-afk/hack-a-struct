import { Sidebar } from "./Sidebar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background tech-grid-bg text-foreground">
      <Sidebar />
      <main className="flex-1 overflow-auto relative">
        {/* Subtle ambient lighting effects */}
        <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
        <div className="fixed bottom-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-accent/5 blur-[120px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto p-8 relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
