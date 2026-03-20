import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Search, Moon, Sun, Menu, LogOut, CheckCheck, FileText, Receipt, Calendar, CreditCard, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead, type AppNotification } from "@/hooks/use-notifications";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { GlobalSearch } from "@/components/GlobalSearch";

interface TopBarProps {
  onMobileMenuOpen: () => void;
}

function notifIcon(type: AppNotification["type"], metadata: Record<string, unknown>) {
  const entity = metadata?.entity as string | undefined;
  if (entity === "devis") return <FileText className="h-4 w-4" />;
  if (entity === "facture") return <Receipt className="h-4 w-4" />;
  if (entity === "mission") return <Calendar className="h-4 w-4" />;
  if (entity === "paiement") return <CreditCard className="h-4 w-4" />;
  if (type === "warning" || type === "error") return <AlertTriangle className="h-4 w-4" />;
  return <Info className="h-4 w-4" />;
}

function notifColorDot(type: AppNotification["type"]) {
  if (type === "success") return "bg-success";
  if (type === "warning") return "bg-warning";
  if (type === "error") return "bg-destructive";
  return "bg-info";
}

export function TopBar({ onMobileMenuOpen }: TopBarProps) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  // Cmd+K / Ctrl+K global shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      // Get profile and team details via join if possible, or secondary query
      const { data: profileData } = await supabase
        .from("profiles")
        .select("avatar_url, first_name, last_name")
        .eq("user_id", user.id)
        .maybeSingle();

      const { data: memberData } = await supabase
        .from("team_members")
        .select("team_id, teams(plan)")
        .eq("user_id", user.id)
        .maybeSingle();

      return {
        avatar_url: profileData?.avatar_url,
        first_name: profileData?.first_name,
        last_name: profileData?.last_name,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        team: memberData?.teams ? { plan: (memberData.teams as any).plan as string } : null
      };
    },
    enabled: !!user,
  });

  const { data: notifications = [] } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = notifications.filter((n) => !n.read_at).length;
  const unreadIds = notifications.filter((n) => !n.read_at).map((n) => n.id);

  const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || user?.email?.split("@")[0] || "Utilisateur";

  const handleNotifClick = (n: AppNotification) => {
    if (!n.read_at) markRead.mutate(n.id);
    const href = (n.metadata?.href as string) ?? "/notifications";
    navigate(href);
    setNotifOpen(false);
  };

  return (
    <header className="h-14 md:h-16 bg-card/88 backdrop-blur-xl border-b border-border/80 shadow-sm flex items-center justify-between px-4 md:px-6 sticky top-0 z-20">
      {/* Left: hamburger + search */}
      <div className="flex items-center gap-3 flex-1">
        <button
          onClick={onMobileMenuOpen}
          className="md:hidden p-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          <Menu className="h-5 w-5 text-muted-foreground" />
        </button>

        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-2 rounded-full border border-border/70 bg-secondary/55 px-3 py-2 text-muted-foreground hover:text-foreground hover:border-primary/20 transition-colors text-sm group"
        >
          <Search className="h-4 w-4" />
          <span className="hidden md:inline">Rechercher...</span>
          <kbd className="hidden md:inline-flex h-5 items-center gap-1 rounded-full border border-border bg-card px-1.5 text-[10px] font-medium text-muted-foreground">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1.5 md:gap-2">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
          title={theme === "light" ? "Mode sombre" : "Mode clair"}
        >
          {theme === "light" ? (
            <Moon className="h-5 w-5 text-muted-foreground" />
          ) : (
            <Sun className="h-5 w-5 text-muted-foreground" />
          )}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <Bell className={cn("h-5 w-5 text-muted-foreground", unreadCount > 0 && "text-foreground")} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center animate-in zoom-in-50">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <>
              {/* Click-outside overlay */}
              <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 top-12 w-[340px] bg-card border border-border/80 rounded-[calc(var(--radius)+8px)] shadow-card animate-fade-in z-50 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-semibold">Notifications</p>
                    {unreadCount > 0 && (
                      <span className="text-[10px] font-bold bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full">
                        {unreadCount} nouvelle{unreadCount > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={() => markAllRead.mutate(unreadIds)}
                        className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                        title="Tout marquer comme lu"
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => { setNotifOpen(false); navigate("/notifications"); }}
                      className="text-xs text-primary font-medium hover:underline"
                    >
                      Tout voir
                    </button>
                  </div>
                </div>

                {/* List */}
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                      <Bell className="h-8 w-8 mb-2 opacity-30" />
                      <p className="text-sm">Aucune notification</p>
                    </div>
                  ) : (
                    notifications.slice(0, 8).map((n) => (
                      <button
                        key={n.id}
                        onClick={() => handleNotifClick(n)}
                        className={cn(
                          "w-full flex items-start gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/60 border-b border-border/50 last:border-0",
                          !n.read_at && "bg-primary/5"
                        )}
                      >
                        <div className={cn("mt-0.5 p-1.5 rounded-lg shrink-0", {
                          "bg-success/10 text-success": n.type === "success",
                          "bg-warning/10 text-warning": n.type === "warning",
                          "bg-destructive/10 text-destructive": n.type === "error",
                          "bg-info/10 text-info": n.type === "info",
                        })}>
                          {notifIcon(n.type, n.metadata)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={cn("font-medium truncate", !n.read_at && "text-foreground")}>{n.title}</p>
                            {!n.read_at && <div className={cn("mt-1.5 w-2 h-2 rounded-full shrink-0", notifColorDot(n.type))} />}
                          </div>
                          <p className="text-muted-foreground text-xs mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-muted-foreground text-[10px] mt-1">
                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: fr })}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={async () => { await signOut(); navigate("/login"); }}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
          title="Déconnexion"
        >
          <LogOut className="h-5 w-5 text-muted-foreground" />
        </button>

        {/* User */}
        <div className="flex items-center gap-2 md:gap-3 pl-2 md:pl-3 border-l border-border">
          <div className="hidden md:flex flex-col items-end">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">{displayName}</p>
              {profile?.team?.plan && (
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider",
                  profile.team.plan === 'enterprise' && "bg-accent text-accent-foreground border border-accent-foreground/10",
                  profile.team.plan === 'pro' && "bg-primary/10 text-primary border border-primary/20",
                  profile.team.plan === 'solo' && "bg-info/10 text-info border border-info/20",
                  profile.team.plan === 'free' && "bg-muted text-muted-foreground"
                )}>
                  {profile.team.plan}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{user?.email ?? ""}</p>
          </div>
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" className="w-8 h-8 md:w-9 md:h-9 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-white">
              {(user?.email?.[0] ?? "U").toUpperCase()}
            </div>
          )}
        </div>
      </div>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
