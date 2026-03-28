import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpDown, BarChart3, Download, Package, Plus, ScanLine } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { exportToCSV } from "@/lib/export-csv";
import { cn } from "@/lib/utils";
import { formatCount, formatCurrency, formatDateLabel } from "@/lib/formatters";
import type { EquipmentListItem } from "@/lib/view-models";
import { useMateriel } from "@/hooks/use-data";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { useUserRole, canEdit } from "@/hooks/use-user-role";
import { MaterielQrHover } from "@/components/MaterielQrHover";
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

const statusFilters = ["all", "disponible", "en_mission", "maintenance", "hors_service"] as const;

const statusLabel: Record<string, string> = {
  disponible: "Disponible",
  en_mission: "En mission",
  maintenance: "Maintenance",
  hors_service: "Hors service",
};

const statusTone: Record<string, "success" | "info" | "warning" | "destructive"> = {
  disponible: "success",
  en_mission: "info",
  maintenance: "warning",
  hors_service: "destructive",
};

function getAvailability(item: EquipmentListItem) {
  const activeMission = item.mission_materiel
    ?.map((entry) => entry.missions)
    .find((mission) => mission && (mission.status === "en_cours" || mission.status === "planifiée") && mission.end_date);

  if (!activeMission?.end_date) return item.status === "disponible" ? "Disponible maintenant" : statusLabel[item.status] ?? item.status;
  return `Retour prévu ${formatDateLabel(activeMission.end_date)}`;
}

function getSource(item: EquipmentListItem) {
  if (item.is_subrented) return item.suppliers?.name || "Sous-location";
  if (item.is_b2b_shared) return "Partage B2B";
  return "Stock interne";
}

