import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { getTeamId } from "@/hooks/use-data";

export function useSupplierInvoices() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["supplier_invoices", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_invoices")
        .select("*, suppliers(name)")
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useCreateSupplierInvoice() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (item: { supplier_id?: string | null; number: string; date: string; due_date?: string | null; total_ht: number; tva_rate: number; total_ttc: number; status?: string; notes?: string | null }) => {
      const team_id = await getTeamId(user!.id);
      const { data, error } = await supabase
        .from("supplier_invoices")
        .insert({ ...item, team_id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["supplier_invoices"] }); toast.success("Facture fournisseur enregistrée"); },
    onError: (e) => toast.error("Erreur: " + e.message),
  });
}

export function useUpdateSupplierInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from("supplier_invoices")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["supplier_invoices"] }); toast.success("Facture mise à jour"); },
    onError: (e) => toast.error("Erreur: " + e.message),
  });
}

export function useDeleteSupplierInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("supplier_invoices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["supplier_invoices"] }); toast.success("Facture supprimée"); },
    onError: (e) => toast.error("Erreur: " + e.message),
  });
}

export function useEquipmentCheckouts(missionId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["equipment_checkouts", missionId],
    queryFn: async () => {
      let query = supabase.from("equipment_checkouts").select("*, materiel(name)").order("checked_at", { ascending: false });
      if (missionId) query = query.eq("mission_id", missionId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useCreateCheckout() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (item: { mission_id: string; materiel_id: string; type: string; quantity: number; condition?: string; notes?: string }) => {
      const team_id = await getTeamId(user!.id);
      const { data, error } = await supabase
        .from("equipment_checkouts")
        .insert({ ...item, team_id, checked_by: user!.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["equipment_checkouts"] }); toast.success("Check enregistré"); },
    onError: (e) => toast.error("Erreur: " + e.message),
  });
}

export function useTransportPlans(missionId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["transport_plans", missionId],
    queryFn: async () => {
      let query = supabase.from("transport_plans").select("*").order("scheduled_at", { ascending: true });
      if (missionId) query = query.eq("mission_id", missionId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useCreateTransportPlan() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (item: { mission_id: string; type: string; scheduled_at?: string; address?: string; vehicle?: string; driver_name?: string; notes?: string }) => {
      const team_id = await getTeamId(user!.id);
      const { data, error } = await supabase
        .from("transport_plans")
        .insert({ ...item, team_id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["transport_plans"] }); toast.success("Transport planifié"); },
    onError: (e) => toast.error("Erreur: " + e.message),
  });
}

export function useUpdateTransportStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase
        .from("transport_plans")
        .update({ status })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transport_plans"] });
      toast.success("Statut transport mis à jour");
    },
    onError: (e) => toast.error("Erreur: " + e.message),
  });
}

export function useUpdateTransportPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; driver_name?: string; vehicle?: string; address?: string; notes?: string }) => {
      const { data, error } = await supabase
        .from("transport_plans")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transport_plans"] });
      toast.success("Transport mis à jour");
    },
    onError: (e) => toast.error("Erreur: " + e.message),
  });
}
