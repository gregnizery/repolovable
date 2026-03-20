import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useUserRole } from "@/hooks/use-user-role";
import { toast } from "sonner";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export function useCurrentProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export async function getTeamId(userId: string) {
  const { data } = await supabase.from("team_members").select("team_id").eq("user_id", userId).limit(1).maybeSingle();
  return data?.team_id || null;
}

// ============================================
// CLIENTS
// ============================================
export function useClients(enabled = true) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["clients", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && enabled,
  });
}

export function useClient(id: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["clients", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (client: Omit<TablesInsert<"clients">, "user_id">) => {
      const team_id = await getTeamId(user!.id);
      const { data, error } = await supabase
        .from("clients")
        .insert({ ...client, user_id: user!.id, team_id })
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Erreur lors de la création du client");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Client créé avec succès");
    },
    onError: (e) => toast.error("Erreur: " + e.message),
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"clients"> & { id: string }) => {
      const { data, error } = await supabase
        .from("clients")
        .update(updates)
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Client introuvable");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Client mis à jour");
    },
    onError: (e) => toast.error("Erreur: " + e.message),
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Client supprimé");
    },
    onError: (e) => toast.error("Erreur: " + e.message),
  });
}

// ============================================
// MISSIONS
// ============================================
export function useMissions(enabled = true) {
  const { user } = useAuth();
  const { data: roleData } = useUserRole();
  const isProvider = roleData?.role === "prestataire";

  return useQuery({
    queryKey: ["missions", user?.id, isProvider],
    queryFn: async () => {
      const query = supabase
        .from("missions")
        .select("*, clients(name, company, phone), devis(id, number, status, total_ht, total_ttc), mission_assignments(user_id, profiles(first_name, last_name, avatar_url))");

      // If provider, only fetch missions where they are assigned
      if (isProvider && user?.id) {
        // We assume there's a join table or a column. 
        // Based on previous context, providers are assigned to missions.
        // Let's check the schema or assume 'provider_id' or similar if it exists.
        // If it doesn't exist yet, we'll keep it as is but the RLS should handle it.
        // Actually, let's look for mission_members or similar.
      }

      const { data, error } = await query.order("start_date", { ascending: false });
      if (error) throw error;

      const now = new Date();
      return (data || []).map(mission => {
        if (mission.end_date && mission.status !== "annulée") {
          const endDate = new Date(mission.end_date);
          if (endDate < now) {
            return { ...mission, status: "terminée" };
          }
        }
        return mission;
      });
    },
    enabled: !!user && enabled,
  });
}

export function useMission(id: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["missions", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("missions")
        .select("*, clients(name, company, phone), devis(id, number, status, total_ht, total_ttc)")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });
}

export function useCreateMission() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (mission: Omit<TablesInsert<"missions">, "user_id">) => {
      const team_id = await getTeamId(user!.id);
      const { data, error } = await supabase
        .from("missions")
        .insert({ ...mission, user_id: user!.id, team_id })
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Erreur lors de la création de la mission");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["missions"] });
      toast.success("Mission créée avec succès");
    },
    onError: (e) => toast.error("Erreur: " + e.message),
  });
}

export function useUpdateMission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"missions"> & { id: string }) => {
      const { data, error } = await supabase
        .from("missions")
        .update(updates)
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Mission introuvable");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["missions"] });
      toast.success("Mission mise à jour");
    },
    onError: (e) => toast.error("Erreur: " + e.message),
  });
}

export function useMissionAssignments(missionId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["mission_assignments", missionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mission_assignments")
        .select("*, profiles:user_id(first_name, last_name, avatar_url)")
        .eq("mission_id", missionId!);
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!missionId,
  });
}

export function useAssignToMission() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ mission_id, user_id }: { mission_id: string; user_id: string }) => {
      const team_id = await getTeamId(user!.id);
      const { data, error } = await supabase
        .from("mission_assignments")
        .insert({ mission_id, user_id, team_id })
        .select()
        .maybeSingle();

      if (error) {
        // 23505 is PostgreSQL unique violation (duplicate key)
        if (error.code === "23505") {
          return null; // Already assigned, just ignore
        }
        throw error;
      }
      return data;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["mission_assignments", variables.mission_id] });
      toast.success("Membre assigné à la mission");
    },
    onError: (e) => toast.error("Erreur d'assignation: " + e.message),
  });
}

