import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useSendEmail() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const sendEmail = async (type: "devis" | "facture", id: string) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Non connecté", description: "Veuillez vous reconnecter.", variant: "destructive" });
        return;
      }

      const { data, error } = await supabase.functions.invoke("send-document-email", {
        body: { type, id },
      });

      if (error) throw new Error(error.message || "Erreur d'envoi");

      // Check if response contains error
      if (data?.error) throw new Error(data.error);

      // Invalidate queries to refresh status
      queryClient.invalidateQueries({ queryKey: [type === "devis" ? "devis" : "facture", id] });
      queryClient.invalidateQueries({ queryKey: [type === "devis" ? "devis-list" : "factures"] });

      toast({ title: "Email envoyé ✓", description: `Le ${type} a été envoyé par email au client.` });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Impossible d'envoyer l'email";
      console.error("Send email error:", err);
      toast({ title: "Erreur d'envoi", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return { sendEmail, loading };
}
