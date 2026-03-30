import { AppLayout } from "@/components/layout/AppLayout";
import { FileQuestion } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
        <div className="w-24 h-24 rounded-2xl bg-destructive/10 border-2 border-destructive/20 flex items-center justify-center mb-6">
          <FileQuestion className="w-12 h-12 text-destructive" />
        </div>
        <h1 className="text-6xl font-display font-bold text-white mb-4 tracking-tighter">404</h1>
        <h2 className="text-xl font-mono text-muted-foreground mb-8">SECTOR_NOT_FOUND</h2>
        <p className="text-muted-foreground max-w-md mb-8">
          The requested module or interface directory does not exist within current system parameters.
        </p>
        <Link href="/">
          <a className="px-6 py-3 bg-primary text-primary-foreground font-bold font-mono rounded-lg hover:bg-primary/90 transition-colors shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            RETURN TO WORKSPACE
          </a>
        </Link>
      </div>
    </AppLayout>
  );
}
