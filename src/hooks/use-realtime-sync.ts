import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribe to Supabase Realtime postgres_changes on a table
 * and automatically invalidate the given React Query keys on any change.
 */
export function useRealtimeSync(
  table: "materiel" | "stock_movements" | "mission_materiel" | "missions" | "devis" | "devis_items" | "factures" | "facture_items" | "paiements" | "clients" | "payment_proofs",
  queryKeys: string[][]
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`realtime-${table}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          queryKeys.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: key });
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, queryClient]); // queryKeys are stable arrays defined at call site
}
