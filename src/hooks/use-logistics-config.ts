import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { getTeamId } from "@/hooks/use-data";

export interface LogisticsConfig {
  id: string;
  team_id: string;
  event_type: string;
  delivery_hours_before: number;
  pickup_hours_after: number;
  auto_transport: boolean;
  auto_packing_list: boolean;
  auto_checkout: boolean;
}

export function useLogisticsConfigs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["logistics_config"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("logistics_config")
        .select("*")
        .order("event_type");
      if (error) throw error;
      return data as LogisticsConfig[];
    },
    enabled: !!user,
  });
}

export function useUpsertLogisticsConfig() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (config: Omit<LogisticsConfig, "id" | "team_id">) => {
      const team_id = await getTeamId(user!.id);
      // Try update first
      const { data: existing } = await (supabase as any)
        .from("logistics_config")
        .select("id")
        .eq("team_id", team_id)
        .eq("event_type", config.event_type)
        .maybeSingle();

      if (existing) {
        const { error } = await (supabase as any)
          .from("logistics_config")
          .update({
            delivery_hours_before: config.delivery_hours_before,
            pickup_hours_after: config.pickup_hours_after,
            auto_transport: config.auto_transport,
            auto_packing_list: config.auto_packing_list,
            auto_checkout: config.auto_checkout,
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("logistics_config")
          .insert({ ...config, team_id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["logistics_config"] });
      toast.success("Configuration sauvegardée");
    },
    onError: (e: any) => toast.error("Erreur: " + e.message),
  });
}

export function useDeleteLogisticsConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("logistics_config").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["logistics_config"] });
      toast.success("Configuration supprimée");
    },
    onError: (e: any) => toast.error("Erreur: " + e.message),
  });
}
