import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { getTeamId } from "@/hooks/use-data";

export function useExpenses() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["expenses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*, suppliers(name)")
        .order("expense_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (item: { description: string; amount: number; category: string; expense_date: string; supplier_id?: string | null; notes?: string | null }) => {
      const team_id = await getTeamId(user!.id);
      const { data, error } = await supabase
        .from("expenses")
        .insert({ ...item, team_id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); toast.success("Dépense enregistrée"); },
    onError: (e) => toast.error("Erreur: " + e.message),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); toast.success("Dépense supprimée"); },
    onError: (e) => toast.error("Erreur: " + e.message),
  });
}