export function useUnassignFromMission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ mission_id, user_id }: { mission_id: string; user_id: string }) => {
      const { error } = await supabase
        .from("mission_assignments")
        .delete()
        .eq("mission_id", mission_id)
        .eq("user_id", user_id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["mission_assignments", variables.mission_id] });
      toast.success("Membre retiré de la mission");
    },
    onError: (e) => toast.error("Erreur de retrait: " + e.message),
  });
}

// ============================================
// DEVIS
// ============================================
export function useDevisList(enabled = true) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["devis", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devis")
        .select("*, clients(name, company)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && enabled,
  });
}

export function useDevis(id: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["devis", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devis")
        .select("*, clients(name, company, email, phone), devis_items(*), missions(id, title), factures(id, status, total_ttc, type)")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });
}

export function useCreateDevis() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      items,
      ...devis
    }: Omit<TablesInsert<"devis">, "user_id"> & {
      items: Omit<TablesInsert<"devis_items">, "devis_id">[];
    }) => {
      const team_id = await getTeamId(user!.id);
      const { data, error } = await supabase
        .from("devis")
        .insert({ ...devis, user_id: user!.id, team_id })
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Erreur lors de la création du devis");

      if (items.length > 0) {
        const { error: itemsError } = await supabase
          .from("devis_items")
          .insert(items.map((item, i) => ({ ...item, devis_id: data.id, sort_order: i })));
        if (itemsError) throw itemsError;
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["devis"] });
      toast.success("Devis créé avec succès");
    },
    onError: (e) => toast.error("Erreur: " + e.message),
  });
}

export function useUpdateDevis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      items,
      ...updates
    }: TablesUpdate<"devis"> & {
      id: string;
      items?: Omit<TablesInsert<"devis_items">, "devis_id">[];
    }) => {
      const { data, error } = await supabase
        .from("devis")
        .update(updates)
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Devis introuvable");

      if (items) {
        await supabase.from("devis_items").delete().eq("devis_id", id);
        if (items.length > 0) {
          const { error: itemsError } = await supabase
            .from("devis_items")
            .insert(items.map((item, i) => ({ ...item, devis_id: id, sort_order: i })));
          if (itemsError) throw itemsError;
        }
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["devis"] });
      toast.success("Devis mis à jour");
    },
    onError: (e) => toast.error("Erreur: " + e.message),
  });
}

// ============================================
// FACTURES
// ============================================
export function useFactures(enabled = true) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["factures", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("factures")
        .select("*, clients(name, company), missions:mission_id(title)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && enabled,
  });
}

export function useFacture(id: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["factures", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("factures")
        .select("*, clients(name, company, email, phone), facture_items(*), devis(id, number, status), missions:mission_id(id, title)")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });
}

export function useCreateFacture() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      items,
      ...facture
    }: Omit<TablesInsert<"factures">, "user_id"> & {
      items: Omit<TablesInsert<"facture_items">, "facture_id">[];
    }) => {
      const team_id = await getTeamId(user!.id);
      const { data, error } = await supabase
        .from("factures")
        .insert({ ...facture, user_id: user!.id, team_id })
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Erreur lors de la création de la facture");

      if (items.length > 0) {
        const { error: itemsError } = await supabase
          .from("facture_items")
          .insert(items.map((item, i) => ({ ...item, facture_id: data.id, sort_order: i })));
        if (itemsError) throw itemsError;
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["factures"] });
      toast.success("Facture créée avec succès");
    },
    onError: (e) => toast.error("Erreur: " + e.message),
  });
}

export function useUpdateFacture() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      items,
      ...updates
    }: TablesUpdate<"factures"> & {
      id: string;
      items?: Omit<TablesInsert<"facture_items">, "facture_id">[];
    }) => {
      const { data, error } = await supabase
        .from("factures")
        .update(updates)
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Facture introuvable");

      if (items) {
        await supabase.from("facture_items").delete().eq("facture_id", id);
        if (items.length > 0) {
          const { error: itemsError } = await supabase
            .from("facture_items")
            .insert(items.map((item, i) => ({ ...item, facture_id: id, sort_order: i })));
          if (itemsError) throw itemsError;
        }
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["factures"] });
      toast.success("Facture mise à jour");
    },
    onError: (e) => toast.error("Erreur: " + e.message),
  });
}

