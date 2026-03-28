import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Bell,
  Calendar,
  CheckCheck,
  CreditCard,
  FileText,
  Info,
  LogOut,
  Menu,
  Moon,
  Receipt,
  Search,
  Sun,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { useTeam } from "@/hooks/use-team";
import { useWorkspace } from "@/hooks/use-workspace";
import { buildRelativeAppPath } from "@/lib/public-app-url";
import {
  type AppNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "@/hooks/use-notifications";
import { GlobalSearch } from "@/components/GlobalSearch";
import { getPageMeta } from "@/components/layout/navigation";
import { cn } from "@/lib/utils";

interface TopBarProps {
  onMobileMenuOpen: () => void;
}

type ProfileQueryData = {
  avatar_url: string | null;
  first_name: string | null;
  last_name: string | null;
};

function extractPlan(rawValue: unknown) {
  if (!rawValue || typeof rawValue !== "object") return null;
  if (!("plan" in rawValue)) return null;
  return typeof rawValue.plan === "string" ? rawValue.plan : null;
}

function notifIcon(type: AppNotification["type"], metadata: Record<string, unknown>) {
  const entity = typeof metadata.entity === "string" ? metadata.entity : undefined;
  if (entity === "devis") return <FileText className="h-4 w-4" />;
  if (entity === "facture") return <Receipt className="h-4 w-4" />;
  if (entity === "mission") return <Calendar className="h-4 w-4" />;
  if (entity === "paiement") return <CreditCard className="h-4 w-4" />;
  if (type === "warning" || type === "error") return <AlertTriangle className="h-4 w-4" />;
  return <Info className="h-4 w-4" />;
}

function notifDot(type: AppNotification["type"]) {
  if (type === "success") return "bg-success";
  if (type === "warning") return "bg-warning";
  if (type === "error") return "bg-destructive";
  return "bg-info";
}

export function TopBar({ onMobileMenuOpen }: TopBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const { memberships, activeWorkspaceIdentifier } = useWorkspace();
  const { data: teamMembership } = useTeam();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const pageMeta = getPageMeta(location.pathname);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const { data: profile } = useQuery<ProfileQueryData | null>({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("avatar_url, first_name, last_name")
        .eq("user_id", user.id)
        .maybeSingle();

      return {
        avatar_url: profileData?.avatar_url ?? null,
        first_name: profileData?.first_name ?? null,
        last_name: profileData?.last_name ?? null,
      };
    },
    enabled: !!user,
  });

  const { data: notifications = [] } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadNotifications = notifications.filter((notification) => !notification.read_at);
  const unreadIds = unreadNotifications.map((notification) => notification.id);
  const displayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    user?.email?.split("@")[0] ||
    "Utilisateur";
  const activeTeam = teamMembership?.teams;
  const activePlan = extractPlan(activeTeam ?? null);

  const iconButtonClass =
    "flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground";

  const handleNotifClick = (notification: AppNotification) => {
    if (!notification.read_at) markRead.mutate(notification.id);

    const href =
      notification.metadata && typeof notification.metadata.href === "string"
        ? notification.metadata.href
        : "/notifications";

    navigate(href);
    setNotifOpen(false);
  };

  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background">
      <div className="flex min-h-[72px] items-center justify-between gap-4 px-4 md:px-6 xl:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button onClick={onMobileMenuOpen} className={cn(iconButtonClass, "md:hidden")}>
            <Menu className="h-4 w-4" />
          </button>

          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{pageMeta.title}</p>
            <p className="truncate text-sm text-foreground md:text-base">{pageMeta.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden min-w-[260px] items-center gap-3 rounded-lg border border-border bg-background px-3 py-2 text-left text-sm text-muted-foreground shadow-sm transition-colors hover:border-primary/30 hover:text-foreground lg:flex"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 truncate">Recherche transversale</span>
            <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
          </button>

          <button onClick={() => setSearchOpen(true)} className={cn(iconButtonClass, "lg:hidden")}>
            <Search className="h-4 w-4" />
          </button>

          <button
            onClick={toggleTheme}
            className={iconButtonClass}
            title={theme === "light" ? "Activer le mode sombre" : "Activer le mode clair"}
          >
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>

          <div className="relative">
            <button onClick={() => setNotifOpen((value) => !value)} className={cn(iconButtonClass, "relative")}>
              <Bell className={cn("h-4 w-4", unreadNotifications.length > 0 && "text-foreground")} />
              {unreadNotifications.length > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                  {unreadNotifications.length > 9 ? "9+" : unreadNotifications.length}
                </span>
              ) : null}
            </button>

            {notifOpen ? (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                <div className="absolute right-0 top-12 z-50 w-[360px] overflow-hidden rounded-2xl border border-border/80 bg-card shadow-card">
                  <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-foreground">Notifications</p>
                      <p className="text-xs text-muted-foreground">{unreadNotifications.length} non lue(s)</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {unreadNotifications.length > 0 ? (
                        <button
                          onClick={() => markAllRead.mutate(unreadIds)}
                          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <CheckCheck className="h-4 w-4" />
                        </button>
                      ) : null}
                      <button
                        onClick={() => {
                          setNotifOpen(false);
                          navigate("/notifications");
                        }}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Tout voir
                      </button>
                    </div>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="py-10 text-center text-sm text-muted-foreground">Aucune notification.</div>
                    ) : (
                      notifications.slice(0, 8).map((notification) => (
                        <button
                          key={notification.id}
                          onClick={() => handleNotifClick(notification)}
                          className={cn(
                            "flex w-full items-start gap-3 border-b border-border/60 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-muted/40",
                            !notification.read_at && "bg-muted/40",
                          )}
                        >
                          <div className="mt-0.5 rounded-lg border border-border/80 bg-background p-2 text-muted-foreground">
                            {notifIcon(notification.type, notification.metadata)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="truncate text-sm font-medium text-foreground">{notification.title}</p>
                              {!notification.read_at ? (
                                <span className={cn("mt-1 h-2 w-2 rounded-full", notifDot(notification.type))} />
                              ) : null}
                            </div>
                            <p className="line-clamp-2 text-xs text-muted-foreground">{notification.message}</p>
                            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: fr })}
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </div>

          <div className="hidden items-center gap-2 rounded-lg border border-border/80 bg-card px-2 py-1.5 sm:flex">
            <div className="min-w-0 px-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
                {activePlan ? (
                  <span className="rounded-md border border-primary/20 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] uppercase text-primary">
                    {activePlan}
                  </span>
                ) : null}
              </div>
              <p className="max-w-[170px] truncate text-xs text-muted-foreground">
                {activeTeam?.name ?? user?.email ?? ""}
              </p>
            </div>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="h-8 w-8 rounded-lg object-cover" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground">
                {(user?.email?.[0] ?? "U").toUpperCase()}
              </div>
            )}
          </div>

          <button
            onClick={async () => {
              await signOut();
              navigate(buildRelativeAppPath("/login", { workspaceIdentifier: activeWorkspaceIdentifier }));
            }}
            className={iconButtonClass}
            title="Déconnexion"
          >
            <LogOut className="h-4 w-4" />
          </button>

          {memberships.length > 1 ? (
            <button
              onClick={() =>
                navigate(
                  buildRelativeAppPath("/select-workspace", {
                    workspaceIdentifier: activeWorkspaceIdentifier,
                    searchParams: { redirect: location.pathname + location.search },
                  }),
                )
              }
              className="hidden rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground md:flex"
              title="Changer de workspace"
            >
              Workspace
            </button>
          ) : null}
        </div>

        <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      </div>
    </header>
  );
}
