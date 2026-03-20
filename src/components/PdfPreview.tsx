import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Eye, X, Loader2, Download, PenLine, Check, RefreshCw } from "lucide-react";
import { SignaturePad } from "@/components/SignaturePad";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

interface PdfPreviewProps {
  type: "devis" | "facture";
  id: string;
  fileName?: string;
  status?: string;
  autoLoad?: boolean;
}

export function PdfPreview({ type, id, fileName, status, autoLoad = true }: PdfPreviewProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSignature, setShowSignature] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);
  const queryClient = useQueryClient();

  const canSign = type === "devis" && (status === "brouillon" || status === "envoyé");

  const loadPreview = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Non connecté");

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const res = await fetch(`${supabaseUrl}/functions/v1/generate-pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
          "apikey": supabaseKey,
        },
        body: JSON.stringify({ type, id }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Erreur ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
      setPdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || "Impossible de générer l'aperçu");
    } finally {
      setLoading(false);
    }
  }, [type, id, loading]);

  useEffect(() => {
    if (autoLoad) {
      loadPreview();
    }
    return () => {
      setPdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, type]);

  if (loading && !pdfUrl) {
    return (
      <div className="space-y-3 mt-6">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <p className="text-sm font-semibold text-muted-foreground">Génération de l'aperçu…</p>
        </div>
        <Skeleton className="w-full h-[200px] rounded-xl" />
      </div>
    );
  }

  if (error && !pdfUrl) {
    return (
      <div className="mt-6 border border-destructive/30 rounded-xl p-6 text-center space-y-3">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" className="gap-2 rounded-xl" onClick={loadPreview}>
          <RefreshCw className="h-4 w-4" /> Réessayer
        </Button>
      </div>
    );
  }

  if (!pdfUrl && !autoLoad) {
    return (
      <div className="space-y-2">
        <Button
          variant="outline"
          className="gap-2 rounded-xl w-full"
          disabled={loading}
          onClick={loadPreview}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
          Aperçu PDF
        </Button>
      </div>
    );
  }

  if (!pdfUrl) return null;

  const handleDownload = () => {
    if (!pdfUrl) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = fileName ? (fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`) : `${type}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleOpenNewTab = () => {
    if (pdfUrl) window.open(pdfUrl, "_blank");
  };

  const closePreview = () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);
    setShowSignature(false);
    setSignatureData(null);
  };

  const handleSign = async () => {
    if (!signatureData) {
      toast.error("Veuillez dessiner votre signature");
      return;
    }
    setSigning(true);
    try {
      const { error } = await supabase
        .from("devis")
        .update({
          signature_data: signatureData,
          signed_at: new Date().toISOString(),
          status: "signé",
        })
        .eq("id", id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["devis"] });
      toast.success("Devis signé avec succès !");
      setShowSignature(false);
      setSignatureData(null);
      loadPreview();
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Erreur lors de la signature");
    } finally {
      setSigning(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Aperçu du document</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 rounded-xl" onClick={handleOpenNewTab}>
            <Eye className="h-3.5 w-3.5" /> Ouvrir
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 rounded-xl" onClick={handleDownload}>
            <Download className="h-3.5 w-3.5" /> Télécharger
          </Button>
          <Button variant="ghost" size="sm" className="rounded-xl" onClick={closePreview}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="border border-border rounded-xl overflow-hidden bg-muted/30 p-6 text-center space-y-3">
        <div className="w-16 h-16 mx-auto rounded-xl bg-primary/10 flex items-center justify-center">
          <Download className="h-8 w-8 text-primary" />
        </div>
        <p className="text-sm font-medium">PDF généré avec succès</p>
        <p className="text-xs text-muted-foreground">Cliquez sur « Ouvrir » pour visualiser ou « Télécharger » pour sauvegarder.</p>
        <div className="flex gap-2 justify-center">
          <Button variant="outline" className="gap-2 rounded-xl" onClick={handleOpenNewTab}>
            <Eye className="h-4 w-4" /> Ouvrir dans un nouvel onglet
          </Button>
          <Button className="gradient-primary text-white gap-2 rounded-xl hover:opacity-90" onClick={handleDownload}>
            <Download className="h-4 w-4" /> Télécharger
          </Button>
        </div>
      </div>

      {canSign && !showSignature && (
        <Button
          className="gradient-primary text-white gap-2 rounded-xl hover:opacity-90 w-full"
          onClick={() => setShowSignature(true)}
        >
          <PenLine className="h-4 w-4" /> Signer ce devis
        </Button>
      )}

      {canSign && showSignature && (
        <div className="border border-border rounded-xl p-4 space-y-4 bg-card">
          <div className="flex items-center gap-2">
            <PenLine className="h-4 w-4 text-primary" />
            <h4 className="font-display font-semibold text-sm">Signature manuscrite</h4>
          </div>
          <p className="text-xs text-muted-foreground">
            En signant, vous confirmez l'accord sur les conditions décrites dans ce devis.
          </p>
          <SignaturePad onSignatureChange={setSignatureData} />
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => { setShowSignature(false); setSignatureData(null); }}
            >
              Annuler
            </Button>
            <Button
              className="gradient-primary text-white gap-2 rounded-xl hover:opacity-90 flex-1"
              disabled={!signatureData || signing}
              onClick={handleSign}
            >
              {signing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Confirmer la signature
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
