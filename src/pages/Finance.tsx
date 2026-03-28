import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CreditCard, Download, Eye, FileText, Receipt } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { PaiementFormDialog } from "@/components/PaiementFormDialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useDevisList, useFactures, useMissions, usePaiements } from "@/hooks/use-data";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { useUserRole } from "@/hooks/use-user-role";
import { formatCompactCurrency, formatCount, formatCurrency, formatDateLabel } from "@/lib/formatters";
import type { DevisListItem, FactureListItem, MissionListItem, PaiementListItem } from "@/lib/view-models";
import {
  DenseTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableRow,
  FilterBar,
  MetricStrip,
  SectionHeader,
  StatusPill,
  WorkbenchPanel,
} from "@/components/workbench/primitives";
import { RevenueChart } from "@/components/charts/RevenueChart";
import { DevisConversionChart } from "@/components/charts/DevisConversionChart";
import { EventTypeChart } from "@/components/charts/EventTypeChart";
import { PaymentDelayChart } from "@/components/charts/PaymentDelayChart";

const devisStatusTone: Record<string, "default" | "info" | "success" | "destructive" | "warning"> = {
  brouillon: "default",
  envoyé: "info",
  signé: "success",
  refusé: "destructive",
  expiré: "warning",
};

const factureStatusTone: Record<string, "default" | "info" | "success" | "destructive"> = {
  brouillon: "default",
  envoyée: "info",
  payée: "success",
  en_retard: "destructive",
  annulée: "default",
};

const paymentStatusTone: Record<string, "default" | "warning" | "success" | "destructive"> = {
  pending: "warning",
  approved: "success",
  rejected: "destructive",
};

const paymentMethodLabel: Record<string, string> = {
  virement: "Virement",
  carte: "Carte",
  espèces: "Espèces",
  chèque: "Chèque",
  stripe: "Stripe",
};