export default function Materiel() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof statusFilters)[number]>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const { data: equipment = [], isLoading } = useMateriel();
  const { data: roleData } = useUserRole();
  const canEditMat = canEdit(roleData?.role, "materiel");

  useRealtimeSync("materiel", [["materiel"]]);

  const equipmentRows = equipment as EquipmentListItem[];
  const categories = ["all", ...new Set(equipmentRows.map((item) => item.category).filter(Boolean))];
  const filteredEquipment = equipmentRows.filter((item) => {
    const haystack = [item.name, item.category ?? "", item.storage_locations?.name ?? "", item.suppliers?.name ?? ""]
      .join(" ")
      .toLowerCase();
    const matchesSearch = haystack.includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const availableCount = equipmentRows.filter((item) => item.status === "disponible").length;
  const externalCount = equipmentRows.filter((item) => item.is_subrented).length;
  const lowStockCount = equipmentRows.filter((item) => item.quantity <= 1 && item.status !== "hors_service").length;

  return (
    <AppLayout>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <SectionHeader
          eyebrow="Logistique"
          title="Parc matériel"
          description="Inventaire compact, disponibilité réelle et lecture claire des sources de stock."
          actions={
            <>
              {canEditMat ? (
                <>
                  <Button variant="outline" className="gap-2" onClick={() => navigate("/materiel/disponibilites")}>
                    <BarChart3 className="h-4 w-4" />
                    Disponibilités
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={() => navigate("/materiel/mouvements")}>
                    <ArrowUpDown className="h-4 w-4" />
                    Mouvements
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={() => navigate("/materiel/scan")}>
                    <ScanLine className="h-4 w-4" />
                    Scanner
                  </Button>
                  <Button className="gap-2" onClick={() => navigate("/materiel/nouveau")}>
                    <Plus className="h-4 w-4" />
                    Ajouter
                  </Button>
                </>
              ) : null}
            </>
          }
        />

        <MetricStrip
          items={[
            { label: "Inventaire", value: formatCount(equipmentRows.length), detail: "élément(s) suivis", icon: Package, tone: "default" },
            { label: "Disponibles", value: formatCount(availableCount), detail: "mobilisables immédiatement", icon: Package, tone: "success" },
            { label: "Sous-location", value: formatCount(externalCount), detail: "ressources externes", icon: Package, tone: "info" },
            { label: "Stock critique", value: formatCount(lowStockCount), detail: "à arbitrer", icon: Package, tone: "warning" },
          ]}
        />

        <WorkbenchPanel title="Inventaire opérationnel" description="Disponibilité, localisation et source du stock sur une même ligne.">
          <FilterBar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Nom, catégorie, stockage ou fournisseur"
            filters={
              <>
                {statusFilters.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-sm transition-colors",
                      statusFilter === status
                        ? "border-primary/20 bg-primary/10 text-foreground"
                        : "border-border/70 bg-background text-muted-foreground hover:border-primary/20 hover:text-foreground",
                    )}
                  >
                    {status === "all" ? "Tous les statuts" : statusLabel[status]}
                  </button>
                ))}
              </>
            }
            actions={
              <>
                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  className="h-10 rounded-lg border border-border/70 bg-background px-3 text-sm text-foreground"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category === "all" ? "Toutes les catégories" : category}
                    </option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() =>
                    exportToCSV(
                      filteredEquipment,
                      [
                        { key: "name", label: "Nom" },
                        { key: "category", label: "Catégorie" },
                        { key: "status", label: "Statut" },
                        { key: "quantity", label: "Quantité" },
                        { key: "location", label: "Emplacement" },
                        { key: "rental_price", label: "Tarif/jour", format: (value) => formatCurrency(Number(value || 0)) },
                      ],
                      "materiel",
                    )
                  }
                >
                  <Download className="h-4 w-4" />
                  Exporter
                </Button>
              </>
            }
          />

          <div className="mt-4">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Chargement de l’inventaire…</p>
            ) : filteredEquipment.length === 0 ? (
              <EmptyState
                icon={Package}
                title={search ? "Aucun résultat" : "Aucun matériel enregistré"}
                description={
                  search
                    ? `Aucun équipement ne correspond à “${search}”.`
                    : "Ajoutez votre premier équipement pour ouvrir le suivi du parc."
                }
                actionLabel={!search && canEditMat ? "Ajouter du matériel" : undefined}
                onAction={!search && canEditMat ? () => navigate("/materiel/nouveau") : undefined}
              />
            ) : (
              <DenseTable>
                <DenseTableHeader>
                  <DenseTableRow>
                    <DenseTableHead>Équipement</DenseTableHead>
                    <DenseTableHead>Catégorie</DenseTableHead>
                    <DenseTableHead>Disponibilité</DenseTableHead>
                    <DenseTableHead>Localisation</DenseTableHead>
                    <DenseTableHead>Source</DenseTableHead>
                    <DenseTableHead>Statut</DenseTableHead>
                    <DenseTableHead className="text-right">Tarif / jour</DenseTableHead>
                  </DenseTableRow>
                </DenseTableHeader>
                <DenseTableBody>
                  {filteredEquipment.map((item) => (
                    <DenseTableRow key={item.id} className="cursor-pointer" onClick={() => navigate(`/materiel/${item.id}`)}>
                      <DenseTableCell>
                        <div className="flex items-center gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="truncate font-medium text-foreground">{item.name}</p>
                              <MaterielQrHover
                                id={item.id}
                                name={item.name}
                                barcode={item.barcode}
                                serialNumber={item.serial_number}
                              />
                            </div>
                            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                              {item.tracking_type === "batch" ? `Lot · ${item.quantity}` : item.serial_number || "Unité suivie"}
                            </p>
                          </div>
                        </div>
                      </DenseTableCell>
                      <DenseTableCell>{item.category || "Sans catégorie"}</DenseTableCell>
                      <DenseTableCell className="text-muted-foreground">{getAvailability(item)}</DenseTableCell>
                      <DenseTableCell className="text-muted-foreground">
                        {item.storage_locations?.name || item.location || "Non renseigné"}
                      </DenseTableCell>
                      <DenseTableCell className="text-muted-foreground">{getSource(item)}</DenseTableCell>
                      <DenseTableCell>
                        <StatusPill label={statusLabel[item.status] ?? item.status} tone={statusTone[item.status] ?? "default"} />
                      </DenseTableCell>
                      <DenseTableCell className="text-right font-mono">
                        {item.rental_price ? formatCurrency(item.rental_price) : "—"}
                      </DenseTableCell>
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
