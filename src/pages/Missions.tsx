import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Calendar, Download, Plus } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EmptyState } from "@/components/EmptyState";
import { exportToCSV } from "@/lib/export-csv";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDateLabel, formatDayLabel } from "@/lib/formatters";
import { asArray, type MissionListItem } from "@/lib/view-models";
import { useMissions } from "@/hooks/use-data";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { useSubscription } from "@/hooks/use-subscription";
import { useUserRole, canEdit } from "@/hooks/use-user-role";
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

const statusFilters = ["all", "planifiée", "en_cours", "terminée", "annulée"] as const;

const statusTone: Record<string, "info" | "warning" | "success" | "default"> = {
  planifiée: "info",
  en_cours: "warning",
  terminée: "success",
  annulée: "default",
};

const statusLabel: Record<string, string> = {
  planifiée: "Planifiée",
  en_cours: "En cours",
  terminée: "Terminée",
  annulée: "Annulée",
};

export default function Missions() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<(typeof statusFilters)[number]>("all");
  const { data: missions = [], isLoading } = useMissions();
  const { data: roleData } = useUserRole();
  const { limits, isFree } = useSubscription();

  const canEditMissions = canEdit(roleData?.role, "missions");

  useRealtimeSync("missions", [["missions"]]);

  const missionRows = missions as MissionListItem[];
  const missionsThisMonth = missionRows.filter((mission) => {
    if (!mission.created_at) return false;
    const createdAt = new Date(mission.created_at);
    const now = new Date();
    return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
  }).length;
  const isLimitReached =
    limits.missionsPerMonth !== "unlimited" && missionsThisMonth >= (limits.missionsPerMonth as number);

  const enrichedMissions = missionRows.map((mission) => {
    const devisList = asArray(mission.devis);
    const computedBudget =
      devisList.length > 0
        ? devisList.reduce((sum, devis) => {
            if (devis.status === "brouillon" || devis.status === "refusé" || devis.status === "expiré") return sum;
            return sum + Number(devis.total_ht || 0);
          }, 0)
        : Number(mission.amount || 0);

    return {
      ...mission,
      computedBudget,
      assignmentsCount: mission.mission_assignments?.length ?? 0,
    };
  });

  const filteredMissions = enrichedMissions.filter((mission) => {
    const haystacks = [mission.title, mission.clients?.name ?? "", mission.location ?? ""].join(" ").toLowerCase();
    const matchesSearch = haystacks.includes(search.toLowerCase());
    const matchesFilter = filter === "all" || mission.status === filter;
    return matchesSearch && matchesFilter;
  });

  const plannedCount = enrichedMissions.filter((mission) => mission.status === "planifiée").length;
  const inProgressCount = enrichedMissions.filter((mission) => mission.status === "en_cours").length;
  const dueSoon = enrichedMissions
    .filter((mission) => mission.start_date)
    .sort((left, right) => new Date(left.start_date ?? 0).getTime() - new Date(right.start_date ?? 0).getTime())[0];

  return (
    <AppLayout>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <SectionHeader
          eyebrow="Exploitation"
          title="Missions"
          description="Lecture comparative des interventions, priorisation des départs et accès direct aux actions de planification."
          actions={
            <>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() =>
                  exportToCSV(
                    filteredMissions,
                    [
                      { key: "title", label: "Titre" },
                      { key: "start_date", label: "Début", format: (value) => formatDateLabel(value as string | null) },
                      { key: "location", label: "Lieu" },
                      { key: "status", label: "Statut" },
                      { key: "computedBudget", label: "Budget HT", format: (value) => formatCurrency(Number(value || 0)) },
                    ],
                    "missions",
                  )
                }
              >
                <Download className="h-4 w-4" />
                Exporter
              </Button>
              {canEditMissions ? (
                <Button onClick={() => !isLimitReached && navigate("/missions/nouveau")} disabled={isLimitReached} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nouvelle mission
                </Button>
              ) : null}
            </>
          }
        />

        {isLimitReached ? (
          <Alert variant="destructive" className="rounded-2xl border-destructive/20 bg-destructive/10">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Limite atteinte</AlertTitle>
            <AlertDescription>
              Vous avez atteint la limite de {limits.missionsPerMonth} missions ce mois-ci avec le plan {isFree ? "Gratuit" : "actuel"}.
            </AlertDescription>
          </Alert>
        ) : null}

        <MetricStrip
          items={[
            { label: "Missions", value: enrichedMissions.length, detail: "volume total", icon: Calendar, tone: "default" },
            { label: "Planifiées", value: plannedCount, detail: "à préparer", icon: Calendar, tone: "info" },
            { label: "En cours", value: inProgressCount, detail: "interventions actives", icon: Calendar, tone: "warning" },
            {
              label: "Prochain départ",
              value: dueSoon ? formatDayLabel(dueSoon.start_date) : "—",
              detail: dueSoon?.title ?? "aucun départ planifié",
              icon: Calendar,
              tone: "success",
            },
          ]}
        />

        <WorkbenchPanel
          title="Liste opérationnelle"
          description="Filtrer, comparer et ouvrir une mission sans traverser des cartes."
        >
          <FilterBar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Titre, client ou lieu"
            filters={
              <>
                {statusFilters.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setFilter(status)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-sm transition-colors",
                      filter === status
                        ? "border-primary/20 bg-primary/10 text-foreground"
                        : "border-border/70 bg-background text-muted-foreground hover:border-primary/20 hover:text-foreground",
                    )}
                  >
                    {status === "all" ? "Toutes" : statusLabel[status]}
                  </button>
                ))}
              </>
            }
          />

          <div className="mt-4">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Chargement des missions…</p>
            ) : filteredMissions.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title={search ? "Aucun résultat" : "Aucune mission planifiée"}
                description={
                  search
                    ? `Aucune mission ne correspond à “${search}”.`
                    : canEditMissions
                      ? "Créez votre première mission pour lancer votre planning."
                      : "Aucune mission n’a encore été planifiée."
                }
                actionLabel={!search && canEditMissions ? "Créer une mission" : undefined}
                onAction={!search && canEditMissions ? () => navigate("/missions/nouveau") : undefined}
              />
            ) : (
              <DenseTable>
                <DenseTableHeader>
                  <DenseTableRow>
                    <DenseTableHead>Mission</DenseTableHead>
                    <DenseTableHead>Date</DenseTableHead>
                    <DenseTableHead>Client</DenseTableHead>
                    <DenseTableHead>Lieu</DenseTableHead>
                    <DenseTableHead>Statut</DenseTableHead>
                    <DenseTableHead>Équipe</DenseTableHead>
                    <DenseTableHead className="text-right">Budget HT</DenseTableHead>
                  </DenseTableRow>
                </DenseTableHeader>
                <DenseTableBody>
                  {filteredMissions.map((mission) => (
                    <DenseTableRow
                      key={mission.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/missions/${mission.id}`)}
                    >
                      <DenseTableCell>
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">{mission.title}</p>
                          <p className="text-xs text-muted-foreground">{mission.event_type || "Mission opérationnelle"}</p>
                        </div>
                      </DenseTableCell>
                      <DenseTableCell className="font-mono text-xs text-muted-foreground">
                        {formatDateLabel(mission.start_date)}
                      </DenseTableCell>
                      <DenseTableCell>{mission.clients?.name ?? "Client non renseigné"}</DenseTableCell>
                      <DenseTableCell className="text-muted-foreground">{mission.location || "À confirmer"}</DenseTableCell>
                      <DenseTableCell>
                        <StatusPill label={statusLabel[mission.status] ?? mission.status} tone={statusTone[mission.status] ?? "default"} />
                      </DenseTableCell>
                      <DenseTableCell className="text-muted-foreground">
                        {mission.assignmentsCount > 0 ? `${mission.assignmentsCount} personne(s)` : "À affecter"}
                      </DenseTableCell>
                      <DenseTableCell className="text-right font-mono">{formatCurrency(mission.computedBudget)}</DenseTableCell>
                    </DenseTableRow>
                  ))}
                </DenseTableBody>
              </DenseTable>
            )}
          </div>
        </WorkbenchPanel>
      </div>
    </AppLayout>
  );
}
