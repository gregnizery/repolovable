/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFacture, useFacturePaiements, useCreatePaiement, useDeleteFacture, useUpdatePaiementStatus, useFactureProofs, useDeleteProof, useCurrentProfile } from "@/hooks/use-data";
import { ArrowLeft, Edit, Send, Download, Copy, Trash2, Mail, FileText, Loader2, Banknote, AlertTriangle, CheckCircle2, XCircle, Ban, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDownloadPdf } from "@/hooks/use-download-pdf";
import { useSendEmail } from "@/hooks/use-send-email";
import { Skeleton } from "@/components/ui/skeleton";
import { PdfPreview } from "@/components/PdfPreview";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useUserRole } from "@/hooks/use-user-role";

const statusConfig: Record<string, { label: string; class: string }> = {
  brouillon: { label: "Brouillon", class: "bg-muted text-muted-foreground" },
  "envoyée": { label: "Envoyée", class: "bg-info/10 text-info" },
  "payée": { label: "Payée", class: "bg-success/10 text-success" },
  en_retard: { label: "En retard", class: "bg-destructive/10 text-destructive" },
  "annulée": { label: "Annulée", class: "bg-muted text-muted-foreground" },
};

export default function FactureDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { downloadPdf, loading: pdfLoading } = useDownloadPdf();
  const { sendEmail, loading: emailLoading } = useSendEmail();
  const { data: roleData } = useUserRole();
  const { data: facture, isLoading } = useFacture(id);
  const { data: profile } = useCurrentProfile();
  const { data: paiements = [] } = useFacturePaiements(id);
  const createPaiement = useCreatePaiement();
  const deleteFacture = useDeleteFacture();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<"virement" | "carte" | "espèces" | "chèque" | "stripe">("virement");
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [cashJustification, setCashJustification] = useState("");
  const updatePaiementStatus = useUpdatePaiementStatus();
  const { data: proofs = [] } = useFactureProofs(id);
  const deleteProof = useDeleteProof();
  const isAdmin = roleData?.role === "admin";
  useRealtimeSync("factures", [["facture", id!]]);
  useRealtimeSync("facture_items", [["facture", id!]]);

  const handleDeleteFacture = () => {
    deleteFacture.mutate(id!, {
      onSuccess: () => navigate("/finance/factures"),
    });
  };

  const approvedPaidAmount = useMemo(
    () => paiements

      .filter((p: any) => p.validation_status !== "rejected" && p.validation_status !== "pending")

      .reduce((sum: number, p: any) => sum + Number(p.amount), 0),
    [paiements],
  );
  const pendingCash = useMemo(

    () => paiements.filter((p: any) => p.method === "espèces" && p.validation_status === "pending"),
    [paiements],
  );

  const remainingAmount = useMemo(() => {
    if (!facture) return 0;
    return Number(facture.total_ttc) - approvedPaidAmount;
  }, [facture, approvedPaidAmount]);


  const handleApproveProof = (proof: any) => {
    setPaymentAmount(proof.amount_declared ? String(proof.amount_declared) : "");
    setPaymentDate(proof.payment_date ? proof.payment_date.split("T")[0] : new Date().toISOString().slice(0, 10));
    setPaymentMethod("virement"); // Default for proofs
    setPaymentNotes(`Paiement importé depuis justificatif client (${proof.file_name})${proof.note ? ` - Note client: ${proof.note}` : ""}`);
    // Once handled, we delete the proof
    deleteProof.mutate(proof.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRejectProof = (proofId: string) => {
    if (confirm("Rejeter et supprimer définitivement ce justificatif ?")) {
      deleteProof.mutate(proofId);
    }
  };

  if (isLoading) return <AppLayout><div className="space-y-4 max-w-5xl"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div></AppLayout>;
  if (!facture) return <AppLayout><div className="p-12 text-center text-muted-foreground">Facture introuvable</div></AppLayout>;

  const tva = Number(facture.total_ttc) - Number(facture.total_ht);
  const sc = statusConfig[facture.status];
  const items = facture.facture_items || [];

  const handleAddPayment = () => {
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) return;
    if (amount > remainingAmount) {
      alert("Le montant du paiement ne peut pas dépasser le reste à charge.");
      return;
    }
    if (paymentMethod === "espèces" && cashJustification.trim().length < 10) return;

    createPaiement.mutate({
      facture_id: id!,
      amount,
      payment_date: paymentDate,
      method: paymentMethod,
      reference: paymentRef || undefined,
      notes: paymentNotes || undefined,
      cash_justification: paymentMethod === "espèces" ? cashJustification : undefined,
    }, {
      onSuccess: () => {
        setPaymentAmount("");
        setPaymentRef("");
        setPaymentNotes("");
        setCashJustification("");
      },
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl">
        <button onClick={() => navigate("/finance/factures")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Retour aux factures
        </button>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-display font-bold flex items-center gap-2">
                {facture.number}
                {facture.number?.startsWith("AV-") && <span className="text-xs bg-warning/20 text-warning px-2 py-0.5 rounded uppercase font-bold">Avoir</span>}
              </h1>
              <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", sc?.class)}>{sc?.label}</span>
            </div>
            <p className="text-muted-foreground text-sm">{facture.clients?.name || ""} · Émise le {new Date(facture.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {facture.status === "brouillon" && (
              <>
                <Button variant="outline" className="gap-2 rounded-xl" onClick={() => navigate(`/finance/factures/${id}/modifier`)}><Edit className="h-4 w-4" /> Modifier</Button>
                <Button className="gradient-primary text-white gap-2 rounded-xl hover:opacity-90" disabled={emailLoading} onClick={() => sendEmail("facture", id!)}>
                  {emailLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Envoyer
                </Button>
              </>
            )}
            {(facture.status === "envoyée" || facture.status === "en_retard") && <Button variant="outline" className="gap-2 rounded-xl" disabled={emailLoading} onClick={() => sendEmail("facture", id!)}>{emailLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Relancer</Button>}
            <Button variant="outline" className="gap-2 rounded-xl" disabled={pdfLoading} onClick={() => downloadPdf("facture", id!, facture.number)}>
              {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} PDF
            </Button>
            <Button variant="outline" className="gap-2 rounded-xl" onClick={() => navigate(`/finance/factures/nouveau?fromFacture=${facture.id}`)}>
              <Copy className="h-4 w-4" /> Dupliquer
            </Button>
            <Button variant="outline" className="gap-2 rounded-xl text-warning border-warning/50 hover:bg-warning/5" onClick={() => navigate(`/finance/factures/nouveau?fromFacture=${facture.id}&type=credit_note`)}>
              <Ban className="h-4 w-4" /> Créer un avoir
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="shadow-lg border-border/50 overflow-hidden">
              <div className="gradient-primary p-6 text-primary-foreground">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-primary-foreground/70 text-sm font-medium uppercase tracking-wider">{facture.number?.startsWith("AV-") ? "Avoir" : "Facture"}</p>
                    <p className="text-2xl font-display font-bold mt-1">{facture.number}</p>
                  </div>
                  <div className="text-right text-sm text-primary-foreground/80">
                    <p>Émise le {new Date(facture.date).toLocaleDateString("fr-FR")}</p>
                    {facture.due_date && <p>Échéance {new Date(facture.due_date).toLocaleDateString("fr-FR")}</p>}
                  </div>
                </div>
              </div>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Émetteur</p>
                    <p className="font-semibold">{profile?.company_name || "Planify Events"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Client</p>
                    <p className="font-semibold">{facture.clients?.name || ""}</p>
                    {facture.clients?.company && <p className="text-sm text-muted-foreground">{facture.clients.company}</p>}
                    {facture.clients?.email && <p className="text-sm text-muted-foreground">{facture.clients.email}</p>}
                  </div>
                </div>

                <div className="border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-muted/50">
                      <th className="text-left p-3 font-medium text-muted-foreground">Description</th>
                      <th className="text-center p-3 font-medium text-muted-foreground w-16">Qté</th>
                      <th className="text-right p-3 font-medium text-muted-foreground w-28">P.U. HT</th>
                      <th className="text-right p-3 font-medium text-muted-foreground w-24">Remise</th>
                      <th className="text-right p-3 font-medium text-muted-foreground w-28">Total HT</th>
                    </tr></thead>
                    <tbody>
                      {items.sort((a, b) => a.sort_order - b.sort_order).map(item => {
                        const lineBase = Number(item.quantity) * Number(item.unit_price);
                        const lineDiscount = item.discount_type === "percent"
                          ? lineBase * (Number(item.discount_amount) / 100)
                          : Number(item.discount_amount);
                        const lineTotal = lineBase - lineDiscount;
                        return (
                          <tr key={item.id} className="border-t border-border/50">
                            <td className="p-3 whitespace-pre-wrap">{item.description}</td>
                            <td className="p-3 text-center text-muted-foreground">{Number(item.quantity)}</td>
                            <td className="p-3 text-right text-muted-foreground">{Number(item.unit_price).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€</td>
                            <td className="p-3 text-right text-muted-foreground italic">
                              {Number(item.discount_amount) > 0 ? (
                                item.discount_type === "percent" ? `-${item.discount_amount}%` : `-${item.discount_amount}€`
                              ) : "-"}
                            </td>
                            <td className="p-3 text-right font-medium">{lineTotal.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end">
                  <div className="w-80 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sous-total HT</span>
                      <span className="font-medium">{(Number(facture.total_ht) + (facture.discount_type === "percent" ? (Number(facture.total_ht) / (1 - Number(facture.discount_amount) / 100)) * (Number(facture.discount_amount) / 100) : Number(facture.discount_amount))).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€</span>
                    </div>
                    {Number(facture.discount_amount) > 0 && (
                      <div className="flex justify-between text-destructive italic">
                        <span>Remise globale ({facture.discount_type === "percent" ? `${facture.discount_amount}%` : `${facture.discount_amount}€`})</span>
                        <span>-{(facture.discount_type === "percent" ? (Number(facture.total_ht) / (1 - Number(facture.discount_amount) / 100)) * (Number(facture.discount_amount) / 100) : Number(facture.discount_amount)).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-1 border-t border-border/50">
                      <span className="text-muted-foreground font-medium">Net HT</span>
                      <span className="font-semibold">{Number(facture.total_ht).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€</span>
                    </div>
                    {Number(facture.tva_rate) > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>TVA ({(Number(facture.tva_rate) * 100).toFixed(0)}%)</span>
                        <span className="font-medium">{tva.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-border/70 text-base font-bold">
                      <span>{Number(facture.tva_rate) > 0 ? "Total TTC" : "Total"}</span>
                      <span className={cn(Number(facture.total_ttc) < 0 ? "text-destructive" : "text-primary")}>{Number(facture.total_ttc).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* PDF Preview */}
            <PdfPreview type="facture" id={id!} fileName={facture.number} />
          </div>

          <div className="space-y-4">
            {remainingAmount > 0 ? (
              <Card className="shadow-card border-border/50">
                <CardContent className="p-5 space-y-3">
                  <h3 className="font-display font-semibold flex items-center gap-2"><Banknote className="h-4 w-4 text-success" /> Ajouter un paiement</h3>
                  <div className="flex justify-between items-center mb-2 px-1">
                    <span className="text-sm text-muted-foreground">Reste à payer :</span>
                    <span className="font-bold text-primary">{remainingAmount.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="number" step="0.01" min="0" max={remainingAmount} placeholder="Montant" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
                    <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
                  </div>
                  <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                    <SelectTrigger><SelectValue placeholder="Méthode" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="virement">Virement</SelectItem>
                      <SelectItem value="carte">Carte</SelectItem>
                      <SelectItem value="espèces">Espèces</SelectItem>
                      <SelectItem value="chèque">Chèque</SelectItem>
                      <SelectItem value="stripe">Stripe</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="Référence (optionnel)" value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} />
                  {paymentMethod === "espèces" && (
                    <Textarea
                      value={cashJustification}
                      onChange={(e) => setCashJustification(e.target.value)}
                      rows={3}
                      placeholder="Justification du paiement en espèces (obligatoire, min. 10 caractères)"
                    />
                  )}
                  <Textarea value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} rows={2} placeholder="Notes internes (optionnel)" />
                  <Button
                    className="w-full"
                    onClick={handleAddPayment}
                    disabled={createPaiement.isPending || !paymentAmount || Number(paymentAmount) <= 0 || Number(paymentAmount) > remainingAmount || (paymentMethod === "espèces" && cashJustification.trim().length < 10)}
                  >
                    {createPaiement.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer le paiement"}
                  </Button>
                  {paymentMethod === "espèces" && (
                    <p className="text-xs text-warning">Le paiement en espèces sera enregistré en attente de validation admin.</p>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-card border-border/50 bg-success/10">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-2">
                  <CheckCircle2 className="h-10 w-10 text-success mb-1" />
                  <h3 className="font-display font-bold text-success text-lg">Facture Réglée</h3>
                  <p className="text-sm text-success/80">Le montant total de cette facture a été payé.</p>
                </CardContent>
              </Card>
            )}

            {pendingCash.length > 0 && (
              <Card className="shadow-card border-warning/20 bg-warning/5">
                <CardContent className="p-5 space-y-3">
                  <h3 className="font-display font-semibold flex items-center gap-2 text-warning border-b border-warning/20 pb-2"><AlertTriangle className="h-4 w-4" /> Paiements espèces en attente</h3>
                  {pendingCash.map((p: any) => (
                    <div key={p.id} className="rounded-2xl border border-warning/20 bg-card p-4 space-y-3 shadow-card">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-bold text-foreground">{Number(p.amount).toLocaleString("fr-FR")}€</p>
                          <p className="text-xs text-muted-foreground">{new Date(p.payment_date).toLocaleDateString("fr-FR")}</p>
                        </div>
                        <span className="bg-warning/10 text-warning text-xs px-2 py-1 rounded-full font-medium">En attente</span>
                      </div>
                      <div className="bg-warning/10 rounded-xl p-2.5 text-xs text-warning border border-warning/15 italic">
                        <span className="font-semibold block mb-1">Justification :</span>
                        {p.cash_justification || "—"}
                      </div>
                      {isAdmin && (
                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-success border-success/30 hover:bg-success/10 hover:text-success"
                            onClick={() => updatePaiementStatus.mutate({ id: p.id, status: "approved" })}
                            disabled={updatePaiementStatus.isPending}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1.5" /> Approuver
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => {
                              const reason = prompt("Motif du rejet ?");
                              if (reason !== null) updatePaiementStatus.mutate({ id: p.id, status: "rejected", comment: reason });
                            }}
                            disabled={updatePaiementStatus.isPending}
                          >
                            <XCircle className="w-4 h-4 mr-1.5" /> Rejeter
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {proofs.length > 0 && (
              <Card className="shadow-card border-info/20 bg-info/5">
                <CardContent className="p-5 space-y-3">
                  <h3 className="font-display font-semibold flex items-center gap-2 text-info border-b border-info/20 pb-2"><FileText className="h-4 w-4" /> Justificatifs clients en attente</h3>
                  {proofs.map((proof: any) => (
                    <div key={proof.id} className="rounded-2xl border border-info/20 bg-card p-4 space-y-3 shadow-card">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate text-foreground" title={proof.file_name}>{proof.file_name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Le {new Date(proof.created_at).toLocaleString("fr-FR")}</p>
                        </div>
                        <a href={proof.file_url} target="_blank" rel="noreferrer" className="text-xs bg-info/10 text-info hover:bg-info/15 px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-medium transition-colors">
                          <Download className="h-3.5 w-3.5" /> Voir
                        </a>
                      </div>

                      {proof.amount_declared && (
                        <div className="flex justify-between items-center text-sm py-2 border-t border-b border-border/40">
                          <span className="text-muted-foreground">Montant déclaré :</span>
                          <span className="font-bold text-info">{Number(proof.amount_declared).toLocaleString("fr-FR")}€</span>
                        </div>
                      )}

                      {isAdmin && (
                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => handleApproveProof(proof)}
                            disabled={deleteProof.isPending}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1.5" /> Transformer en paiement
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                            onClick={() => handleRejectProof(proof.id)}
                            disabled={deleteProof.isPending}
                            title="Rejeter et supprimer ce justificatif"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}



            <Card className="shadow-card border-border/50">
              <CardContent className="p-5 space-y-3">
                <h3 className="font-display font-semibold">Actions rapides</h3>
                {facture.devis_id && (
                  <Button variant="outline" className="w-full gap-2 rounded-xl justify-start" onClick={() => navigate(`/finance/devis/${facture.devis_id}`)}>
                    <FileText className="h-4 w-4 text-primary" /> Voir le devis
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="w-full gap-2 rounded-xl justify-start"
                  onClick={() => navigate(`/finance/factures/nouveau?fromFacture=${facture.id}`)}
                >
                  <Copy className="h-4 w-4" /> Dupliquer
                </Button>
                <Button
                  variant="outline"
                  className="w-full gap-2 rounded-xl justify-start"
                  onClick={() => navigate(`/finance/devis/nouveau?fromFacture=${facture.id}`)}
                >
                  <FileText className="h-4 w-4 text-primary" /> Créer un devis pour un autre client
                </Button>
                <Button
                  variant="outline"
                  className="w-full gap-2 rounded-xl justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="h-4 w-4" /> Supprimer la facture
                </Button>
                {confirmDelete && (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                      <p className="text-sm text-destructive font-medium">Supprimer cette facture ?<br />
                        <span className="font-normal text-muted-foreground">Cette action est irréversible. Les paiements associés seront également supprimés.</span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 rounded-lg" onClick={() => setConfirmDelete(false)}>Annuler</Button>
                      <Button size="sm" className="flex-1 rounded-lg bg-destructive hover:bg-destructive/90 text-destructive-foreground gap-1.5" disabled={deleteFacture.isPending} onClick={handleDeleteFacture}>
                        {deleteFacture.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Supprimer
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {(facture as any).missions && (
              <Card className="shadow-card border-border/50">
                <CardContent className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Mission liée</p>
                  <div className="flex items-center gap-3">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    <p className="font-semibold text-sm">{(facture as any).missions.title}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="mt-2 w-full rounded-xl text-xs" onClick={() => navigate(`/missions/${(facture as any).missions.id}`)}>Voir la mission</Button>
                </CardContent>
              </Card>
            )}

            {facture.clients && (
              <Card className="shadow-card border-border/50">
                <CardContent className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Client</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                      {facture.clients.name.split(" ").map(w => w[0]).join("")}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{facture.clients.name}</p>
                      {facture.clients.company && <p className="text-xs text-muted-foreground">{facture.clients.company}</p>}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="mt-2 w-full rounded-xl text-xs" onClick={() => navigate(`/clients/${facture.client_id}`)}>Voir la fiche client</Button>
                </CardContent>
              </Card>
            )}

            <Card className="shadow-card border-border/50">
              <CardContent className="p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Paiements validés</p>
                <p className="text-sm">Payé validé: <span className="font-bold text-success">{approvedPaidAmount.toLocaleString("fr-FR")}€</span></p>
                <p className="text-sm">Reste estimé: <span className="font-bold">{Math.max(0, Number(facture.total_ttc) - approvedPaidAmount).toLocaleString("fr-FR")}€</span></p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