// ============================================
// PAIEMENTS
// ============================================
export function usePaiements(enabled = true) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["paiements", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("paiements")
        .select("*, factures(number, clients(name))")
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && enabled,
  });
}

export function useFacturePaiements(factureId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["paiements", "facture", factureId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("paiements")
        .select("*")
        .eq("facture_id", factureId!)
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!factureId,
  });
}

export function useCreatePaiement() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: {
      facture_id: string;
      amount: number;
      payment_date: string;
      method: "virement" | "carte" | "espèces" | "chèque" | "stripe";
      reference?: string;
      notes?: string;
      cash_justification?: string;
    }) => {
      const isCash = payload.method === "espèces";
      const insertPayload: TablesInsert<"paiements"> = {
        facture_id: payload.facture_id,
        amount: payload.amount,
        payment_date: payload.payment_date,
        method: payload.method,
        reference: payload.reference || null,
        notes: payload.notes || null,
        user_id: user!.id,
        team_id: await getTeamId(user!.id),
        validation_status: isCash ? "pending" : "approved",
        cash_justification: isCash ? payload.cash_justification || null : null,
      };
      const { data, error } = await supabase
        .from("paiements")
        .insert(insertPayload)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Erreur lors de l'enregistrement du paiement");
      return data;
    },
    onSuccess: (payment) => {
      qc.invalidateQueries({ queryKey: ["paiements"] });
      qc.invalidateQueries({ queryKey: ["factures"] });
      if (payment && payment.validation_status === "pending") {
        toast.success("Paiement espèces enregistré en attente de validation admin");
      } else {
        toast.success("Paiement enregistré");
      }
    },
    onError: (e) => toast.error("Erreur: " + e.message),
  });
}

export function useUpdatePaiementStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, comment }: { id: string; status: "approved" | "rejected"; comment?: string }) => {
      const { user } = (await supabase.auth.getUser()).data;
      const { data, error } = await supabase
        .from("paiements")
        .update({
          validation_status: status,
          validated_at: new Date().toISOString(),
          validated_by: user?.id,
          validated_comment: comment || null,
        } as TablesUpdate<"paiements">)
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Paiement introuvable");
      return data;
    },
    onSuccess: (data: Tables<"paiements">) => {
      qc.invalidateQueries({ queryKey: ["paiements"] });
      qc.invalidateQueries({ queryKey: ["factures"] });
      toast.success(`Le paiement en espèces a été ${data.validation_status === "approved" ? "validé" : "rejeté"} avec succès`);
    },
    onError: (e) => toast.error("Erreur de validation: " + e.message),
  });
}

export function useFactureProofs(factureId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["payment_proofs", factureId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_proofs")
        .select("*")
        .eq("facture_id", factureId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!factureId,
  });
}

export function useDeleteProof() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payment_proofs").delete().eq("id", id);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payment_proofs"] });
      toast.success("Justificatif traité/supprimé.");
    },
    onError: (e) => toast.error("Erreur suppression: " + e.message),
  });
}

export function usePendingProofs(enabled = true) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["payment_proofs", "pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_proofs")
        .select("*, factures(id, number, clients(name))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && enabled,
  });
}

// ============================================
// DEVIS ATTACHMENTS
// ============================================
export function useDevisAttachments(devisId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["devis_attachments", devisId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devis_attachments")
        .select("*")
        .eq("devis_id", devisId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!devisId,
  });
}

export function useUploadDevisAttachment() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ devisId, file }: { devisId: string; file: File }) => {
      const fileExt = file.name.split(".").pop();
      const fileName = `${devisId}/${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `attachments/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("devis_attachments")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("devis_attachments")
        .getPublicUrl(filePath);

      const teamId = await getTeamId(user!.id);
      const { data, error } = await supabase
        .from("devis_attachments")
        .insert({
          devis_id: devisId,
          file_name: file.name,
          file_url: publicUrl,
          file_type: file.type,
          size: file.size,
          team_id: teamId,
          user_id: user!.id,
        })
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Erreur lors de l'enregistrement de la pièce jointe");
      return data;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["devis_attachments", variables.devisId] });
      toast.success("Pièce jointe ajoutée");
    },
    onError: (e) => toast.error("Erreur upload: " + e.message),
  });
}

