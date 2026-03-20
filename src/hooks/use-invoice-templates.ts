import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { getTeamId } from "./use-data";

// ============================================
// INVOICE ITEM TEMPLATES
// ============================================
export function useInvoiceItemTemplates() {
    const { user } = useAuth();
    return useQuery({
        queryKey: ["invoice_item_templates", user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("invoice_item_templates")
                .select("*")
                .order("name", { ascending: true });
            if (error) throw error;
            return data;
        },
        enabled: !!user,
    });
}

export function useCreateInvoiceItemTemplate() {
    const qc = useQueryClient();
    const { user } = useAuth();
    return useMutation({
        mutationFn: async (template: Omit<TablesInsert<"invoice_item_templates">, "user_id" | "team_id">) => {
            const team_id = await getTeamId(user!.id);
            const { data, error } = await supabase
                .from("invoice_item_templates")
                .insert({ ...template, team_id })
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["invoice_item_templates"] });
            toast.success("Modèle de ligne créé");
        },
        onError: (e) => toast.error("Erreur: " + e.message),
    });
}

export function useUpdateInvoiceItemTemplate() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...updates }: TablesUpdate<"invoice_item_templates"> & { id: string }) => {
            const { data, error } = await supabase
                .from("invoice_item_templates")
                .update(updates)
                .eq("id", id)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["invoice_item_templates"] });
            toast.success("Modèle mis à jour");
        },
        onError: (e) => toast.error("Erreur: " + e.message),
    });
}

export function useDeleteInvoiceItemTemplate() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("invoice_item_templates").delete().eq("id", id);
            if (error) throw error;
            return id;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["invoice_item_templates"] });
            toast.success("Modèle supprimé");
        },
        onError: (e) => toast.error("Erreur: " + e.message),
    });
}
