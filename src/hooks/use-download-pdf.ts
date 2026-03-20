import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export function useDownloadPdf() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const downloadPdf = async (type: "devis" | "facture", id: string, fileName?: string) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Non connecté", description: "Veuillez vous reconnecter.", variant: "destructive" });
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const res = await fetch(`${supabaseUrl}/functions/v1/generate-pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
          "apikey": supabaseKey,
          "Accept": "application/pdf"
        },
        body: JSON.stringify({ type, id }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Erreur de génération PDF (${res.status})`);
      }

      // res.blob() correctly preserves the binary PDF data
      const blob = await res.blob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const finalFileName = fileName ? (fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`) : `${type}.pdf`;
      a.download = finalFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 100);

      toast({ title: "PDF téléchargé", description: finalFileName });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Impossible de générer le PDF";
      console.error("PDF download error:", err);
      toast({ title: "Erreur PDF", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return { downloadPdf, loading };
}