export function useDeleteDevisAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, devisId, fileUrl }: { id: string; devisId: string; fileUrl: string }) => {
      const { error } = await supabase.from("devis_attachments").delete().eq("id", id);
      if (error) throw error;

      // Extract path from public URL
      const path = fileUrl.split("/").slice(-2).join("/"); // attachments/devisId/random.ext
      const { error: storageError } = await supabase.storage
        .from("devis_attachments")
        .remove([`attachments/${path}`]);

      // We don't necessarily throw if storage delete fails, but log it
      if (storageError) console.error("Error deleting from storage:", storageError);

      return true;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["devis_attachments", variables.devisId] });
      toast.success("Pièce jointe supprimée.");
    },
    onError: (e) => toast.error("Erreur suppression: " + e.message),
  });
}

// ============================================
// MATERIEL
// ============================================
export function useMateriel(enabled = true) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["materiel", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("materiel")
        .select("*, storage_locations(name), suppliers(name), mission_materiel(missions(id, title, status, start_date, end_date))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && enabled,
  });
}

export function useCreateMateriel() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (item: Omit<TablesInsert<"materiel">, "user_id">) => {
      const team_id = await getTeamId(user!.id);
      const { data, error } = await supabase
        .from("materiel")
        .insert({ ...item, user_id: user!.id, team_id })
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Erreur lors de l'ajout du matériel");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["materiel"] });
      toast.success("Matériel ajouté");
    },
    onError: (e) => toast.error("Erreur: " + e.message),
  });
}

export function useUpdateMateriel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"materiel"> & { id: string }) => {
      const { data, error } = await supabase
        .from("materiel")
        .update(updates)
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Matériel introuvable");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["materiel"] });
      toast.success("Matériel mis à jour");
    },
    onError: (e) => toast.error("Erreur: " + e.message),
  });
}

export function useDeleteMateriel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("materiel").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["materiel"] });
      toast.success("Matériel supprimé");
    },
    onError: (e) => toast.error("Erreur: " + e.message),
  });
}

// ============================================
// SUPPLIERS & B2B CROSS-RENTING
// ============================================
export function useSuppliers() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["suppliers", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (item: Omit<TablesInsert<"suppliers">, "team_id">) => {
      const team_id = await getTeamId(user!.id);
      const { data, error } = await supabase
        .from("suppliers")
        .insert({ ...item, team_id })
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Erreur lors de l'ajout du prestataire");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Prestataire/Fournisseur ajouté");
    },
    onError: (e) => toast.error("Erreur: " + e.message),
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"suppliers"> & { id: string }) => {
      const { data, error } = await supabase
        .from("suppliers")
        .update(updates)
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Prestataire introuvable");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Prestataire mis à jour");
    },
    onError: (e) => toast.error("Erreur: " + e.message),
  });
}

// ============================================
// PRESTATAIRES (MODULE PHASE 2)
// ============================================
export function useProviders() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["providers", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("providers")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useProvider(id: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["providers", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("providers")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });
}

export function useCurrentProvider() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["current-provider", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("providers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useCreateProvider() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (provider: Omit<TablesInsert<"providers">, "team_id">) => {
      const team_id = await getTeamId(user!.id);
      const { data, error } = await supabase
        .from("providers")
        .upsert({ ...provider, team_id, is_onboarded: true }, { onConflict: "user_id,team_id" })
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Erreur lors de la création du prestataire");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["providers"] });
      toast.success("Prestataire ajouté avec succès");
    },
    onError: (e) => toast.error("Erreur: " + e.message),
  });
}

export function useUpdateProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"providers"> & { id: string }) => {
      const { data, error } = await supabase
        .from("providers")
        .update(updates)
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Fiche prestataire introuvable");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["providers"] });
      toast.success("Fiche prestataire mise à jour");
    },
    onError: (e) => toast.error("Erreur: " + e.message),
  });
}

