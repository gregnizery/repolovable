import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ValidateMovementParams {
  materiel_id: string;
  mission_id: string;
  type: "sortie" | "retour";
  quantity: number;
}

interface ValidateResult {
  valid: boolean;
  error?: string;
  materiel?: { id: string; name: string; stock: number };
  mission?: { id: string; title: string };
  assigned?: number;
  already_out?: number;
  already_returned?: number;
  max_quantity?: number;
}

export function useValidateMovement() {
  return useMutation({
    mutationFn: async (params: ValidateMovementParams): Promise<ValidateResult> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Non authentifié");

      const res = await supabase.functions.invoke("validate-movement", {
        body: params,
      });

      if (res.error) throw new Error(res.error.message);
      return res.data as ValidateResult;
    },
  });
}

interface BatchMovementParams {
  mission_id: string;
  type: "sortie" | "retour";
  items: { materiel_id: string; quantity: number }[];
}

interface BatchResult {
  success: boolean;
  error?: string;
  details?: { materiel_id: string; error: string }[];
  processed?: { materiel_id: string; name: string; quantity: number }[];
  count?: number;
}

export function useBatchMovement() {
  return useMutation({
    mutationFn: async (params: BatchMovementParams): Promise<BatchResult> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Non authentifié");

      const res = await supabase.functions.invoke("batch-movement", {
        body: params,
      });

      if (res.error) throw new Error(res.error.message);
      return res.data as BatchResult;
    },
  });
}
