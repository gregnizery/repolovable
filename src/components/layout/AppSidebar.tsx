import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, Calendar, FileText, Package, Settings,
  ChevronLeft, ChevronRight, Receipt, CreditCard, X, MapPin, ShieldAlert, QrCode
} from "lucide-react";
import { useUserRole, canAccess } from "@/hooks/use-user-role";
import { useCurrentProvider } from "@/hooks/use-data";

const navGroups = [
  {
    label: "Pilotage",
    section: null,
    items: [
      { title: "Dashboard", path: "/dashboard", icon: LayoutDashboard, section: "dashboard" },
      { title: "Calendrier", path: "/calendrier", icon: Calendar, section: "missions" },
    ],
  },
  {
    label: "Relation",
    section: null,
    items: [
      { title: "Clients", path: "/clients", icon: Users, section: "clients" },
      { title: "Prestataires", path: "/prestataires", icon: Users, section: "parametres" },
    ],
  },
  {
    label: "Opérations",
    section: null,
    items: [
      { title: "Missions", path: "/missions", icon: Calendar, section: "missions" },
    ],
  },
  {
    label: "Finance",
    section: "finance",
    items: [
      { title: "Devis", path: "/finance/devis", icon: FileText, section: "finance" },
      { title: "Factures", path: "/finance/factures", icon: Receipt, section: "finance" },
      { title: "Paiements", path: "/finance/paiements", icon: CreditCard, section: "finance" },
    ],
  },
  {
    label: "Parc",
    section: null,
    items: [
      { title: "Matériel", path: "/materiel", icon: Package, section: "materiel" },
      { title: "Scanner QR", path: "/materiel/scan", icon: QrCode, section: "materiel" },
      { title: "Lieux de stockage", path: "/materiel/stockage", icon: MapPin, section: "materiel" },
      { title: "Réseau B2B", path: "/suppliers", icon: Users, section: "materiel" },
    ],
  },
  {
    label: "Administration",
    section: "parametres",
    items: [
      { title: "Paramètres", path: "/parametres", icon: Settings, section: "parametres" },
      { title: "SuperAdmin", path: "/superadmin", icon: ShieldAlert, section: "superadmin" },
    ],
  },
];

interface AppSidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function AppSidebar({ mobileOpen, onMobileClose }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { data: roleData } = useUserRole();
  const { data: currentProvider } = useCurrentProvider();
  const role = roleData?.role;

  const filteredGroups = navGroups
    .map((group) => {
      let items = group.items.filter((item) => canAccess(role, item.section));

      // Special case for Providers: add "Mon Profil"
      if (group.label === "Relation" && role === "prestataire" && currentProvider) {
        items = [
          ...items,
          { title: "Mon Profil", path: `/prestataires/${currentProvider.id}`, icon: Users, section: null }
        ];
      }

      return {
        ...group,
        items,
      };
    })
    .filter((group) => group.items.length > 0);

  const navContent = (onNavClick?: () => void) => (
    <>
      <div className="flex items-center h-20 px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl gradient-primary shadow-glow flex items-center justify-center text-lg font-bold text-white shrink-0">
            P
          </div>
          {!collapsed && (
            <span className="font-display font-bold text-xl text-sidebar-accent-foreground tracking-tight">
              Planify
            </span>
          )}
        </div>
        {onNavClick && (
          <button
            onClick={onNavClick}
            className="ml-auto p-1.5 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground/60"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-6">
        {filteredGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/45 mb-2 px-2">
                {group.label}
              </p>
            )}
            <ul className="space-y-1">
              {group.items.map((item) => {
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      onClick={onNavClick}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-glow"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <item.icon className="h-[18px] w-[18px] shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex h-screen sticky top-0 flex-col bg-sidebar/95 text-sidebar-foreground border-r border-sidebar-border backdrop-blur-xl transition-all duration-300 z-30",
          collapsed ? "w-[78px]" : "w-[272px]"
        )}
      >
        {navContent()}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center h-12 border-t border-sidebar-border text-sidebar-foreground/60 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden animate-fade-in"
          onClick={onMobileClose}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[280px] flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-transform duration-300 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {navContent(onMobileClose)}
      </aside>
    </>
  );
}