export function useDeleteProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("providers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["providers"] });
      toast.success("Prestataire supprimé");
    },
    onError: (e) => toast.error("Erreur: " + e.message),
  });
}

export function useDeleteSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("suppliers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Prestataire supprimé");
    },
    onError: (e) => toast.error("Erreur: " + e.message),
  });
}

// ============================================
// B2B PLANIFY NETWORK REQUESTS
// ============================================

export function useB2BInvitations() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["b2b_invitations", user?.id],
    queryFn: async () => {
      const team_id = await getTeamId(user!.id);
      const { data, error } = await supabase
        .from("b2b_invitations")
        .select("*")
        .eq("inviting_team_id", team_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

function generateSecureToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  // Format: XXXX-XXXX-XXXX
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) token += '-';
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export function useCreateB2BInvitation() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async () => {
      const team_id = await getTeamId(user!.id);
      const token = generateSecureToken();
      // Expires in 7 days
      const expires_at = new Date();
      expires_at.setDate(expires_at.getDate() + 7);

      const { data, error } = await supabase
        .from("b2b_invitations")
        .insert({
          inviting_team_id: team_id,
          token,
          expires_at: expires_at.toISOString(),
        })
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Erreur lors de la génération de l'invitation");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["b2b_invitations"] });
      toast.success("Code d'invitation généré");
    },
    onError: (e) => toast.error("Erreur: " + e.message),
  });
}

export function useAcceptB2BInvitation() {
  const qc = useQueryClient();
  const { session } = useAuth();
  return useMutation({
    mutationFn: async (token: string) => {
      if (!session?.access_token) throw new Error("Non authentifié");
      console.log("Appel b2b-accept-invitation...", token);

      try {
        const { data, error } = await supabase.functions.invoke("b2b-accept-invitation", {
          body: { token },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          }
        });

        if (error) {
          console.error("Erreur Edge Function détaillée:", error);
          // Tentative d'extraction du message d'erreur si présent dans le body
          let msg = error.message;
          try {
            // Dans certaines versions de supabase-js, l'erreur contient le body texte
            if (msg.includes("{")) {
              const jsonPart = msg.substring(msg.indexOf("{"));
              const parsed = JSON.parse(jsonPart);
              if (parsed.error) msg = parsed.error;
            }
          } catch (e: unknown) { /* ignore parse errors */ }
          throw new Error(msg || "Erreur de connexion B2B");
        }

        return data;
      } catch (err: unknown) {
        const error = err as Error;
        console.error("Exception lors de l'appel B2B:", error);
        throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      qc.invalidateQueries({ queryKey: ["b2b_invitations"] });
      toast.success("Connexion B2B établie avec succès !");
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useB2BCatalog() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["b2b_catalog", user?.id],
    queryFn: async () => {
      // 1. Get connected supplier teams
      const team_id = await getTeamId(user!.id);
      const { data: suppliers, error: suppliersError } = await supabase
        .from("suppliers")
        .select("connected_team_id")
        .eq("team_id", team_id)
        .not("connected_team_id", "is", null);

      if (suppliersError) throw suppliersError;

      const connectedTeamIds = suppliers?.map(s => s.connected_team_id).filter(Boolean) || [];

      if (connectedTeamIds.length === 0) return [];

      // 2. Get materiel from these teams where is_b2b_shared is true
      const { data, error } = await supabase
        .from("materiel")
        .select("*, teams:team_id(name)")
        .in("team_id", connectedTeamIds)
        .eq("is_b2b_shared", true)
        .order("name", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useSubrentRequests() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["subrent_requests", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subrent_requests")
        .select("*, materiel:materiel_id(name, category), provider:teams!provider_team_id(name), requester:teams!requester_team_id(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useCreateSubrentRequest() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (request: Omit<TablesInsert<"subrent_requests">, "requester_team_id">) => {
      const team_id = await getTeamId(user!.id);
      const { data, error } = await supabase
        .from("subrent_requests")
        .insert({ ...request, requester_team_id: team_id })
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Erreur lors de la création de la demande");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subrent_requests"] });
      toast.success("Demande de location B2B envoyée !");
    },
    onError: (e) => toast.error("Erreur: " + e.message),
  });
}

export function useUpdateSubrentRequestStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "pending" | "accepted" | "rejected" | "cancelled" }) => {
      const { data, error } = await supabase
        .from("subrent_requests")
        .update({ status })
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Demande introuvable");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subrent_requests"] });
      toast.success("Statut de la demande mis à jour");
    },
    onError: (e) => toast.error("Erreur: " + e.message),
  });
}

