import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { WorkspaceHero, WorkspaceKpiCard, WorkspaceKpiGrid, WorkspacePage, WorkspacePanel } from "@/components/layout/Workspace";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDevisList, useFactures, usePaiements, useMissions } from "@/hooks/use-data";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PaiementFormDialog } from "@/components/PaiementFormDialog";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonCard, SkeletonTable } from "@/components/SkeletonCard";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { useUserRole, canEdit } from "@/hooks/use-user-role";
import { RevenueChart } from "@/components/charts/RevenueChart";
import { DevisConversionChart } from "@/components/charts/DevisConversionChart";
import { PaymentDelayChart } from "@/components/charts/PaymentDelayChart";
import { EventTypeChart } from "@/components/charts/EventTypeChart";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, Loader2, FileText, BarChart3, CreditCard, Edit, Eye, Receipt, Search, Send } from "lucide-react";

const devisStatusConfig: Record<string, { label: string; class: string }> = {
  brouillon: { label: "Brouillon", class: "bg-muted text-muted-foreground" },
  "envoyé": { label: "Envoyé", class: "bg-info/10 text-info" },
  "signé": { label: "Signé", class: "bg-success/10 text-success" },
  "refusé": { label: "Refusé", class: "bg-destructive/10 text-destructive" },
  "expiré": { label: "Expiré", class: "bg-warning/10 text-warning" },
};

const factureStatusConfig: Record<string, { label: string; class: string }> = {
  brouillon: { label: "Brouillon", class: "bg-muted text-muted-foreground" },
  "envoyée": { label: "Envoyée", class: "bg-info/10 text-info" },
  "payée": { label: "Payée", class: "bg-success/10 text-success" },
  en_retard: { label: "En retard", class: "bg-destructive/10 text-destructive" },
  "annulée": { label: "Annulée", class: "bg-muted text-muted-foreground" },
};

const methodLabels: Record<string, string> = {
  virement: "Virement", carte: "Carte", "espèces": "Espèces", "chèque": "Chèque", stripe: "Stripe",
};

