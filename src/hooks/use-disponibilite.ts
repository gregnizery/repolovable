import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DispoResult {
  stock_total: number;
  quantite_assignee: number;
  quantite_bloquee_retours: number;
  quantite_disponible: number;
  conflits: Array<{
    type: string;
    mission_id?: string;
    mission_title?: string;
    quantity: number;
    [key: string]: unknown;
  }>;
}

/**
 * Check availability of a materiel for a given date range using the DB function.
 */
export function useDisponibilite(
  materielId: string | undefined,
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  excludeMissionId?: string | null
) {
  return useQuery<DispoResult | null>({
    queryKey: ["disponibilite", materielId, startDate, endDate, excludeMissionId],
    queryFn: async () => {
      if (!materielId || !startDate || !endDate) return null;
       
      const { data, error } = await (supabase.rpc as (...args: unknown[]) => Promise<{ data: unknown; error: unknown }>)("verifier_disponibilite_materiel", {
        p_materiel_id: materielId,
        p_start: new Date(startDate).toISOString(),
        p_end: new Date(endDate).toISOString(),
        p_exclude_mission_id: excludeMissionId || null,
        p_buffer_hours: 12,
        p_missing_return_days: 7,
      });
      if (error) throw error;
      return (data as DispoResult[])?.[0] ?? null;
    },
    enabled: !!materielId && !!startDate && !!endDate,
    staleTime: 10_000,
  });
}

/**
 * Check availability of multiple materiels at once.
 */
export function useDisponibiliteMultiple(
  materielIds: string[],
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  excludeMissionId?: string | null
) {
  return useQuery<Map<string, DispoResult>>({
    queryKey: ["disponibilite_multiple", [...materielIds].sort().join(","), startDate, endDate, excludeMissionId],
    queryFn: async () => {
      if (!startDate || !endDate || materielIds.length === 0) return new Map();

      const results = await Promise.all(
        materielIds.map(async (id) => {
           
          const { data, error } = await (supabase.rpc as (...args: unknown[]) => Promise<{ data: unknown; error: unknown }>)("verifier_disponibilite_materiel", {
            p_materiel_id: id,
            p_start: new Date(startDate!).toISOString(),
            p_end: new Date(endDate!).toISOString(),
            p_exclude_mission_id: excludeMissionId || null,
            p_buffer_hours: 12,
            p_missing_return_days: 7,
          });
          if (error) return [id, null] as const;
          const row = (data as DispoResult[])?.[0] ?? null;
          return [id, row] as const;
        })
      );

      const map = new Map<string, DispoResult>();
      for (const [id, result] of results) {
        if (result) map.set(id, result);
      }
      return map;
    },
    enabled: !!startDate && !!endDate && materielIds.length > 0,
    staleTime: 10_000,
  });
}
