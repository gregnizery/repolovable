import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTeam } from "./use-team";

export interface AuditLog {
    id: string;
    team_id: string;
    user_id: string | null;
    action: string;
    table_name: string;
    record_id: string | null;
    old_data: Record<string, unknown>;
    new_data: Record<string, unknown>;
    created_at: string;
    profiles?: {
        first_name: string | null;
        last_name: string | null;
    };
}

export function useAuditLogs() {
    const { data: teamData } = useTeam();
    const teamId = (teamData?.teams as { id?: string } | null)?.id;

    return useQuery({
        queryKey: ["audit-logs", teamId],
        queryFn: async () => {
            if (!teamId) return [];
            const { data, error } = await supabase
                .from("audit_logs")
                .select(`
          *,
          profiles:user_id (
            first_name,
            last_name
          )
        `)
                .eq("team_id", teamId)
                .order("created_at", { ascending: false })
                .limit(100);

            if (error) throw error;
            return data as AuditLog[];
        },
        enabled: !!teamId,
    });
}
