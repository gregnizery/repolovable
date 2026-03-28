import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, Upload, Bell, CreditCard, PenLine, Check, FileText, Receipt,
  Calendar, MapPin, Clock, Download, ChevronRight, AlertCircle, CheckCircle2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import SignatureCanvas from "react-signature-canvas";
import { getClientPortalErrorMessage } from "@/lib/client-portal-errors";

// ── Types ──────────────────────────────────────────────────────────────────────
type LineItem = { id: string; description: string; quantity: number; unit_price: number; sort_order?: number; tva?: number };

type PortalDevis = {
  id: string; number: string; status: string; date: string;
  valid_until: string; total_ht: number; tva_rate: number; total_ttc: number;
  signature_base64?: string; signed_at?: string;
  devis_items: LineItem[];
};

type PortalFacture = {
  id: string; number: string; status: string; date: string;
  due_date?: string; total_ht: number; tva_rate: number; total_ttc: number;
  facture_items: LineItem[];
};

type PortalPayload = {
  client: { id: string; name: string; company?: string; email?: string; phone?: string };
  devis: PortalDevis[];
  factures: PortalFacture[];
  missions: { id: string; title: string; status: string; location?: string; start_date?: string; end_date?: string }[];
  paiements: { id: string; amount: number; method: string; payment_date: string; facture_id: string; validation_status?: string }[];
  proofs: { id: string; facture_id: string; file_name: string; file_url?: string; created_at: string }[];
  whiteLabel?: { logo_url?: string; primary_color?: string; secondary_color?: string; legal_mentions?: string };
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
};

const fmt = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2 });

function statusBadge(status: string, type: "devis" | "facture") {
  const map: Record<string, { label: string; cls: string }> = {
    // devis
    envoyé: { label: "Envoyé", cls: "bg-info/10 text-info" },
    signé: { label: "Signé ✓", cls: "bg-success/10 text-success" },
    accepted: { label: "Signé ✓", cls: "bg-success/10 text-success" },
    refusé: { label: "Refusé", cls: "bg-destructive/10 text-destructive" },
    expiré: { label: "Expiré", cls: "bg-warning/10 text-warning" },
    // factures
    brouillon: { label: "Brouillon", cls: "bg-muted text-muted-foreground" },
    envoyée: { label: "Envoyée", cls: "bg-info/10 text-info" },
    payée: { label: "Payée ✓", cls: "bg-success/10 text-success" },
    en_retard: { label: "En retard", cls: "bg-destructive/10 text-destructive" },
    annulée: { label: "Annulée", cls: "bg-muted text-muted-foreground" },
  };
  const cfg = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", cfg.cls)}>{cfg.label}</span>;
}

