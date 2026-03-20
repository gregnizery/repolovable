/* eslint-disable @typescript-eslint/no-explicit-any */
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDevis, useDeleteDevis, useCurrentProfile } from "@/hooks/use-data";
import { ArrowLeft, Edit, Send, Download, Copy, Trash2, FileText, Check, Clock, Mail, Loader2, CalendarDays, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDownloadPdf } from "@/hooks/use-download-pdf";
import { useSendEmail } from "@/hooks/use-send-email";
import { Skeleton } from "@/components/ui/skeleton";
import { PdfPreview } from "@/components/PdfPreview";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { useState } from "react";

const statusConfig: Record<string, { label: string; class: string; icon: typeof Check }> = {
  brouillon: { label: "Brouillon", class: "bg-muted text-muted-foreground", icon: FileText },
  "envoyé": { label: "Envoyé", class: "bg-info/10 text-info", icon: Send },
  "signé": { label: "Signé", class: "bg-success/10 text-success", icon: Check },
  "refusé": { label: "Refusé", class: "bg-destructive/10 text-destructive", icon: Trash2 },
  "expiré": { label: "Expiré", class: "bg-warning/10 text-warning", icon: Clock },
};

export default function DevisDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { downloadPdf, loading: pdfLoading } = useDownloadPdf();
  const { sendEmail, loading: emailLoading } = useSendEmail();
  const { data: devis, isLoading } = useDevis(id);
  const { data: profile } = useCurrentProfile();
  const deleteDevis = useDeleteDevis();
  const [confirmDelete, setConfirmDelete] = useState(false);
  useRealtimeSync("devis", [["devis", id!]]);
  useRealtimeSync("devis_items", [["devis", id!]]);

  const handleDelete = () => {
    deleteDevis.mutate(id!, {
      onSuccess: () => navigate("/finance/devis"),
    });
  };

  if (isLoading) return <AppLayout><div className="space-y-4 max-w-5xl"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div></AppLayout>;
  if (!devis) return <AppLayout><div className="p-12 text-center text-muted-foreground">Devis introuvable</div></AppLayout>;

  const tva = Number(devis.total_ttc) - Number(devis.total_ht);
  const sc = statusConfig[devis.status];
  const items = devis.devis_items || [];

  const factures = (devis as any).factures || [];


  const totalInvoiced = factures.reduce((sum: number, f: any) => {
    // Only count active factures (not cancelled/annulée)
    if (f.status === "annulée") return sum;
    return sum + Number(f.total_ttc);
  }, 0);

  const missionEndDate = (devis as any).missions?.end_date;
  const isMissionCompleted = missionEndDate ? new Date(missionEndDate) <= new Date() : true;

  const canGenerateInvoice = devis.status === "signé" && (totalInvoiced <= 0) && isMissionCompleted;

  const hasActiveInvoice = factures.some((f: any) => f.type === "invoice" && f.status !== "annulée");

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl">
        <button onClick={() => navigate("/finance/devis")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Retour aux devis
        </button>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-display font-bold">{devis.number}</h1>
              <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", sc?.class)}>{sc?.label}</span>
            </div>
            <p className="text-muted-foreground text-sm">{devis.clients?.name || ""} · Créé le {new Date(devis.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {devis.status === "brouillon" && (
              <>
                <Button variant="outline" className="gap-2 rounded-xl" onClick={() => navigate(`/finance/devis/${id}/modifier`)}><Edit className="h-4 w-4" /> Modifier</Button>
                <Button className="gradient-primary text-white gap-2 rounded-xl hover:opacity-90" disabled={emailLoading} onClick={() => sendEmail("devis", id!)}>
                  {emailLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Envoyer
                </Button>
              </>
            )}
            {devis.status === "envoyé" && <Button variant="outline" className="gap-2 rounded-xl" disabled={emailLoading} onClick={() => sendEmail("devis", id!)}>{emailLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Relancer</Button>}
            <Button variant="outline" className="gap-2 rounded-xl" disabled={pdfLoading} onClick={() => downloadPdf("devis", id!, devis.number)}>
              {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} PDF
            </Button>
            {devis.status !== "signé" && (
              <Button variant="outline" className="gap-2 rounded-xl" onClick={() => navigate(`/finance/devis/nouveau?fromDevis=${devis.id}`)}>
                <Copy className="h-4 w-4" /> Dupliquer
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="shadow-lg border-border/50 overflow-hidden">
              <div className="gradient-primary p-6 text-white">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white/70 text-sm font-medium uppercase tracking-wider">Devis</p>
                    <p className="text-2xl font-display font-bold mt-1">{devis.number}</p>
                  </div>
                  <div className="text-right text-sm text-white/80">
                    <p>Émis le {new Date(devis.date).toLocaleDateString("fr-FR")}</p>
                    {devis.valid_until && <p>Valide jusqu'au {new Date(devis.valid_until).toLocaleDateString("fr-FR")}</p>}
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
                    <p className="font-semibold">{devis.clients?.name || ""}</p>
                    {devis.clients?.company && <p className="text-sm text-muted-foreground">{devis.clients.company}</p>}
                    {devis.clients?.email && <p className="text-sm text-muted-foreground">{devis.clients.email}</p>}
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
                      <span className="font-medium">{(Number(devis.total_ht) + (devis.discount_type === "percent" ? (Number(devis.total_ht) / (1 - Number(devis.discount_amount) / 100)) * (Number(devis.discount_amount) / 100) : Number(devis.discount_amount))).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€</span>
                    </div>
                    {/* Simplified: calculate global discount directly if we want it perfect, 
                        or just rely on the stored total_ht which is already discounted. 
                        Let's show the breakdown if discount exists. */}
                    {Number(devis.discount_amount) > 0 && (
                      <div className="flex justify-between text-destructive italic">
                        <span>Remise globale ({devis.discount_type === "percent" ? `${devis.discount_amount}%` : `${devis.discount_amount}€`})</span>
                        <span>-{(devis.discount_type === "percent" ? (Number(devis.total_ht) / (1 - Number(devis.discount_amount) / 100)) * (Number(devis.discount_amount) / 100) : Number(devis.discount_amount)).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-1 border-t border-border/50">
                      <span className="text-muted-foreground font-medium">Net HT</span>
                      <span className="font-semibold">{Number(devis.total_ht).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€</span>
                    </div>
                    {Number(devis.tva_rate) > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>TVA ({(Number(devis.tva_rate) * 100).toFixed(0)}%)</span>
                        <span className="font-medium">{tva.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-primary/20 text-base font-bold">
                      <span>{Number(devis.tva_rate) > 0 ? "Total TTC" : "Total"}</span>
                      <span className="text-primary">{Number(devis.total_ttc).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* PDF Preview */}
            <PdfPreview type="devis" id={id!} fileName={devis.number} status={devis.status} />
          </div>

          <div className="space-y-4">
            <Card className="shadow-card border-border/50">
              <CardContent className="p-5 space-y-3">
                <h3 className="font-display font-semibold">Actions rapides</h3>
                {devis.status === "signé" && (
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full gap-2 rounded-xl justify-start",
                        !canGenerateInvoice && "opacity-50 cursor-not-allowed"
                      )}
                      onClick={() => canGenerateInvoice && navigate(`/finance/factures/nouveau?fromDevis=${devis.id}`)}
                      disabled={!canGenerateInvoice}
                    >
                      <FileText className="h-4 w-4 text-primary" />
                      {hasActiveInvoice && totalInvoiced > 0 ? "Facture déjà émise" : "Générer la facture"}
                    </Button>
                    {hasActiveInvoice && totalInvoiced > 0 ? (
                      <p className="text-[10px] text-muted-foreground px-1 italic">
                        Un avoir compensatoire est requis pour ré-émettre une facture.
                      </p>
                    ) : !isMissionCompleted ? (
                      <p className="text-[10px] text-warning px-1 italic">
                        L'émission de la facture sera débloquée une fois la mission terminée (date de fin dépassée).
                      </p>
                    ) : null}

                    <Button
                      variant="outline"
                      className="w-full gap-2 rounded-xl justify-start text-destructive opacity-50 cursor-not-allowed"
                      disabled
                    >
                      <Trash2 className="h-4 w-4" /> Supprimer le devis
                    </Button>
                    <p className="text-[10px] text-muted-foreground px-1 italic">
                      Un devis signé ne peut pas être supprimé. Veuillez d'abord annuler ou supprimer la mission associée.
                    </p>
                  </div>
                )}
                {devis.status !== "signé" && (
                  <>
                    <Button
                      variant="outline"
                      className="w-full gap-2 rounded-xl justify-start"
                      onClick={() => navigate(`/finance/devis/nouveau?fromDevis=${devis.id}`)}
                    >
                      <Copy className="h-4 w-4" /> Dupliquer le devis
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full gap-2 rounded-xl justify-start"
                      onClick={() => navigate(`/finance/factures/nouveau?fromDevis=${devis.id}`)}
                    >
                      <FileText className="h-4 w-4 text-primary" /> Créer une facture pour un autre client
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full gap-2 rounded-xl justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setConfirmDelete(true)}
                    >
                      <Trash2 className="h-4 w-4" /> Supprimer le devis
                    </Button>
                    {confirmDelete && (
                      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                          <p className="text-sm text-destructive font-medium">Supprimer ce devis ?<br />
                            <span className="font-normal text-muted-foreground">Cette action est irréversible. Toutes les lignes seront supprimées.</span>
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="flex-1 rounded-lg" onClick={() => setConfirmDelete(false)}>Annuler</Button>
                          <Button size="sm" className="flex-1 rounded-lg bg-destructive hover:bg-destructive/90 text-destructive-foreground gap-1.5" disabled={deleteDevis.isPending} onClick={handleDelete}>
                            {deleteDevis.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Supprimer
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {(devis as any).missions && (
              <Card className="shadow-card border-border/50">
                <CardContent className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Mission liée</p>
                  <div className="flex items-center gap-3">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    <p className="font-semibold text-sm">{(devis as any).missions.title}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="mt-2 w-full rounded-xl text-xs" onClick={() => navigate(`/missions/${devis.mission_id}`)}>Voir la mission</Button>
                </CardContent>
              </Card>
            )}

            {devis.clients && (
              <Card className="shadow-card border-border/50">
                <CardContent className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Client</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                      {devis.clients.name.split(" ").map(w => w[0]).join("")}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{devis.clients.name}</p>
                      {devis.clients.company && <p className="text-xs text-muted-foreground">{devis.clients.company}</p>}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="mt-2 w-full rounded-xl text-xs" onClick={() => navigate(`/clients/${devis.client_id}`)}>Voir la fiche client</Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
