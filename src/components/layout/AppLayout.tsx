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
    <div className="flex min-h-screen w-full bg-background forced-light text-foreground">
      <AppSidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onMobileMenuOpen={() => setMobileMenuOpen(true)} />
        <main className="relative flex-1 overflow-x-hidden p-4 pb-20 md:p-6 md:pb-6 xl:p-8 animate-fade-in">
          <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.08),transparent_32%),radial-gradient(circle_at_top_right,rgba(181,106,77,0.08),transparent_26%)]" />
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