function ItemsTable({ items }: { items: LineItem[] }) {
  const sorted = [...items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  return (
    <div className="border border-border/70 bg-card/80 rounded-2xl overflow-hidden text-sm shadow-sm">
      <table className="w-full">
        <thead><tr className="bg-secondary/70 text-muted-foreground text-xs">
          <th className="text-left p-3 font-medium">Description</th>
          <th className="text-center p-3 font-medium w-14">Qté</th>
          <th className="text-right p-3 font-medium w-24">P.U. HT</th>
          <th className="text-right p-3 font-medium w-24">Total HT</th>
        </tr></thead>
        <tbody>
          {sorted.map((item, i) => (
            <tr key={item.id ?? i} className="border-t border-border/40">
              <td className="p-3">{item.description}</td>
              <td className="p-3 text-center text-muted-foreground">{item.quantity}</td>
              <td className="p-3 text-right text-muted-foreground">{fmt(Number(item.unit_price))} €</td>
              <td className="p-3 text-right font-medium">{fmt(Number(item.quantity) * Number(item.unit_price))} €</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TotalsBlock({ totalHt, tvaRate, totalTtc }: { totalHt: number; tvaRate: number; totalTtc: number }) {
  const tvaAmt = Number(totalTtc) - Number(totalHt);
  return (
    <div className="flex justify-end">
      <div className="w-64 space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Total HT</span><span>{fmt(Number(totalHt))} €</span></div>
        {Number(tvaRate) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">TVA ({(Number(tvaRate) * 100).toFixed(0)} %)</span><span>{fmt(tvaAmt)} €</span></div>}
        <div className="flex justify-between pt-2 border-t border-border/70 font-bold text-base">
          <span>{Number(tvaRate) > 0 ? "Total TTC" : "Total"}</span>
          <span>{fmt(Number(totalTtc))} €</span>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function PublicClientPortal() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [data, setData] = useState<PortalPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [selectedFactureId, setSelectedFactureId] = useState("");

  const [selectedDevis, setSelectedDevis] = useState<PortalDevis | null>(null);
  const [selectedFacture, setSelectedFacture] = useState<PortalFacture | null>(null);
  const [signing, setSigning] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const sigCanvas = useRef<SignatureCanvas>(null);

  const downloadFacturePdf = async (facture: PortalFacture) => {
    setDownloadingPdf(true);
    try {
      const { data: pdfData, error } = await supabase.functions.invoke("portal-generate-pdf", {
        body: { token, factureId: facture.id },
      });
      if (error) {
        toast.error(await getClientPortalErrorMessage(error as { message: string; context?: unknown }));
        return;
      }
      const blob = pdfData instanceof Blob ? pdfData : new Blob([pdfData], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${facture.number}.pdf`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const downloadDevisPdf = async (devis: PortalDevis) => {
    setDownloadingPdf(true);
    try {
      const { data: pdfData, error } = await supabase.functions.invoke("portal-generate-pdf", {
        body: { token, devisId: devis.id, type: "devis" },
      });
      if (error) {
        toast.error(await getClientPortalErrorMessage(error as { message: string; context?: unknown }));
        return;
      }
      const blob = pdfData instanceof Blob ? pdfData : new Blob([pdfData], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${devis.number}.pdf`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const brandStyle = useMemo(() => ({
    background: `linear-gradient(135deg, ${data?.whiteLabel?.primary_color || "#5749f4"}, ${data?.whiteLabel?.secondary_color || "#8a7cff"})`,
  }), [data]);

  const brandColor = data?.whiteLabel?.primary_color || "#5749f4";

  const refresh = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!token) {
      setLoadError("Lien portail incomplet.");
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data: resp, error } = await supabase.functions.invoke("verify-client-portal-token", { body: { token } });
    if (error) {
      const message = await getClientPortalErrorMessage(error as { message: string; context?: unknown });
      if (!silent) toast.error(message);
      setLoadError(message);
      setData(null);
      setLoading(false);
      return;
    }

    setLoadError(null);
    setData(resp as PortalPayload);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    void refresh();
    const t = setInterval(() => {
      void refresh({ silent: true });
    }, 20000);
    return () => clearInterval(t);
  }, [refresh]);

  const uploadProof = async () => {
    if (!file || !selectedFactureId) { toast.error("Choisissez une facture et un fichier"); return; }
    setUploading(true);
    const b64 = await file.arrayBuffer().then(arrayBufferToBase64);
    const { error } = await supabase.functions.invoke("upload-client-proof", {
      body: { token, factureId: selectedFactureId, fileName: file.name, mimeType: file.type, base64Content: b64 },
    });
    setUploading(false);
    if (error) return toast.error(await getClientPortalErrorMessage(error as { message: string; context?: unknown }));
    toast.success("Justificatif envoyé");
    setFile(null);
    void refresh({ silent: true });
  };

  const handleSignDevis = async () => {
    if (!selectedDevis) return;
    if (sigCanvas.current?.isEmpty()) {
      toast.error("Veuillez dessiner votre signature avant de valider.");
      return;
    }
    setSigning(true);
    const signatureBase64 = sigCanvas.current?.getTrimmedCanvas().toDataURL("image/png") || "";

    const { error } = await supabase.functions.invoke("sign-client-devis", {
      body: { token, devisId: selectedDevis.id, signatureBase64 },
    });
    setSigning(false);
    if (error) {
      toast.error(await getClientPortalErrorMessage(error as { message: string; context?: unknown }));
      return;
    }
    toast.success("Devis signé avec succès !");
    setSelectedDevis(null);
    void refresh({ silent: true });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background forced-light"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (loadError) {
    return (
      <div className="min-h-screen bg-background forced-light px-4 py-8 md:px-6">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl items-center justify-center">
          <Card className="w-full border-border/70 bg-card shadow-card">
            <CardContent className="p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h1 className="mt-4 text-xl font-semibold text-foreground">Acces au portail indisponible</h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{loadError}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Si besoin, demandez un nouveau lien portail a votre interlocuteur.
              </p>
              <Button className="mt-6" onClick={() => void refresh()}>
                Reessayer
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  if (!data) return <div className="min-h-screen flex items-center justify-center bg-background forced-light text-muted-foreground">Lien invalide ou expire.</div>;

  // Build paiements map per facture
  const paiementsMap: Record<string, typeof data.paiements> = {};
  for (const p of data.paiements) {
    if (!paiementsMap[p.facture_id]) paiementsMap[p.facture_id] = [];
    paiementsMap[p.facture_id].push(p);
  }

  return (
    <div className="min-h-screen bg-background forced-light text-foreground p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <header className="rounded-[32px] border border-white/15 p-6 text-white shadow-card" style={brandStyle}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-white/70 text-sm font-medium uppercase tracking-wider">Espace client</p>
              <h1 className="text-2xl font-display font-bold mt-1">{data.client.name}</h1>
              {data.client.company && <p className="text-white/80 text-sm">{data.client.company}</p>}
            </div>
            {data.whiteLabel?.logo_url && <img src={data.whiteLabel.logo_url} className="h-12 object-contain" alt="Logo" />}
          </div>
        </header>

        <Tabs defaultValue="devis">
          <TabsList className="w-full rounded-[24px] border border-border/80 bg-card/90 p-1 shadow-card">
            <TabsTrigger value="devis" className="flex-1 gap-1.5 rounded-[16px] data-[state=active]:shadow-sm">
              <FileText className="h-4 w-4" /> Devis <span className="text-xs">({data.devis.length})</span>
            </TabsTrigger>
            <TabsTrigger value="factures" className="flex-1 gap-1.5 rounded-[16px] data-[state=active]:shadow-sm">
              <Receipt className="h-4 w-4" /> Factures <span className="text-xs">({data.factures.length})</span>
            </TabsTrigger>
            <TabsTrigger value="missions" className="flex-1 gap-1.5 rounded-[16px] data-[state=active]:shadow-sm">
              <Calendar className="h-4 w-4" /> Missions <span className="text-xs">({data.missions.length})</span>
            </TabsTrigger>
            <TabsTrigger value="historique" className="flex-1 gap-1.5 rounded-[16px] data-[state=active]:shadow-sm">
              <Bell className="h-4 w-4" /> Historique
            </TabsTrigger>
          </TabsList>

          {/* ── DEVIS ──────────────────────────────── */}
          <TabsContent value="devis" className="mt-4 space-y-3">
            {data.devis.length === 0 ? (
              <Card className="border-border/60 bg-card shadow-card"><CardContent className="py-12 text-center text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Aucun devis pour le moment</p>
              </CardContent></Card>
            ) : data.devis.map((d) => (
              <Card key={d.id} className="cursor-pointer rounded-2xl hover:-translate-y-0.5 hover:shadow-card-hover transition-all border-border/60 bg-card shadow-card" onClick={() => setSelectedDevis(d)}>
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-xl bg-secondary shrink-0" style={{ color: brandColor }}>
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{d.number}</p>
                      <p className="text-sm text-muted-foreground">{new Date(d.date).toLocaleDateString("fr-FR")} · {fmt(Number(d.total_ttc))} €</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {statusBadge(d.status, "devis")}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* ── FACTURES ──────────────────────────── */}
          <TabsContent value="factures" className="mt-4 space-y-3">
            {data.factures.length === 0 ? (
              <Card className="border-border/60 bg-card shadow-card"><CardContent className="py-12 text-center text-muted-foreground">
                <Receipt className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Aucune facture pour le moment</p>
              </CardContent></Card>
            ) : data.factures.map((f) => {
              const fPaiements = paiementsMap[f.id] ?? [];
              const paid = fPaiements
                .filter(p => p.validation_status !== "rejected" && p.validation_status !== "pending")
                .reduce((s, p) => s + Number(p.amount), 0);
              const remaining = Math.max(0, Number(f.total_ttc) - paid);
              return (
                <Card key={f.id} className="cursor-pointer rounded-2xl hover:-translate-y-0.5 hover:shadow-card-hover transition-all border-border/60 bg-card shadow-card" onClick={() => setSelectedFacture(f)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-xl bg-success/10 shrink-0 text-success">
                          <Receipt className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{f.number}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(f.date).toLocaleDateString("fr-FR")}
                            {f.due_date && ` · Éch. ${new Date(f.due_date).toLocaleDateString("fr-FR")}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {statusBadge(f.status, "facture")}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                    {/* Payment progress */}
                    {(f.status === "envoyée" || f.status === "en_retard") && (
                      <div className="mt-3 pt-3 border-t border-border/40">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                          <span>Payé : <strong className="text-success">{fmt(paid)} €</strong></span>
                          <span>Restant : <strong className={remaining > 0 ? "text-destructive" : "text-success"}>{fmt(remaining)} €</strong></span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-1.5">
                          <div className="bg-primary h-1.5 rounded-full" style={{ width: `${Math.min(100, (paid / Number(f.total_ttc)) * 100)}%` }} />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {/* Upload proof */}
            <Card className="border-border/60 bg-card shadow-card">
              <CardContent className="p-5 space-y-3">
                <h3 className="font-semibold flex items-center gap-2 text-foreground">
                  <CreditCard className="h-4 w-4" style={{ color: brandColor }} /> Justificatif de paiement
                </h3>
                <p className="text-sm text-muted-foreground">Effectuez votre paiement puis déposez ici votre justificatif.</p>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Facture concernée</Label>
                  <select className="w-full h-11 border border-border/70 rounded-xl px-3 bg-background text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" value={selectedFactureId} onChange={(e) => setSelectedFactureId(e.target.value)}>
                    <option value="">Choisir une facture...</option>
                    {data.factures.filter(f => f.status !== "payée" && f.status !== "brouillon").map((f) => <option key={f.id} value={f.id}>{f.number} — {fmt(Number(f.total_ttc))} €</option>)}
                  </select>
                </div>
                <Input type="file" accept="image/*,.pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-sm" />
                <Button onClick={uploadProof} disabled={uploading || !file || !selectedFactureId} className="w-full gap-2 text-white" style={{ background: brandColor }}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Envoyer le justificatif
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── MISSIONS ──────────────────────────── */}
          <TabsContent value="missions" className="mt-4 space-y-3">
            {data.missions.length === 0 ? (
              <Card className="border-border/60 bg-card shadow-card"><CardContent className="py-12 text-center text-muted-foreground">
                <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Aucune mission pour le moment</p>
              </CardContent></Card>
            ) : data.missions.map((m) => (
              <Card key={m.id} className="border-border/60 bg-card shadow-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{m.title}</p>
                    {statusBadge(m.status, "devis")}
                  </div>
                  <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                    {m.start_date && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{new Date(m.start_date).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).replace(" à", " -")}</span>}
                    {m.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{m.location}</span>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* ── HISTORIQUE ────────────────────────── */}
          <TabsContent value="historique" className="mt-4 space-y-3">
            {data.paiements.length === 0 && data.proofs.length === 0 ? (
              <Card className="border-border/60 bg-card shadow-card"><CardContent className="py-12 text-center text-muted-foreground">
                <Bell className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Aucun historique disponible</p>
              </CardContent></Card>
            ) : (
              <>
                {data.paiements.map((p) => (
                  <Card key={p.id} className="border-border/60 bg-card shadow-card">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="p-2 rounded-full bg-success/10 text-success"><CheckCircle2 className="h-4 w-4" /></div>
                      <div>
                        <p className="text-sm font-semibold">Paiement de {fmt(Number(p.amount))} € via {p.method}</p>
                        <p className="text-xs text-muted-foreground">{new Date(p.payment_date).toLocaleDateString("fr-FR")}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {data.proofs.map((p) => (
                  <Card key={p.id} className="border-border/60 bg-card shadow-card">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="p-2 rounded-full bg-info/10 text-info"><Upload className="h-4 w-4" /></div>
                      <div>
                        <p className="text-sm font-semibold">Justificatif envoyé : {p.file_name}</p>
                        <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString("fr-FR")}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </TabsContent>
        </Tabs>

        {data.whiteLabel?.legal_mentions && (
          <p className="text-xs text-muted-foreground text-center">{data.whiteLabel.legal_mentions}</p>
        )}
      </div>

      {/* ── DEVIS MODAL ──────────────────────────────────────────────────── */}
      <Dialog open={!!selectedDevis} onOpenChange={(open) => { if (!open) { setSelectedDevis(null); } }}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0 gap-0 border border-border/70 bg-card shadow-card">
          {selectedDevis && (
            <div className="bg-card">
              {/* Modal header */}
              <div className="p-6 text-white" style={brandStyle}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white/70 text-sm uppercase tracking-wider">Devis</p>
                    <p className="text-2xl font-bold mt-1">{selectedDevis.number}</p>
                  </div>
                  <div className="text-right text-sm text-white/80">
                    <p>Émis le {new Date(selectedDevis.date).toLocaleDateString("fr-FR")}</p>
                    {selectedDevis.valid_until && <p>Valide jusqu'au {new Date(selectedDevis.valid_until).toLocaleDateString("fr-FR")}</p>}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  {statusBadge(selectedDevis.status, "devis")}
                  <button
                    onClick={() => downloadDevisPdf(selectedDevis)}
                    disabled={downloadingPdf}
                    className="flex items-center gap-1.5 text-xs font-medium text-white/90 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 transition-colors"
                  >
                    {downloadingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    Télécharger PDF
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <ItemsTable items={selectedDevis.devis_items ?? []} />
                <TotalsBlock totalHt={selectedDevis.total_ht} tvaRate={selectedDevis.tva_rate} totalTtc={selectedDevis.total_ttc} />

                {/* Signature zone */}
                {selectedDevis.status === "envoyé" && (
                  <div className="border-t border-border/60 pt-6">
                    <h3 className="font-semibold flex items-center gap-2 mb-3 text-primary">
                      <PenLine className="h-4 w-4" /> Signer ce devis
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">Dessinez votre signature dans le cadre ci-dessous pour confirmer votre accord.</p>
                    <div className="w-full h-40 rounded-2xl border-2 border-border/70 bg-secondary/60 overflow-hidden relative touch-none">
                      <SignatureCanvas
                        ref={sigCanvas}
                        canvasProps={{ className: "w-full h-full absolute inset-0 cursor-crosshair" }}
                        penColor="black"
                        backgroundColor="transparent"
                      />
                    </div>
                    <div className="flex gap-3 mt-4">
                      <Button variant="outline" className="flex-1 rounded-xl" onClick={() => sigCanvas.current?.clear()}>Effacer</Button>
                      <Button className="flex-1 rounded-xl gap-2 text-white" style={{ background: brandColor }} onClick={handleSignDevis} disabled={signing}>
                        {signing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Confirmer et signer
                      </Button>
                    </div>
                  </div>
                )}

                {/* Already signed */}
                {(selectedDevis.status === "signé" || selectedDevis.status === "accepted") && (
                  <div className="border-t border-border/60 pt-6 flex items-center gap-3 text-success">
                    <CheckCircle2 className="h-6 w-6 shrink-0" />
                    <div>
                      <p className="font-semibold">Devis signé</p>
                      <p className="text-sm text-muted-foreground">Signé le {new Date(selectedDevis.signed_at || selectedDevis.date).toLocaleDateString("fr-FR")}</p>
                    </div>
                  </div>
                )}

                {/* Refused / expired */}
                {(selectedDevis.status === "refusé" || selectedDevis.status === "expiré") && (
                  <div className="border-t border-border/60 pt-6 flex items-center gap-3 text-destructive">
                    <AlertCircle className="h-6 w-6 shrink-0" />
                    <p className="text-sm">{selectedDevis.status === "refusé" ? "Ce devis a été refusé." : "Ce devis a expiré."}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── FACTURE MODAL ────────────────────────────────────────────────── */}
      <Dialog open={!!selectedFacture} onOpenChange={(open) => { if (!open) setSelectedFacture(null); }}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0 gap-0 border border-border/70 bg-card shadow-card">
          {selectedFacture && (() => {
            const fPaiements = paiementsMap[selectedFacture.id] ?? [];
            const paid = fPaiements
              .filter(p => p.validation_status !== "rejected" && p.validation_status !== "pending")
              .reduce((s, p) => s + Number(p.amount), 0);
            const remaining = Math.max(0, Number(selectedFacture.total_ttc) - paid);
            return (
              <div className="bg-card">
                {/* Modal header */}
                <div className="p-6 text-white" style={brandStyle}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white/70 text-sm uppercase tracking-wider">Facture</p>
                      <p className="text-2xl font-bold mt-1">{selectedFacture.number}</p>
                    </div>
                    <div className="text-right text-sm text-white/80">
                      <p>Émise le {new Date(selectedFacture.date).toLocaleDateString("fr-FR")}</p>
                      {selectedFacture.due_date && <p>Échéance {new Date(selectedFacture.due_date).toLocaleDateString("fr-FR")}</p>}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    {statusBadge(selectedFacture.status, "facture")}
                    <button
                      onClick={() => downloadFacturePdf(selectedFacture)}
                      disabled={downloadingPdf}
                      className="flex items-center gap-1.5 text-xs font-medium text-white/90 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 transition-colors"
                    >
                      {downloadingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                      Télécharger PDF
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  <ItemsTable items={selectedFacture.facture_items ?? []} />
                  <TotalsBlock totalHt={selectedFacture.total_ht} tvaRate={selectedFacture.tva_rate} totalTtc={selectedFacture.total_ttc} />

                  {/* Payment summary */}
                  {fPaiements.length > 0 && (
                    <div className="border-t border-border/60 pt-5">
                      <h3 className="font-semibold mb-3 text-success flex items-center gap-2"><CreditCard className="h-4 w-4" /> Paiements reçus</h3>
                      <div className="space-y-2 mb-4">
                        {fPaiements.map((p) => (
                          <div key={p.id} className="flex justify-between text-sm items-center rounded-xl bg-secondary/70 px-3 py-2">
                            <span className="text-muted-foreground">{new Date(p.payment_date).toLocaleDateString("fr-FR")} · {p.method}</span>
                            <span className="font-semibold text-success">+{fmt(Number(p.amount))} €</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between font-semibold text-sm pt-2 border-t border-border/70">
                        <span>Reste à payer</span>
                        <span className={remaining > 0 ? "text-destructive" : "text-success"}>{fmt(remaining)} €</span>
                      </div>
                    </div>
                  )}

                  {selectedFacture.status === "payée" && (
                    <div className="flex items-center gap-3 text-success bg-success/10 rounded-2xl p-4">
                      <CheckCircle2 className="h-5 w-5 shrink-0" />
                      <p className="font-medium">Facture entièrement réglée</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
