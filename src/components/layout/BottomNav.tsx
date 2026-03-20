import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, Calendar, FileText, Package } from "lucide-react";
import { useUserRole, canAccess } from "@/hooks/use-user-role";

const allBottomNavItems = [
  { title: "Dashboard", path: "/dashboard", icon: LayoutDashboard, section: "dashboard" },
  { title: "Clients", path: "/clients", icon: Users, section: "clients" },
  { title: "Missions", path: "/missions", icon: Calendar, section: "missions" },
  { title: "Calendrier", path: "/calendrier", icon: Calendar, section: "missions" },
  { title: "Finance", path: "/finance/devis", icon: FileText, section: "finance" },
  { title: "Matériel", path: "/materiel", icon: Package, section: "materiel" },
];

export function BottomNav() {
  const location = useLocation();
  const { data: roleData } = useUserRole();
  const role = roleData?.role;

  const bottomNavItems = allBottomNavItems.filter((item) => canAccess(role, item.section));

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-1">
        {bottomNavItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path === "/finance/devis" && location.pathname.startsWith("/finance"));
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg transition-colors min-w-[56px]",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "drop-shadow-sm")} />
              <span className="text-[10px] font-medium leading-none">{item.title}</span>
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-b-full bg-primary" />
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
