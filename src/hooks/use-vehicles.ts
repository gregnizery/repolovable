import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export function useVehicles() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useVehicleAssignments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["vehicle_assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transport_plans")
        .select("vehicle_id, type, status, scheduled_at, mission_id, missions(title)")
        .not("vehicle_id", "is", null)
        .in("status", ["planifié", "en_route"]);
      if (error) throw error;
      const map: Record<string, { missionTitle: string; type: string; status: string; scheduledAt: string | null }> = {};
      for (const tp of data || []) {
        if (tp.vehicle_id) {
          map[tp.vehicle_id] = {
            missionTitle: (tp.missions as any)?.title || "Mission",
            type: tp.type,
            status: tp.status,
            scheduledAt: tp.scheduled_at,
          };
        }
      }
      return map;
    },
    enabled: !!user,
  });
}

export function useVehicleWeekTransports(from: string, to: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["vehicle_week_transports", from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transport_plans")
        .select("id, vehicle_id, type, status, scheduled_at, address, mission_id, missions(title)")
        .not("vehicle_id", "is", null)
        .gte("scheduled_at", from)
        .lt("scheduled_at", to)
        .order("scheduled_at");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useCreateVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: { name: string; type?: string; plate_number?: string; capacity?: string; notes?: string }) => {
      const { data, error } = await supabase
        .from("vehicles")
        .insert(item as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vehicles"] }); toast.success("Véhicule ajouté"); },
    onError: (e) => toast.error("Erreur: " + e.message),
  });
}

export function useUpdateVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from("vehicles")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vehicles"] }); toast.success("Véhicule mis à jour"); },
    onError: (e) => toast.error("Erreur: " + e.message),
  });
}

export function useDeleteVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vehicles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vehicles"] }); toast.success("Véhicule supprimé"); },
    onError: (e) => toast.error("Erreur: " + e.message),
  });
}
