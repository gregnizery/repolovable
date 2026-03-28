import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CalendarClock,
  CreditCard,
  FileText,
  Package,
  Receipt,
  ScanLine,
  Users,
  Wrench,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import {
  DenseTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableRow,
  MetricStrip,
  SectionHeader,
  StatusPill,
  WorkbenchPanel,
} from "@/components/workbench/primitives";
import {
  useClients,
  useDevisList,
  useFactures,
  useMateriel,
  useMissions,
  usePaiements,
  usePendingProofs,
} from "@/hooks/use-data";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { useUserRole } from "@/hooks/use-user-role";
import { formatCompactCurrency, formatCount, formatCurrency, formatDateLabel, formatDayLabel } from "@/lib/formatters";
import type {
  DevisListItem,
  EquipmentListItem,
  FactureListItem,
  MissionListItem,
  PaiementListItem,
} from "@/lib/view-models";

type PendingProofItem = {
  id: string;
  created_at: string;
  factures?: {
    id: string;
    number: string | null;
    clients?: { name: string | null } | null;
  } | null;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: roleData } = useUserRole();
  const role = roleData?.role || "prestataire";
  const isPilot = role === "admin" || role === "manager";

  const { data: clients = [] } = useClients(isPilot);
  const { data: missions = [] } = useMissions();
  const { data: devisList = [] } = useDevisList(isPilot);
  const { data: factures = [] } = useFactures(isPilot);
  const { data: paiements = [] } = usePaiements(isPilot);
  const { data: materiel = [] } = useMateriel(role !== "prestataire");
  const { data: pendingProofs = [] } = usePendingProofs(isPilot);

  useRealtimeSync("materiel", [["materiel"]]);
  useRealtimeSync("missions", [["missions"]]);
  useRealtimeSync("devis", [["devis"]]);
  useRealtimeSync("factures", [["factures"]]);
  useRealtimeSync("paiements", [["paiements"]]);
  useRealtimeSync("clients", [["clients"]]);
  useRealtimeSync("payment_proofs", [["payment_proofs", "pending"]]);

  const missionRows = missions as MissionListItem[];
  const devisRows = devisList as DevisListItem[];
  const factureRows = factures as FactureListItem[];
  const paiementRows = paiements as PaiementListItem[];
  const equipmentRows = materiel as EquipmentListItem[];
  const pendingProofRows = pendingProofs as PendingProofItem[];

  const plannedMissions = missionRows
    .filter((mission) => mission.status === "planifiée")
    .sort((left, right) => new Date(left.start_date ?? 0).getTime() - new Date(right.start_date ?? 0).getTime());
  const unpaidFactures = factureRows.filter((facture) => facture.status === "en_retard" || facture.status === "envoyée");
  const pendingDevis = devisRows.filter((devis) => devis.status === "envoyé");
  const draftDevis = devisRows.filter((devis) => devis.status === "brouillon");
  const pendingCash = paiementRows.filter((paiement) => paiement.method === "espèces" && paiement.validation_status === "pending");
  const lowStock = equipmentRows.filter((item) => item.quantity <= 1 && item.status !== "hors_service");
  const inMaintenance = equipmentRows.filter((item) => item.status === "maintenance");
  const nextMission = plannedMissions[0];
  const collectedAmount = paiementRows.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const dueAmount = unpaidFactures.reduce((sum, facture) => sum + Number(facture.total_ttc || 0), 0);
  const availableEquipment = equipmentRows.filter((item) => item.status === "disponible").length;

  const actions = isPilot
    ? [
        { label: "Nouvelle mission", icon: CalendarClock, onClick: () => navigate("/missions/nouveau") },
        { label: "Nouveau devis", icon: FileText, onClick: () => navigate("/finance/devis/nouveau") },
        { label: "Ajouter un client", icon: Users, onClick: () => navigate("/clients/nouveau") },
      ]
    : [
        { label: "Scanner le parc", icon: ScanLine, onClick: () => navigate("/materiel/scan") },
        { label: "Voir mes missions", icon: CalendarClock, onClick: () => navigate("/missions") },
      ];

  return (
    <AppLayout>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <SectionHeader
          eyebrow={isPilot ? "Pilotage quotidien" : "Espace opérationnel"}
          title="Tableau de bord"
          description={
            isPilot
              ? "Lecture immédiate des tensions commerciales, des missions à enclencher et des validations qui bloquent la journée."
              : "Vue synthétique de vos prochaines tâches, de la disponibilité matériel et des validations à suivre."
          }
          actions={actions.map((action, index) => (
            <Button key={action.label} variant={index === 0 ? "default" : "outline"} onClick={action.onClick} className="gap-2">
              <action.icon className="h-4 w-4" />
              {action.label}
            </Button>
          ))}
        />

        <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <WorkbenchPanel
            title="À traiter aujourd’hui"
            description="Les sujets qui méritent une décision ou une action avant de reprendre le flux courant."
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-destructive">Relances</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{formatCount(unpaidFactures.length)}</p>
                <p className="mt-1 text-sm text-muted-foreground">{formatCurrency(dueAmount)} à encaisser.</p>
              </div>
              <div className="rounded-xl border border-warning/25 bg-warning/20 p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-warning-foreground">Signatures</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{formatCount(pendingDevis.length)}</p>
                <p className="mt-1 text-sm text-muted-foreground">{draftDevis.length} brouillon(s) encore ouverts.</p>
              </div>
              <div className="rounded-xl border border-info/25 bg-info/15 p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-info-foreground">Prochaine mission</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{nextMission?.title ?? "Aucune mission imminente"}</p>
                <p className="mt-1 text-sm text-muted-foreground">{formatDateLabel(nextMission?.start_date)}</p>
              </div>
              <div className="rounded-xl border border-border/80 bg-background p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Blocages terrain</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{formatCount(lowStock.length + inMaintenance.length)}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {lowStock.length} stock critique, {inMaintenance.length} en maintenance.
                </p>
              </div>
            </div>
          </WorkbenchPanel>

          <WorkbenchPanel title="Cadence" description="Indicateurs du poste de pilotage.">
            <div className="space-y-3">
              <div className="rounded-xl border border-border/80 bg-background p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Preuves de paiement</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{formatCount(pendingProofRows.length)}</p>
                <p className="mt-1 text-sm text-muted-foreground">justificatif(s) à contrôler.</p>
              </div>
              <div className="rounded-xl border border-border/80 bg-background p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Espèces à valider</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{formatCount(pendingCash.length)}</p>
                <p className="mt-1 text-sm text-muted-foreground">paiement(s) en validation manuelle.</p>
              </div>
            </div>
          </WorkbenchPanel>
        </div>

        <MetricStrip
          items={[
            {
              label: "Encaissements",
              value: formatCompactCurrency(collectedAmount),
              detail: `${paiementRows.length} règlement(s) saisis`,
              icon: CreditCard,
              tone: "primary",
            },
            {
              label: "Missions planifiées",
              value: formatCount(plannedMissions.length),
              detail: nextMission ? `prochaine le ${formatDayLabel(nextMission.start_date)}` : "aucune mission planifiée",
              icon: CalendarClock,
              tone: "info",
            },
            {
              label: "Clients actifs",
              value: formatCount(clients.length),
              detail: isPilot ? "base relation en cours" : "non prioritaire pour ce rôle",
              icon: Users,
              tone: "default",
            },
            {
              label: "Parc disponible",
              value: `${formatCount(availableEquipment)}/${formatCount(equipmentRows.length)}`,
              detail: `${formatCount(lowStock.length)} alerte(s) stock`,
              icon: Package,
              tone: "success",
            },
          ]}
        />

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <WorkbenchPanel
            title="Opérations"
            description="Missions en préparation, affectations et points de friction logistique."
            action={
              <Button variant="ghost" className="gap-2" onClick={() => navigate("/missions")}>
                Ouvrir les missions
                <ArrowRight className="h-4 w-4" />
              </Button>
            }
          >
            {plannedMissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune mission planifiée pour le moment.</p>
            ) : (
              <DenseTable>
                <DenseTableHeader>
                  <DenseTableRow>
                    <DenseTableHead>Mission</DenseTableHead>
                    <DenseTableHead>Date</DenseTableHead>
                    <DenseTableHead>Client</DenseTableHead>
                    <DenseTableHead>Lieu</DenseTableHead>
                    <DenseTableHead>Équipe</DenseTableHead>
                    <DenseTableHead className="text-right">Budget</DenseTableHead>
                  </DenseTableRow>
                </DenseTableHeader>
                <DenseTableBody>
                  {plannedMissions.slice(0, 6).map((mission) => (
                    <DenseTableRow key={mission.id} className="cursor-pointer" onClick={() => navigate(`/missions/${mission.id}`)}>
                      <DenseTableCell>
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">{mission.title}</p>
                          <StatusPill label="Planifiée" tone="info" />
                        </div>
                      </DenseTableCell>
                      <DenseTableCell className="font-mono text-xs text-muted-foreground">
                        {formatDateLabel(mission.start_date)}
                      </DenseTableCell>
                      <DenseTableCell>{mission.clients?.name ?? "Client non renseigné"}</DenseTableCell>
                      <DenseTableCell className="text-muted-foreground">{mission.location || "À confirmer"}</DenseTableCell>
                      <DenseTableCell className="text-muted-foreground">
                        {mission.mission_assignments?.length ? `${mission.mission_assignments.length} personne(s)` : "À affecter"}
                      </DenseTableCell>
                      <DenseTableCell className="text-right font-mono">{formatCurrency(mission.amount ?? 0)}</DenseTableCell>
                    </DenseTableRow>
                  ))}
                </DenseTableBody>
              </DenseTable>
            )}
          </WorkbenchPanel>

          <div className="space-y-4">
            <WorkbenchPanel
              title="Finance"
              description="Ce qui attend une relance, une signature ou une validation."
              action={
                <Button variant="ghost" className="gap-2" onClick={() => navigate("/finance/devis")}>
                  Ouvrir la finance
                  <ArrowRight className="h-4 w-4" />
                </Button>
              }
            >
              <div className="space-y-3">
                {pendingDevis.slice(0, 3).map((devis) => (
                  <button
                    key={devis.id}
                    onClick={() => navigate(`/finance/devis/${devis.id}`)}
                    className="flex w-full items-center justify-between rounded-xl border border-border/80 bg-background px-4 py-3 text-left transition-colors hover:border-primary/30"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{devis.number}</p>
                      <p className="text-xs text-muted-foreground">{devis.clients?.name ?? "Client non renseigné"}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusPill label={devis.status} tone="warning" />
                      <span className="font-mono text-xs text-muted-foreground">{formatCurrency(devis.total_ttc)}</span>
                    </div>
                  </button>
                ))}
                {pendingDevis.length === 0 ? <p className="text-sm text-muted-foreground">Aucun devis en attente de signature.</p> : null}

                {unpaidFactures.slice(0, 3).map((facture) => (
                  <button
                    key={facture.id}
                    onClick={() => navigate(`/finance/factures/${facture.id}`)}
                    className="flex w-full items-center justify-between rounded-xl border border-border/80 bg-background px-4 py-3 text-left transition-colors hover:border-primary/30"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{facture.number}</p>
                      <p className="text-xs text-muted-foreground">{facture.clients?.name ?? "Client non renseigné"}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusPill label={facture.status === "en_retard" ? "En retard" : "Envoyée"} tone="destructive" />
                      <span className="font-mono text-xs text-muted-foreground">{formatCurrency(facture.total_ttc)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </WorkbenchPanel>

            <WorkbenchPanel title="Parc" description="Stock bas, maintenance et disponibilités réelles.">
              <div className="space-y-3">
                {lowStock.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-xl border border-border/80 bg-background px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.category || "Sans catégorie"}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusPill label="Stock critique" tone="warning" />
                      <span className="font-mono text-xs text-muted-foreground">Qté {item.quantity}</span>
                    </div>
                  </div>
                ))}
                {inMaintenance.slice(0, 2).map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-xl border border-border/80 bg-background px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.category || "Sans catégorie"}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusPill label="Maintenance" tone="destructive" />
                      <Wrench className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
                {lowStock.length === 0 && inMaintenance.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune tension logistique détectée.</p>
                ) : null}
              </div>
            </WorkbenchPanel>

            {pendingProofRows.length > 0 ? (
              <WorkbenchPanel title="Justificatifs" description="Contrôles administratifs en attente.">
                <div className="space-y-3">
                  {pendingProofRows.slice(0, 3).map((proof) => (
                    <button
                      key={proof.id}
                      onClick={() => navigate("/notifications")}
                      className="flex w-full items-center justify-between rounded-xl border border-border/80 bg-background px-4 py-3 text-left transition-colors hover:border-primary/30"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{proof.factures?.number ?? "Preuve sans facture"}</p>
                        <p className="text-xs text-muted-foreground">{proof.factures?.clients?.name ?? "Client non renseigné"}</p>
                      </div>
                      <span className="font-mono text-xs text-muted-foreground">{formatDateLabel(proof.created_at)}</span>
                    </button>
                  ))}
                </div>
              </WorkbenchPanel>
            ) : null}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
