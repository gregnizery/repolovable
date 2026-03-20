import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Bell, CheckCheck, Clock3, FileText, Receipt, Calendar,
  CreditCard, AlertTriangle, Info, Check, Trash2, Filter
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  type AppNotification,
} from "@/hooks/use-notifications";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";

// ── Icon & colour helpers ────────────────────────────────────────────────────
function notifIcon(n: AppNotification) {
  const entity = n.metadata?.entity as string | undefined;
  const cls = "h-5 w-5";
  if (entity === "devis") return <FileText className={cls} />;
  if (entity === "facture") return <Receipt className={cls} />;
  if (entity === "mission") return <Calendar className={cls} />;
  if (entity === "paiement") return <CreditCard className={cls} />;
  if (n.type === "warning" || n.type === "error") return <AlertTriangle className={cls} />;
  return <Info className={cls} />;
}

function iconBg(type: AppNotification["type"]) {
  if (type === "success") return "bg-success/10 text-success";
  if (type === "warning") return "bg-warning/10 text-warning";
  if (type === "error") return "bg-destructive/10 text-destructive";
  return "bg-info/10 text-info";
}

function dotColor(type: AppNotification["type"]) {
  if (type === "success") return "bg-success";
  if (type === "warning") return "bg-warning";
  if (type === "error") return "bg-destructive";
  return "bg-info";
}

type FilterType = "all" | "unread" | "info" | "success" | "warning" | "error";

const FILTERS: { value: FilterType; label: string }[] = [
  { value: "all", label: "Toutes" },
  { value: "unread", label: "Non lues" },
  { value: "success", label: "Succès" },
  { value: "warning", label: "Alertes" },
  { value: "error", label: "Erreurs" },
  { value: "info", label: "Info" },
];

// ── Delete mutation ──────────────────────────────────────────────────────────
function useDeleteNotification() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("notification_events")
        .delete()
        .eq("id", id)
        .eq("user_id", user?.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", user?.id] }),
  });
}

// ── Component ────────────────────────────────────────────────────────────────
export default function Notifications() {
  const [filter, setFilter] = useState<FilterType>("all");
  const { data: notifications = [], isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotif = useDeleteNotification();

  const unreadIds = notifications.filter((n) => !n.read_at).map((n) => n.id);
  const unreadCount = unreadIds.length;

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.read_at;
    if (filter === "all") return true;
    return n.type === filter;
  });

  // Group by date
  const groups = filtered.reduce<Record<string, AppNotification[]>>((acc, n) => {
    const dateKey = format(new Date(n.created_at), "d MMMM yyyy", { locale: fr });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(n);
    return acc;
  }, {});

  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <Bell className="h-6 w-6 text-primary" /> Notifications
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {unreadCount > 0
                ? `${unreadCount} notification${unreadCount > 1 ? "s" : ""} non lue${unreadCount > 1 ? "s" : ""}`
                : "Tout est à jour"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={() => markAllRead.mutate(unreadIds)}
              disabled={markAllRead.isPending}
              className="gap-2 rounded-xl"
            >
              <CheckCheck className="h-4 w-4" /> Tout marquer comme lu
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "text-xs font-medium px-3 py-1.5 rounded-full transition-colors",
                filter === f.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {f.label}
              {f.value === "unread" && unreadCount > 0 && (
                <span className="ml-1.5 bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Empty state */}
        {!isLoading && filtered.length === 0 && (
          <Card className="shadow-card border-border/50">
            <CardContent className="py-16 flex flex-col items-center text-muted-foreground">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                <Bell className="h-6 w-6 opacity-40" />
              </div>
              <p className="font-semibold text-foreground">Aucune notification</p>
              <p className="text-sm mt-1">
                {filter === "unread" ? "Toutes vos notifications ont été lues." : "Vous n'avez aucune notification pour cette catégorie."}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Grouped list */}
        {Object.entries(groups).map(([date, items]) => (
          <div key={date} className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">{date}</p>
            <Card className="shadow-card border-border/50 overflow-hidden">
              {items.map((n, idx) => (
                <div
                  key={n.id}
                  className={cn(
                    "flex items-start gap-4 px-4 py-4 transition-colors",
                    idx < items.length - 1 && "border-b border-border/50",
                    !n.read_at && "bg-primary/[0.03]"
                  )}
                >
                  {/* Icon */}
                  <div className={cn("p-2 rounded-xl shrink-0 mt-0.5", iconBg(n.type))}>
                    {notifIcon(n)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={cn("font-semibold text-sm", !n.read_at ? "text-foreground" : "text-foreground/80")}>{n.title}</p>
                        {!n.read_at && <div className={cn("w-2 h-2 rounded-full shrink-0", dotColor(n.type))} />}
                      </div>
                      <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0 mt-0.5">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: fr })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {!n.read_at && (
                      <button
                        onClick={() => markRead.mutate(n.id)}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        title="Marquer comme lu"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotif.mutate(n.id)}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                      title="Supprimer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </Card>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