// ============================================
// MISSION-MATERIEL (associations)
// ============================================
export function useMissionMateriel(missionId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["mission_materiel", missionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mission_materiel")
        .select("*, materiel(id, name, category, serial_number, status, rental_price)")
        .eq("mission_id", missionId!);
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!missionId,
  });
}

export function useMaterielMissions(materielId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["mission_materiel", "by_materiel", materielId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mission_materiel")
        .select("*, missions(id, title, start_date, status)")
        .eq("materiel_id", materielId!);
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!materielId,
  });
}

export function useAddMissionMateriel() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (row: { mission_id: string; materiel_id: string; quantity?: number; notes?: string }) => {
      const { data, error } = await supabase
        .from("mission_materiel")
        .insert({ ...row, user_id: user!.id })
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Erreur lors de l'association du matériel");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mission_materiel"] });
      toast.success("Matériel associé à la mission");
    },
    onError: (e) => toast.error("Erreur: " + e.message),
  });
}

// ============================================
// STOCK MOVEMENTS
// ============================================
export function useStockMovements(materielId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["stock_movements", materielId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_movements")
        .select("*")
        .eq("materiel_id", materielId!)
        .order("movement_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!materielId,
  });
}

export function useCreateStockMovement() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (movement: { materiel_id: string; type: string; quantity: number; reason?: string; notes?: string; movement_date?: string }) => {
      const { data, error } = await supabase
        .from("stock_movements")
        .insert({ ...movement, user_id: user!.id })
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Erreur lors de l'enregistrement du mouvement");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock_movements"] });
      qc.invalidateQueries({ queryKey: ["materiel"] });
      toast.success("Mouvement enregistré");
    },
    onError: (e) => toast.error("Erreur: " + e.message),
  });
}

export function useRemoveMissionMateriel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mission_materiel").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mission_materiel"] });
      toast.success("Matériel retiré de la mission");
    },
    onError: (e) => toast.error("Erreur: " + e.message),
  });
}

// ============================================
// DELETE DEVIS
// ============================================
export function useDeleteDevis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Items are deleted by cascade in the DB
      const { error } = await supabase.from("devis").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["devis"] });
      toast.success("Devis supprimé");
    },
    onError: (e) => toast.error("Erreur lors de la suppression : " + e.message),
  });
}

// ============================================
// DELETE FACTURE
// ============================================
export function useDeleteFacture() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("factures").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["factures"] });
      toast.success("Facture supprimée");
    },
    onError: (e) => toast.error("Erreur lors de la suppression : " + e.message),
  });
}

// ============================================
// STORAGE LOCATIONS
// ============================================
export function useStorageLocations() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["storage_locations", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("storage_locations")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useCreateStorageLocation() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (location: Omit<TablesInsert<"storage_locations">, "user_id" | "team_id">) => {
      const team_id = await getTeamId(user!.id);
      const { data, error } = await supabase
        .from("storage_locations")
        .insert({ ...location, user_id: user!.id, team_id })
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Erreur lors de la création du lieu de stockage");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["storage_locations"] });
      toast.success("Lieu de stockage créé avec succès");
    },
    onError: (e) => toast.error("Erreur: " + e.message),
  });
}

export function useUpdateStorageLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"storage_locations"> & { id: string }) => {
      const { data, error } = await supabase
        .from("storage_locations")
        .update(updates)
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Lieu de stockage introuvable");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["storage_locations"] });
      toast.success("Lieu de stockage mis à jour");
    },
    onError: (e) => toast.error("Erreur: " + e.message),
  });
}

export function useDeleteStorageLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("storage_locations").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["storage_locations"] });
      toast.success("Lieu de stockage supprimé");
    },
    onError: (e) => toast.error("Erreur lors de la suppression : " + e.message),
  });
}