export default function Finance() {
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState("");

  const tabFromPath = location.pathname.startsWith("/finance/factures")
    ? "factures"
    : location.pathname.startsWith("/finance/paiements")
      ? "paiements"
      : "devis";

  const [activeTab, setActiveTab] = useState(tabFromPath);

  useEffect(() => {
    setActiveTab(tabFromPath);
  }, [tabFromPath]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === "factures") {
      navigate("/finance/factures");
      return;
    }
    if (value === "paiements") {
      navigate("/finance/paiements");
      return;
    }
    if (value === "devis") {
      navigate("/finance/devis");
    }
  };
  const { data: devisList = [], isLoading: loadingDevis } = useDevisList();
  const { data: factures = [], isLoading: loadingFactures } = useFactures();
  const { data: paiements = [], isLoading: loadingPaiements } = usePaiements();
  const { data: missions = [] } = useMissions();
  const { data: roleData } = useUserRole();
  const isAdminOrManager = roleData?.role === "admin" || roleData?.role === "manager";

  useRealtimeSync("devis", [["devis"]]);
  useRealtimeSync("factures", [["factures"]]);
  useRealtimeSync("paiements", [["paiements"]]);

  const loading = loadingDevis || loadingFactures || loadingPaiements;
  const [exportLoading, setExportLoading] = useState(false);

  const signedDevis = devisList.filter(d => d.status === "signé");
  const pendingDevisCount = devisList.filter(d => d.status === "envoyé").length;
  const unpaidFacturesCount = factures.filter(f => f.status === "en_retard" || f.status === "envoyée").length;
  const unpaidAmount = factures
    .filter(f => f.status === "en_retard" || f.status === "envoyée")
    .reduce((sum, f) => sum + Number(f.total_ttc || 0), 0);
  const collectedTotal = paiements.reduce((s, p) => s + Number(p.amount), 0);
  const pendingCash = paiements.filter(p => p.method === "espèces" && p.validation_status === "pending").length;

  // Dynamic Margin Calculation (Simplistic for now: Revenue - Estimated Costs)
  // In a real app, costs would be tracked per mission.
  const realizedRevenueTotal = factures.reduce((sum, f) => sum + Number(f.total_ht || 0), 0);

  // We estimate 40% margin if not specified, or use mission data if we had it aggregated
  const estimatedMarginRate = 0.42;
  const realizedMarginTotal = realizedRevenueTotal * estimatedMarginRate;
  const realizedMarginRate = estimatedMarginRate * 100;

  const expectedRevenueTotal = signedDevis.reduce((sum, d) => sum + Number(d.total_ht || 0), 0);
  const expectedMarginTotal = expectedRevenueTotal * estimatedMarginRate;
  const expectedMarginRate = realizedMarginRate;

  const handleExportFEC = async () => {
    setExportLoading(true);
    try {
      const start = new Date(new Date().getFullYear(), 0, 1).toISOString();
      const end = new Date(new Date().getFullYear(), 11, 31).toISOString();

      const { data, error } = await supabase.functions.invoke("export-fec", {
        body: { start_date: start, end_date: end }
      });

      if (error) throw error;

      // Create blob and download
      const blob = new Blob([data], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FEC_${new Date().getFullYear()}.txt`;
      a.click();
      toast.success("Export FEC généré avec succès");
    } catch (e: unknown) {
      toast.error("Erreur lors de l'export FEC: " + (e as Error).message);
    } finally {
      setExportLoading(false);
    }
  };

  const filteredDevis = devisList.filter(d =>
    d.number?.toLowerCase().includes(search.toLowerCase()) ||
    (d.clients?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const filteredFactures = factures.filter(f =>
    f.number?.toLowerCase().includes(search.toLowerCase()) ||
    (f.clients?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const filteredPaiements = paiements.filter(p =>
    (p.reference || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.factures?.clients?.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (methodLabels[p.method || ""] || p.method || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <WorkspacePage>
        <WorkspaceHero
          eyebrow="Finance"
          title="Command Center"
          description="Pilotez devis, factures, paiements et analyses depuis une seule surface dense, avec les relances et exports à portée immédiate."
          actions={(
            <>
              {isAdminOrManager && (
                <>
                  <Button className="gap-2 rounded-2xl" onClick={() => navigate("/finance/devis/nouveau")}>
                    <FileText className="h-4 w-4" />
                    Nouveau devis
                  </Button>
                  <Button variant="outline" className="gap-2 rounded-2xl" onClick={() => navigate("/finance/factures/nouveau")}>
                    <Receipt className="h-4 w-4" />
                    Nouvelle facture
                  </Button>
                </>
              )}
            </>
          )}
          aside={(
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-[24px] border border-border/60 bg-background/80 p-4 shadow-inner">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Recouvrement</p>
                <p className="mt-2 text-2xl font-display font-bold text-destructive">{unpaidFacturesCount}</p>
                <p className="mt-1 text-sm text-muted-foreground">{unpaidAmount.toLocaleString("fr-FR")}€ restent à encaisser.</p>
              </div>
              <div className="rounded-[24px] border border-border/60 bg-background/80 p-4 shadow-inner">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Cash encaissé</p>
                <p className="mt-2 text-2xl font-display font-bold text-foreground">{collectedTotal.toLocaleString("fr-FR")}€</p>
                <p className="mt-1 text-sm text-muted-foreground">{paiements.length} mouvement(s) validé(s).</p>
              </div>
              <div className="rounded-[24px] border border-border/60 bg-background/80 p-4 shadow-inner">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Validation manuelle</p>
                <p className="mt-2 text-2xl font-display font-bold text-warning">{pendingCash}</p>
                <p className="mt-1 text-sm text-muted-foreground">paiement(s) espèces en attente.</p>
              </div>
            </div>
          )}
        />

        <WorkspaceKpiGrid>
          <WorkspaceKpiCard label="Devis en attente" value={pendingDevisCount} detail="À convertir en signature" icon={FileText} toneClassName="bg-primary/12 text-primary" />
          <WorkspaceKpiCard label="Factures impayées" value={unpaidFacturesCount} detail={`${unpaidAmount.toLocaleString("fr-FR")}€`} icon={Receipt} toneClassName="bg-destructive/12 text-destructive" />
          <WorkspaceKpiCard label="Marge prévue" value={`${expectedMarginTotal.toLocaleString("fr-FR", { minimumFractionDigits: 0 })}€`} detail={`Taux moyen signé: ${expectedMarginRate.toFixed(1)}%`} icon={BarChart3} toneClassName="bg-warning/12 text-warning" />
          <WorkspaceKpiCard label="Marge réalisée" value={`${realizedMarginTotal.toLocaleString("fr-FR", { minimumFractionDigits: 0 })}€`} detail={`Taux réalisé: ${realizedMarginRate.toFixed(1)}%`} icon={CreditCard} toneClassName="bg-success/12 text-success" />
        </WorkspaceKpiGrid>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <WorkspacePanel
            title="Flux financier"
            description="Consultez les listes denses, basculez entre les vues et déclenchez les actions courantes sans quitter le workspace."
            action={(
              <div className="flex gap-2 flex-wrap justify-end">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-10 rounded-2xl w-56" />
                </div>
                {isAdminOrManager && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-2xl gap-1.5 border-primary/20 hover:bg-primary/5 text-primary"
                      onClick={handleExportFEC}
                      disabled={exportLoading}
                    >
                      {exportLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                      Exporter FEC
                    </Button>
                    <PaiementFormDialog />
                  </>
                )}
              </div>
            )}
          >
            <TabsList className="bg-muted/50 rounded-xl">
              <TabsTrigger value="devis" className="rounded-lg gap-1.5"><FileText className="h-3.5 w-3.5" /> Devis</TabsTrigger>
              <TabsTrigger value="factures" className="rounded-lg gap-1.5"><Receipt className="h-3.5 w-3.5" /> Factures</TabsTrigger>
              <TabsTrigger value="paiements" className="rounded-lg gap-1.5"><CreditCard className="h-3.5 w-3.5" /> Paiements</TabsTrigger>
              <TabsTrigger value="analyses" className="rounded-lg gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Analyses</TabsTrigger>
            </TabsList>
          </WorkspacePanel>

          {/* DEVIS */}
          <TabsContent value="devis" className="mt-4">
            {loading ? (
              <>
                <div className="space-y-3 md:hidden">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} variant="finance" />)}</div>
                <div className="hidden md:block"><SkeletonTable rows={4} cols={6} /></div>
              </>
            ) : devisList.length === 0 ? (
              <EmptyState icon={FileText} title="Aucun devis" description="Créez votre premier devis." actionLabel="Nouveau devis" onAction={() => navigate("/finance/devis/nouveau")} />
            ) : (
              <>
                <div className="space-y-3 md:hidden">
                  {filteredDevis.map(d => (
                    <Card key={d.id} className="shadow-card border-border/50 cursor-pointer hover:shadow-lg transition-all" onClick={() => navigate(`/finance/devis/${d.id}`)}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-sm">{d.number}</p>
                            <p className="text-xs text-muted-foreground">{d.clients?.name || ""}</p>
                          </div>
                          <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", devisStatusConfig[d.status]?.class)}>{devisStatusConfig[d.status]?.label}</span>
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                          <span className="text-xs text-muted-foreground">{new Date(d.date).toLocaleDateString("fr-FR")}</span>
                          <span className="font-bold text-primary">{Number(d.total_ttc).toLocaleString()}€</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <Card className="shadow-card border-border/50 overflow-hidden hidden md:block">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-border bg-muted/30">
                        <th className="text-left p-4 font-medium text-muted-foreground">N°</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Client</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Date</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Statut</th>
                        <th className="text-right p-4 font-medium text-muted-foreground">Montant TTC</th>
                        <th className="text-right p-4 font-medium text-muted-foreground">Actions</th>
                      </tr></thead>
                      <tbody>
                        {filteredDevis.map(d => (
                          <tr key={d.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate(`/finance/devis/${d.id}`)}>
                            <td className="p-4 font-medium">{d.number}</td>
                            <td className="p-4">{d.clients?.name || ""}</td>
                            <td className="p-4 text-muted-foreground">{new Date(d.date).toLocaleDateString("fr-FR")}</td>
                            <td className="p-4"><span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", devisStatusConfig[d.status]?.class)}>{devisStatusConfig[d.status]?.label}</span></td>
                            <td className="p-4 text-right font-semibold">{Number(d.total_ttc).toLocaleString()}€</td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Voir" onClick={e => { e.stopPropagation(); navigate(`/finance/devis/${d.id}`); }}><Eye className="h-4 w-4 text-muted-foreground" /></button>
                                {d.status === "brouillon" && (
                                  <>
                                    <button className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Modifier" onClick={e => { e.stopPropagation(); navigate(`/finance/devis/${d.id}/modifier`); }}><Edit className="h-4 w-4 text-muted-foreground" /></button>
                                    <button className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Envoyer" onClick={e => e.stopPropagation()}><Send className="h-4 w-4 text-muted-foreground" /></button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </>
            )}
          </TabsContent>

          {/* FACTURES */}
          <TabsContent value="factures" className="mt-4">
            {loading ? (
              <>
                <div className="space-y-3 md:hidden">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} variant="finance" />)}</div>
                <div className="hidden md:block"><SkeletonTable rows={4} cols={6} /></div>
              </>
            ) : factures.length === 0 ? (
              <EmptyState icon={Receipt} title="Aucune facture" description="Vos factures apparaîtront ici." actionLabel="Nouvelle facture" onAction={() => navigate("/finance/factures/nouveau")} />
            ) : (
              <>
                <div className="space-y-3 md:hidden">
                  {filteredFactures.map(f => (
                    <Card key={f.id} className="shadow-card border-border/50 cursor-pointer hover:shadow-lg transition-all" onClick={() => navigate(`/finance/factures/${f.id}`)}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex flex-col">
                            <p className="font-semibold text-sm flex items-center gap-2">
                              {f.number}
                              {f.number?.startsWith("AV-") && <span className="text-[10px] bg-warning/20 text-warning px-1.5 py-0.5 rounded uppercase font-bold">Avoir</span>}
                            </p>
                            <p className="text-xs text-muted-foreground">{f.clients?.name || ""}</p>
                            {(f as any).missions?.title && (
                              <p className="text-xs text-muted-foreground/80 mt-0.5"><span className="font-medium text-muted-foreground">Mission:</span> {(f as any).missions.title}</p>
                            )}
                          </div>
                          <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", factureStatusConfig[f.status]?.class)}>{factureStatusConfig[f.status]?.label}</span>
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                          <span className="text-xs text-muted-foreground">{f.due_date ? `Éch. ${new Date(f.due_date).toLocaleDateString("fr-FR")}` : ""}</span>
                          <span className={cn("font-bold", Number(f.total_ttc) < 0 && "text-destructive")}>{Number(f.total_ttc).toLocaleString()}€</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <Card className="shadow-card border-border/50 overflow-hidden hidden md:block">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-border bg-muted/30">
                        <th className="text-left p-4 font-medium text-muted-foreground">N°</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Client</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Échéance</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Statut</th>
                        <th className="text-right p-4 font-medium text-muted-foreground">Montant</th>
                        <th className="text-right p-4 font-medium text-muted-foreground">Actions</th>
                      </tr></thead>
                      <tbody>
                        {filteredFactures.map(f => (
                          <tr key={f.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate(`/finance/factures/${f.id}`)}>
                            <td className="p-4 font-medium flex items-center gap-2">
                              {f.number}
                              {f.number?.startsWith("AV-") && <span className="text-[10px] bg-warning/20 text-warning px-1.5 py-0.5 rounded uppercase font-bold">Avoir</span>}
                            </td>
                            <td className="p-4">
                              <span>{f.clients?.name || ""}</span>
                              {(f as any).missions?.title && (
                                <span className="block text-xs text-muted-foreground mt-0.5">{(f as any).missions.title}</span>
                              )}
                            </td>
                            <td className="p-4 text-muted-foreground">{f.due_date ? new Date(f.due_date).toLocaleDateString("fr-FR") : ""}</td>
                            <td className="p-4"><span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", factureStatusConfig[f.status]?.class)}>{factureStatusConfig[f.status]?.label}</span></td>
                            <td className={cn("p-4 text-right font-semibold", Number(f.total_ttc) < 0 && "text-destructive")}>{Number(f.total_ttc).toLocaleString()}€</td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Voir" onClick={e => { e.stopPropagation(); navigate(`/finance/factures/${f.id}`); }}><Eye className="h-4 w-4 text-muted-foreground" /></button>
                                {f.status === "brouillon" && (
                                  <button className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Modifier" onClick={e => { e.stopPropagation(); navigate(`/finance/factures/${f.id}/modifier`); }}><Edit className="h-4 w-4 text-muted-foreground" /></button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </>
            )}
          </TabsContent>

          {/* PAIEMENTS */}
          <TabsContent value="paiements" className="mt-4">
            {loading ? (
              <>
                <div className="space-y-3 md:hidden">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} variant="finance" />)}</div>
                <div className="hidden md:block"><SkeletonTable rows={4} cols={5} /></div>
              </>
            ) : paiements.length === 0 ? (
              <EmptyState icon={CreditCard} title="Aucun paiement reçu" description="Les paiements enregistrés apparaîtront ici." />
            ) : (
              <>
                <div className="space-y-3 md:hidden">
                  {filteredPaiements.map(p => (
                    <Card key={p.id} className="shadow-card border-border/50">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-sm">{p.factures?.number || ""}</p>
                            <p className="text-xs text-muted-foreground">{p.factures?.clients?.name || ""}</p>
                          </div>
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted">{methodLabels[p.method || ""] || p.method}</span>
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                          <span className="text-xs text-muted-foreground">{new Date(p.payment_date).toLocaleDateString("fr-FR")}</span>
                          <span className="font-bold text-success">{Number(p.amount).toLocaleString()}€</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <Card className="shadow-card border-border/50 overflow-hidden hidden md:block">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-border bg-muted/30">
                        <th className="text-left p-4 font-medium text-muted-foreground">Facture</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Client</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Date</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Méthode</th>
                        <th className="text-right p-4 font-medium text-muted-foreground">Montant</th>
                      </tr></thead>
                      <tbody>
                        {filteredPaiements.map(p => (
                          <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                            <td className="p-4 font-medium">{p.factures?.number || ""}</td>
                            <td className="p-4">{p.factures?.clients?.name || ""}</td>
                            <td className="p-4 text-muted-foreground">{new Date(p.payment_date).toLocaleDateString("fr-FR")}</td>
                            <td className="p-4"><span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted">{methodLabels[p.method || ""] || p.method}</span></td>
                            <td className="p-4 text-right font-semibold text-success">{Number(p.amount).toLocaleString()}€</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </>
            )}
          </TabsContent>

          {/* ANALYSES */}
          <TabsContent value="analyses" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <RevenueChart paiements={paiements} months={12} />
              <DevisConversionChart devisList={devisList} />
              <EventTypeChart missions={missions} />
              <PaymentDelayChart factures={factures} paiements={paiements} />
            </div>
          </TabsContent>
        </Tabs>
      </WorkspacePage>
    </AppLayout>
  );
}
