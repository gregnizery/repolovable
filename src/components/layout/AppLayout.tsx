import { ReactNode, useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <AppSidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onMobileMenuOpen={() => setMobileMenuOpen(true)} />
        <main className="animate-fade-in relative flex-1 overflow-x-hidden px-4 pb-24 pt-4 md:px-6 md:pb-8 md:pt-6 xl:px-8 xl:pt-7">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(255,255,255,0),rgba(244,241,235,0.55))]" />
          {children}
        </main>
      </div>
      <BottomNav onMenuOpen={() => setMobileMenuOpen(true)} />
    </div>
  );
}
