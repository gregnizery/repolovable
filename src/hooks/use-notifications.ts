import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { useWorkspace } from "@/hooks/use-workspace";

export interface AppNotification {
    id: string;
    team_id: string;
    user_id: string;
    channel: string;
    type: "info" | "success" | "warning" | "error";
    title: string;
    message: string;
    status: string;
    read_at: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
}

export function useNotifications() {
    const { user } = useAuth();
    const { activeTeamId } = useWorkspace();
    const qc = useQueryClient();

    const query = useQuery<AppNotification[]>({
        queryKey: ["notifications", user?.id, activeTeamId],
        queryFn: async () => {
            if (!user || !activeTeamId) return [];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data, error } = await (supabase as any)
                .from("notification_events")
                .select("*")
                .eq("user_id", user.id)
                .eq("team_id", activeTeamId)
                .order("created_at", { ascending: false })
                .limit(50);
            if (error) throw error;
            return data ?? [];
        },
        enabled: !!user && !!activeTeamId,
    });

    // Real-time subscription
    useEffect(() => {
        if (!user || !activeTeamId) return;
        const channel = supabase
            .channel(`notifications-realtime:${user.id}:${activeTeamId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "notification_events",
                    filter: `user_id=eq.${user.id}`,
                },
                () => {
                    qc.invalidateQueries({ queryKey: ["notifications", user.id, activeTeamId] });
                }
            )
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [activeTeamId, qc, user]);

    return query;
}

export function useUnreadNotificationCount() {
    const { data: notifications = [] } = useNotifications();
    return notifications.filter((n) => !n.read_at).length;
}

export function useMarkNotificationRead() {
    const { user } = useAuth();
    const { activeTeamId } = useWorkspace();
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase as any)
                .from("notification_events")
                .update({ read_at: new Date().toISOString(), status: "read" })
                .eq("id", id)
                .eq("user_id", user?.id)
                .eq("team_id", activeTeamId);
            if (error) throw error;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", user?.id, activeTeamId] }),
    });
}

export function useMarkAllNotificationsRead() {
    const { user } = useAuth();
    const { activeTeamId } = useWorkspace();
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (ids: string[]) => {
            if (!ids.length) return;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase as any)
                .from("notification_events")
                .update({ read_at: new Date().toISOString(), status: "read" })
                .in("id", ids)
                .eq("user_id", user?.id)
                .eq("team_id", activeTeamId);
            if (error) throw error;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", user?.id, activeTeamId] }),
    });
}

// Helper: create a notification programmatically from the frontend
export async function createNotification(params: {
    teamId: string;
    userId: string;
    type: AppNotification["type"];
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
}) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
        .from("notification_events")
        .insert({
            team_id: params.teamId,
            user_id: params.userId,
            channel: "in_app",
            type: params.type,
            title: params.title,
            message: params.message,
            status: "sent",
            metadata: params.metadata ?? {},
        });
    return error;
}
