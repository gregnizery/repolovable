import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export function useVehicleMissions(vehicleId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["vehicle_missions", vehicleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transport_plans")
        .select("id, type, status, scheduled_at, address, mission_id, missions(id, title, start_date, end_date, status, location, clients(name))")
        .eq("vehicle_id", vehicleId)
        .order("scheduled_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!vehicleId,
  });
}
