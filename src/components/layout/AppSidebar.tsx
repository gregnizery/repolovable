import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useUserRole, canAccess } from "@/hooks/use-user-role";
import { useCurrentProvider } from "@/hooks/use-data";
import { navGroups, type NavigationItem } from "@/components/layout/navigation";
import { cn } from "@/lib/utils";

const roleLabels: Record<string, string> = {
  admin: "Administrateur",
  manager: "Manager",
  technicien: "Technicien",
  prestataire: "Prestataire",
};

interface AppSidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

function isItemActive(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`) || (path !== "/dashboard" && pathname.startsWith(path));
}

function SidebarLink({
  item,
  collapsed,
  pathname,
  onClick,
}: {
  item: NavigationItem;
  collapsed: boolean;
  pathname: string;
  onClick?: () => void;
}) {
  const active = isItemActive(pathname, item.path);

  return (
    <NavLink
      to={item.path}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors",
        active
          ? "border-primary/25 bg-primary/10 text-foreground"
          : "border-transparent text-sidebar-foreground hover:border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      )}
    >
      <item.icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-sidebar-foreground")} />
      {!collapsed ? <span className="truncate">{item.title}</span> : null}
    </NavLink>
  );
}

export function AppSidebar({ mobileOpen, onMobileClose }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { data: roleData } = useUserRole();
  const { data: currentProvider } = useCurrentProvider();
  const role = roleData?.role;
  const roleLabel = role ? roleLabels[role] ?? role : "Espace";
  const contextLabel = currentProvider?.name || (role === "prestataire" ? "Profil prestataire" : "Equipe active");

  const filteredGroups = navGroups
    .map((group) => {
      const items = group.items.filter((item) => canAccess(role, item.section));
      return { ...group, items };
    })
    .filter((group) => group.items.length > 0);

  const navContent = (onLinkClick?: () => void) => (
    <>
      <div className="flex h-[72px] items-center border-b border-sidebar-border px-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-glow">
            P
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-sidebar-muted">Atelier</p>
              <p className="truncate text-lg font-semibold text-sidebar-accent-foreground">Planify</p>
            </div>
          ) : null}
        </div>
        {onLinkClick ? (
          <button
            onClick={onLinkClick}
            className="ml-auto rounded-lg border border-sidebar-border bg-sidebar-accent p-2 text-sidebar-foreground transition-colors hover:text-sidebar-accent-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {filteredGroups.map((group) => (
          <div key={group.label} className="space-y-2">
            {!collapsed ? (
              <p className="px-2 font-mono text-[11px] uppercase tracking-[0.18em] text-sidebar-muted">{group.label}</p>
            ) : null}
            <div className="space-y-1">
              {group.items.map((item) => (
                <SidebarLink
                  key={item.path}
                  item={item}
                  collapsed={collapsed}
                  pathname={location.pathname}
                  onClick={onLinkClick}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="space-y-3 border-t border-sidebar-border px-3 py-3">
        <div className={cn("rounded-xl border border-sidebar-border bg-sidebar-accent px-3 py-3", collapsed && "px-2")}>
          {collapsed ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 font-mono text-[11px] uppercase text-primary">
              {roleLabel.slice(0, 1)}
            </div>
          ) : (
            <div className="space-y-1">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-sidebar-muted">{roleLabel}</p>
              <p className="truncate text-sm font-medium text-sidebar-accent-foreground">{contextLabel}</p>
            </div>
          )}
        </div>
        {!onLinkClick ? (
          <button
            onClick={() => setCollapsed((value) => !value)}
            className="flex h-10 w-full items-center justify-center rounded-lg border border-sidebar-border bg-sidebar-accent text-sidebar-foreground transition-colors hover:text-sidebar-accent-foreground"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        ) : null}
      </div>
    </>
  );

  return (
    <>
      <aside
        className={cn(
          "sticky top-0 z-30 hidden h-screen flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-[10px_0_30px_-24px_rgba(22,22,19,0.22)] md:flex",
          collapsed ? "w-[84px]" : "w-[270px]",
        )}
      >
        {navContent()}
      </aside>

      {mobileOpen ? <div className="fixed inset-0 z-40 bg-slate-950/35 md:hidden" onClick={onMobileClose} /> : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[320px] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-xl transition-transform duration-200 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {navContent(onMobileClose)}
      </aside>
    </>
  );
}
