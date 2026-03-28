import { NavLink, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { useUserRole, canAccess } from "@/hooks/use-user-role";
import { shellQuickAccess } from "@/components/layout/navigation";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  onMenuOpen: () => void;
}

export function BottomNav({ onMenuOpen }: BottomNavProps) {
  const location = useLocation();
  const { data: roleData } = useUserRole();
  const role = roleData?.role;
  const items = shellQuickAccess.filter((item) => canAccess(role, item.section));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/70 bg-background/96 px-3 pb-3 pt-2 shadow-[0_-10px_30px_-24px_rgba(20,20,18,0.28)] backdrop-blur md:hidden">
      <div className="grid grid-cols-5 gap-2">
        {items.map((item) => {
          const active =
            location.pathname === item.path ||
            location.pathname.startsWith(`${item.path}/`) ||
            (item.path === "/finance/devis" && location.pathname.startsWith("/finance"));

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-xl border text-[11px] font-medium transition-colors",
                active
                  ? "border-primary/25 bg-primary/10 text-foreground"
                  : "border-transparent text-muted-foreground hover:border-border hover:bg-card",
              )}
            >
              <item.icon className={cn("h-4 w-4", active && "text-primary")} />
              <span>{item.title}</span>
            </NavLink>
          );
        })}
        <button
          type="button"
          onClick={onMenuOpen}
          className="flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-xl border border-transparent text-[11px] font-medium text-muted-foreground transition-colors hover:border-border hover:bg-card"
        >
          <Menu className="h-4 w-4" />
          <span>Menu</span>
        </button>
      </div>
    </nav>
  );
}