export default function Finance() {
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState("");
  const [exportLoading, setExportLoading] = useState(false);

  const initialTab = location.pathname.startsWith("/finance/factures")
    ? "factures"
    : location.pathname.startsWith("/finance/paiements")
      ? "paiements"
      : "devis";

  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const { data: devisList = [], isLoading: devisLoading } = useDevisList();
  const { data: factures = [], isLoading: facturesLoading } = useFactures();
  const { data: paiements = [], isLoading: paiementsLoading } = usePaiements();
  const { data: missions = [] } = useMissions();
  const { data: roleData } = useUserRole();
  const isAdminOrManager = roleData?.role === "admin" || roleData?.role === "manager";

  useRealtimeSync("devis", [["devis"]]);
  useRealtimeSync("factures", [["factures"]]);
  useRealtimeSync("paiements", [["paiements"]]);

  const devisRows = devisList as DevisListItem[];
  const factureRows = factures as FactureListItem[];
  const paiementRows = paiements as PaiementListItem[];
  const missionRows = missions as MissionListItem[];

  const pendingDevis = devisRows.filter((devis) => devis.status === "envoyé");
  const unpaidFactures = factureRows.filter((facture) => facture.status === "en_retard" || facture.status === "envoyée");
  const pendingCash = paiementRows.filter((paiement) => paiement.method === "espèces" && paiement.validation_status === "pending");
  const collectedTotal = paiementRows.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const unpaidTotal = unpaidFactures.reduce((sum, facture) => sum + Number(facture.total_ttc || 0), 0);

  const filteredDevis = devisRows.filter((devis) =>
    [devis.number, devis.clients?.name ?? ""].join(" ").toLowerCase().includes(search.toLowerCase()),
  );
  const filteredFactures = factureRows.filter((facture) =>
    [facture.number, facture.clients?.name ?? ""].join(" ").toLowerCase().includes(search.toLowerCase()),
  );
  const filteredPaiements = paiementRows.filter((paiement) =>
    [paiement.reference ?? "", paiement.factures?.clients?.name ?? "", paymentMethodLabel[paiement.method ?? ""] ?? paiement.method ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

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
    navigate("/finance/devis");
  };

  const handleExportFEC = async () => {
    setExportLoading(true);
    try {
      const start = new Date(new Date().getFullYear(), 0, 1).toISOString();
      const end = new Date(new Date().getFullYear(), 11, 31).toISOString();
      const { data, error } = await supabase.functions.invoke("export-fec", {
        body: { start_date: start, end_date: end },
      });

      if (error) throw error;

      const blob = new Blob([data], { type: "text/plain" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `FEC_${new Date().getFullYear()}.txt`;
      link.click();
      toast.success("Export FEC généré avec succès");
    } catch (error) {
      toast.error("Erreur lors de l’export FEC: " + (error as Error).message);
    } finally {
      setExportLoading(false);
    }
  };

  const isLoading = devisLoading || facturesLoading || paiementsLoading;

  return (
    <AppLayout>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <SectionHeader
          eyebrow="Gestion financière"
          title="Finance"
          description="Relances, signatures et encaissements sur une même surface de travail."
          actions={
            isAdminOrManager ? (
              <>
                <Button className="gap-2" onClick={() => navigate("/finance/devis/nouveau")}>
                  <FileText className="h-4 w-4" />
                  Nouveau devis
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => navigate("/finance/factures/nouveau")}>
                  <Receipt className="h-4 w-4" />
                  Nouvelle facture
                </Button>
              </>
            ) : null
          }
        />

        <MetricStrip
          items={[
            {
              label: "Devis à signer",
              value: formatCount(pendingDevis.length),
              detail: formatCompactCurrency(pendingDevis.reduce((sum, devis) => sum + Number(devis.total_ttc || 0), 0)),
              icon: FileText,
              tone: "info",
            },
            {
              label: "Factures impayées",
              value: formatCount(unpaidFactures.length),
              detail: formatCompactCurrency(unpaidTotal),
              icon: Receipt,
              tone: "destructive",
            },
            {
              label: "Cash encaissé",
              value: formatCompactCurrency(collectedTotal),
              detail: `${paiementRows.length} paiement(s)`,
              icon: CreditCard,
              tone: "success",
            },
            {
              label: "Espèces à valider",
              value: formatCount(pendingCash.length),
              detail: "validation manuelle",
              icon: CreditCard,
              tone: "warning",
            },
          ]}
        />

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <WorkbenchPanel
            title="Flux actionnables"
            description="Listes denses, recherche transversale et accès direct aux actions courantes."
            action={
              <div className="flex flex-wrap items-center gap-2">
                {isAdminOrManager ? (
                  <>
                    <Button variant="outline" className="gap-2" onClick={handleExportFEC} disabled={exportLoading}>
                      <Download className="h-4 w-4" />
                      {exportLoading ? "Export..." : "Exporter FEC"}
                    </Button>
                    <PaiementFormDialog />
                  </>
                ) : null}
              </div>
            }
          >
            <div className="space-y-4">
              <FilterBar
                searchValue={search}
                onSearchChange={setSearch}
                searchPlaceholder="Numéro, client, référence"
              />

              <TabsList className="w-full justify-start rounded-lg">
                <TabsTrigger value="devis" className="gap-2 rounded-md">
                  <FileText className="h-4 w-4" />
                  Devis
                </TabsTrigger>
                <TabsTrigger value="factures" className="gap-2 rounded-md">
                  <Receipt className="h-4 w-4" />
                  Factures
                </TabsTrigger>
                <TabsTrigger value="paiements" className="gap-2 rounded-md">
                  <CreditCard className="h-4 w-4" />
                  Paiements
                </TabsTrigger>
              </TabsList>

              <TabsContent value="devis">
                {isLoading ? (
                  <p className="text-sm text-muted-foreground">Chargement des devis…</p>
                ) : filteredDevis.length === 0 ? (
                  <EmptyState
                    icon={FileText}
                    title="Aucun devis"
                    description="Créez votre premier devis pour démarrer le suivi commercial."
                    actionLabel="Nouveau devis"
                    onAction={() => navigate("/finance/devis/nouveau")}
                  />
                ) : (
                  <DenseTable>
                    <DenseTableHeader>
                      <DenseTableRow>
                        <DenseTableHead>Devis</DenseTableHead>
                        <DenseTableHead>Client</DenseTableHead>
                        <DenseTableHead>Date</DenseTableHead>
                        <DenseTableHead>Statut</DenseTableHead>
                        <DenseTableHead className="text-right">Montant TTC</DenseTableHead>
                        <DenseTableHead className="text-right">Action</DenseTableHead>
                      </DenseTableRow>
                    </DenseTableHeader>
                    <DenseTableBody>
                      {filteredDevis.map((devis) => (
                        <DenseTableRow key={devis.id}>
                          <DenseTableCell className="font-medium text-foreground">{devis.number}</DenseTableCell>
                          <DenseTableCell>{devis.clients?.name ?? "Client non renseigné"}</DenseTableCell>
                          <DenseTableCell className="font-mono text-xs text-muted-foreground">{formatDateLabel(devis.date)}</DenseTableCell>
                          <DenseTableCell>
                            <StatusPill label={devis.status} tone={devisStatusTone[devis.status] ?? "default"} />
                          </DenseTableCell>
                          <DenseTableCell className="text-right font-mono">{formatCurrency(devis.total_ttc)}</DenseTableCell>
                          <DenseTableCell className="text-right">
                            <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate(`/finance/devis/${devis.id}`)}>
                              <Eye className="h-4 w-4" />
                              Ouvrir
                            </Button>
                          </DenseTableCell>
                        </DenseTableRow>
                      ))}
                    </DenseTableBody>
                  </DenseTable>
                )}
              </TabsContent>

              <TabsContent value="factures">
                {isLoading ? (
                  <p className="text-sm text-muted-foreground">Chargement des factures…</p>
                ) : filteredFactures.length === 0 ? (
                  <EmptyState
                    icon={Receipt}
                    title="Aucune facture"
                    description="Créez votre première facture pour suivre les encaissements."
                    actionLabel="Nouvelle facture"
                    onAction={() => navigate("/finance/factures/nouveau")}
                  />
                ) : (
                  <DenseTable>
                    <DenseTableHeader>
                      <DenseTableRow>
                        <DenseTableHead>Facture</DenseTableHead>
                        <DenseTableHead>Client</DenseTableHead>
                        <DenseTableHead>Échéance</DenseTableHead>
                        <DenseTableHead>Statut</DenseTableHead>
                        <DenseTableHead className="text-right">Montant TTC</DenseTableHead>
                        <DenseTableHead className="text-right">Action</DenseTableHead>
                      </DenseTableRow>
                    </DenseTableHeader>
                    <DenseTableBody>
                      {filteredFactures.map((facture) => (
                        <DenseTableRow key={facture.id}>
                          <DenseTableCell className="font-medium text-foreground">{facture.number}</DenseTableCell>
                          <DenseTableCell>{facture.clients?.name ?? "Client non renseigné"}</DenseTableCell>
                          <DenseTableCell className="font-mono text-xs text-muted-foreground">
                            {formatDateLabel(facture.due_date || facture.date)}
                          </DenseTableCell>
                          <DenseTableCell>
                            <StatusPill label={facture.status.replace("_", " ")} tone={factureStatusTone[facture.status] ?? "default"} />
                          </DenseTableCell>
                          <DenseTableCell className="text-right font-mono">{formatCurrency(facture.total_ttc)}</DenseTableCell>
                          <DenseTableCell className="text-right">
                            <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate(`/finance/factures/${facture.id}`)}>
                              <Eye className="h-4 w-4" />
                              Ouvrir
                            </Button>
                          </DenseTableCell>
                        </DenseTableRow>
                      ))}
                    </DenseTableBody>
                  </DenseTable>
                )}
              </TabsContent>

              <TabsContent value="paiements">
                {isLoading ? (
                  <p className="text-sm text-muted-foreground">Chargement des paiements…</p>
                ) : filteredPaiements.length === 0 ? (
                  <EmptyState icon={CreditCard} title="Aucun paiement" description="Aucun règlement n’a encore été enregistré." />
                ) : (
                  <DenseTable>
                    <DenseTableHeader>
                      <DenseTableRow>
                        <DenseTableHead>Date</DenseTableHead>
                        <DenseTableHead>Client</DenseTableHead>
                        <DenseTableHead>Référence</DenseTableHead>
                        <DenseTableHead>Méthode</DenseTableHead>
                        <DenseTableHead>Validation</DenseTableHead>
                        <DenseTableHead className="text-right">Montant</DenseTableHead>
                      </DenseTableRow>
                    </DenseTableHeader>
                    <DenseTableBody>
                      {filteredPaiements.map((paiement) => (
                        <DenseTableRow key={paiement.id}>
                          <DenseTableCell className="font-mono text-xs text-muted-foreground">{formatDateLabel(paiement.payment_date)}</DenseTableCell>
                          <DenseTableCell>{paiement.factures?.clients?.name ?? "Client non renseigné"}</DenseTableCell>
                          <DenseTableCell>{paiement.reference || paiement.factures?.number || "—"}</DenseTableCell>
                          <DenseTableCell>{paymentMethodLabel[paiement.method ?? ""] ?? paiement.method ?? "Non renseigné"}</DenseTableCell>
                          <DenseTableCell>
                            <StatusPill
                              label={
                                paiement.validation_status === "pending"
                                  ? "En attente"
                                  : paiement.validation_status === "approved"
                                    ? "Validé"
                                    : paiement.validation_status === "rejected"
                                      ? "Rejeté"
                                      : "Saisi"
                              }
                              tone={paymentStatusTone[paiement.validation_status ?? ""] ?? "default"}
                            />
                          </DenseTableCell>
                          <DenseTableCell className="text-right font-mono">{formatCurrency(paiement.amount)}</DenseTableCell>
                        </DenseTableRow>
                      ))}
                    </DenseTableBody>
                  </DenseTable>
                )}
              </TabsContent>
            </div>
          </WorkbenchPanel>
        </Tabs>

        <WorkbenchPanel title="Tendances" description="Lecture secondaire pour piloter le rythme commercial et le cash.">
          <div className="grid gap-4 xl:grid-cols-2">
            <RevenueChart paiements={paiementRows} />
            <PaymentDelayChart factures={factureRows} paiements={paiementRows} />
            <DevisConversionChart devisList={devisRows} />
            <EventTypeChart missions={missionRows} />
          </div>
        </WorkbenchPanel>
      </div>
    </AppLayout>
  );
}
