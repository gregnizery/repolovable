import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export function useVehicleCosts(vehicleId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["vehicle_costs", vehicleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_costs")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .order("cost_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!vehicleId,
  });
}

export function useVehicleCostsSummary(vehicleId: string) {
  const { data: costs = [] } = useVehicleCosts(vehicleId);
  const total = costs.reduce((s, c) => s + Number(c.amount), 0);
  const byCategory: Record<string, number> = {};
  for (const c of costs) {
    byCategory[c.category] = (byCategory[c.category] || 0) + Number(c.amount);
  }
  return { total, byCategory, count: costs.length };
}

export function useCreateVehicleCost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: {
      vehicle_id: string;
      amount: number;
      cost_date?: string;
      category: string;
      description?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("vehicle_costs")
        .insert(item as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["vehicle_costs", (data as any).vehicle_id] });
      toast.success("Coût ajouté");
    },
    onError: (e) => toast.error("Erreur: " + e.message),
  });
}

export function useDeleteVehicleCost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, vehicleId }: { id: string; vehicleId: string }) => {
      const { error } = await supabase.from("vehicle_costs").delete().eq("id", id);
      if (error) throw error;
      return vehicleId;
    },
    onSuccess: (vehicleId) => {
      qc.invalidateQueries({ queryKey: ["vehicle_costs", vehicleId] });
      toast.success("Coût supprimé");
    },
    onError: (e) => toast.error("Erreur: " + e.message),
  });
}
