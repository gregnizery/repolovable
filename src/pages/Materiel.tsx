/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { WorkspaceHero, WorkspacePage, WorkspacePanel } from "@/components/layout/Workspace";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMateriel } from "@/hooks/use-data";
import { useUserRole, canEdit } from "@/hooks/use-user-role";
import { Search, Plus, Package, ScanLine, ArrowUpDown, BarChart3, Download, MapPin } from "lucide-react";
import { exportToCSV } from "@/lib/export-csv";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonCard } from "@/components/SkeletonCard";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { MaterielQrHover } from "@/components/MaterielQrHover";
import { Users } from "lucide-react";

const statusConfig: Record<string, { label: string; class: string }> = {
  disponible: { label: "Disponible", class: "bg-success/10 text-success" },
  en_mission: { label: "En mission", class: "bg-info/10 text-info" },
  maintenance: { label: "Maintenance", class: "bg-warning/10 text-warning" },
  hors_service: { label: "Hors service", class: "bg-destructive/10 text-destructive" },
};

function getActiveMission(eq: any) {
  if (!eq.mission_materiel || eq.mission_materiel.length === 0) return null;
  // Look for a mission that is currently active for this equipment
  const activeMissions = eq.mission_materiel
    .map((mm: any) => mm.missions)
    .filter((m: any) => m && (m.status === "en_cours" || m.status === "planifiée") && m.end_date);

  if (activeMissions.length === 0) return null;
  // Find the mission ending the latest just in case there are multiple
  return activeMissions.sort((a: any, b: any) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime())[0];
}

export default function Materiel() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const { data: equipment = [], isLoading } = useMateriel();
  const { data: roleData } = useUserRole();
  const canEditMat = canEdit(roleData?.role, "materiel");
  useRealtimeSync("materiel", [["materiel"]]);

  const categories = ["all", ...new Set(equipment.map(e => e.category).filter(Boolean))];
  const filtered = equipment.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === "all" || e.category === catFilter;
    return matchSearch && matchCat;
  });

  return (
    <AppLayout>
      <WorkspacePage>
        <WorkspaceHero
          eyebrow="Parc"
          title="Collection Matériel"
          description="Supervisez le parc, la disponibilité, la sous-location et les alertes de stock dans une interface pensée pour l’arbitrage logistique."
          actions={(
            <>
              <Button variant="outline" className="gap-2 rounded-2xl" onClick={() => exportToCSV(equipment, [
                { key: "name", label: "Nom" },
                { key: "category", label: "Catégorie" },
                { key: "tracking_type", label: "Type", format: (v) => v === "batch" ? "Lot" : "Unité" },
                { key: "serial_number", label: "N° série" },
                { key: "barcode", label: "Code-barres" },
                { key: "status", label: "Statut" },
                { key: "quantity", label: "Quantité" },
                { key: "purchase_price", label: "Prix achat", format: (v) => v ? `${v}€` : "" },
                { key: "rental_price", label: "Prix location/j", format: (v) => v ? `${v}€` : "" },
                { key: "location", label: "Emplacement" },
              ], "materiel")}>
                <Download className="h-4 w-4" />
                Exporter
              </Button>
              <Button variant="outline" className="gap-2 rounded-2xl" onClick={() => navigate("/materiel/disponibilites")}><BarChart3 className="h-4 w-4" /> Disponibilités</Button>
              {canEditMat && (
                <>
                  <Button variant="outline" className="gap-2 rounded-2xl" onClick={() => navigate("/materiel/mouvements")}><ArrowUpDown className="h-4 w-4" /> Mouvements</Button>
                  <Button variant="outline" className="gap-2 rounded-2xl" onClick={() => navigate("/materiel/scan")}><ScanLine className="h-4 w-4" /> Scanner</Button>
                  <Button className="rounded-2xl gap-2" onClick={() => navigate("/materiel/nouveau")}><Plus className="h-4 w-4" /> Ajouter</Button>
                </>
              )}
            </>
          )}
          aside={(
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-[24px] border border-border/60 bg-background/80 p-4 shadow-inner">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Inventaire</p>
                <p className="mt-2 text-2xl font-display font-bold text-foreground">{equipment.length}</p>
                <p className="mt-1 text-sm text-muted-foreground">équipement(s) enregistrés.</p>
              </div>
              <div className="rounded-[24px] border border-border/60 bg-background/80 p-4 shadow-inner">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Disponibles</p>
                <p className="mt-2 text-2xl font-display font-bold text-success">{equipment.filter((e) => e.status === "disponible").length}</p>
                <p className="mt-1 text-sm text-muted-foreground">prêts à être affectés.</p>
              </div>
              <div className="rounded-[24px] border border-border/60 bg-background/80 p-4 shadow-inner">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Sous-location</p>
                <p className="mt-2 text-2xl font-display font-bold text-accent">{equipment.filter((e) => (e as any).is_subrented).length}</p>
                <p className="mt-1 text-sm text-muted-foreground">élément(s) issus du réseau partenaire.</p>
              </div>
            </div>
          )}
        />

        <WorkspacePanel title="Filtrer le parc" description="Recherche instantanée et segmentation par catégorie pour vérifier l’état du stock sans changer d’écran.">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-11 rounded-2xl" />
            </div>
            <div className="flex gap-2 flex-wrap">
              {categories.map(c => (
                <button key={c || "all"} onClick={() => setCatFilter(c)}
                  className={cn("text-xs font-medium px-3 py-1.5 rounded-full transition-colors",
                    catFilter === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}>
                  {c === "all" ? "Tous" : c}
                </button>
              ))}
            </div>
          </div>
        </WorkspacePanel>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} variant="equipment" />)}
          </div>
        ) : filtered.length === 0 && search ? (
          <EmptyState icon={Search} title="Aucun résultat" description={`Aucun équipement ne correspond à "${search}".`} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Package} title="Aucun matériel enregistré" description="Ajoutez votre premier équipement." actionLabel="Ajouter du matériel" onAction={() => navigate("/materiel/nouveau")} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(eq => (
              <Card key={eq.id} className="shadow-card border-border/50 hover:shadow-lg transition-all duration-300 cursor-pointer group" onClick={() => navigate(`/materiel/${eq.id}`)}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex gap-2">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", (eq as any).is_subrented ? "bg-accent/15 text-accent" : "bg-warning/10 text-warning")}>
                        {(eq as any).is_subrented ? <Users className="h-5 w-5" /> : <Package className="h-5 w-5" />}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <MaterielQrHover id={eq.id} name={eq.name} barcode={eq.barcode} serialNumber={eq.serial_number} />
                      <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", statusConfig[eq.status]?.class)}>{statusConfig[eq.status]?.label}</span>
                    </div>
                  </div>
                  <h3 className="font-semibold group-hover:text-primary transition-colors">{eq.name}</h3>
                  <p className="text-sm text-muted-foreground">{eq.category || ""}</p>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border text-sm">
                    <div className="flex flex-col gap-1.5">
                      {eq.tracking_type === "batch" ? (
                        <span className="text-xs font-semibold px-2 py-0.5 bg-muted rounded-md border border-border w-fit">Lot de {eq.quantity}</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">{eq.serial_number ? `S/N: ${eq.serial_number}` : ""}</span>
                      )}
                      {(eq as any).storage_locations?.name && !(eq as any).is_subrented && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> {(eq as any).storage_locations.name}</span>
                      )}
                      {(eq as any).is_subrented && (
                        <span className="text-xs text-accent font-medium flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {(eq as any).suppliers?.name || "Sous-location"}
                        </span>
                      )}

                      {/* Affichage de la disponibilité pour les matériels en mission */}
                      {(() => {
                        if (eq.status !== "en_mission") return null;
                        const activeMission = getActiveMission(eq);
                        if (!activeMission || !activeMission.end_date) return null;

                        const endDate = new Date(activeMission.end_date);
                        const today = new Date();
                        const diffTime = endDate.getTime() - today.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                        return (
                          <div className="flex flex-col gap-0.5 mt-1 border border-info/50 bg-info/5 p-1.5 rounded-md">
                            <span className="text-[10px] font-semibold text-info uppercase tracking-wider">Disponibilité</span>
                            <span className="text-xs text-info/90">
                              {diffDays > 0
                                ? `Dans ${diffDays} jour${diffDays > 1 ? 's' : ''} (${endDate.toLocaleDateString("fr-FR")})`
                                : diffDays === 0
                                  ? `Demain (${endDate.toLocaleDateString("fr-FR")})`
                                  : `Théoriquement disponible (mission terminée)`}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                    <span className="font-semibold self-end">{eq.rental_price ? `${eq.rental_price}€/j` : ""}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </WorkspacePage>
    </AppLayout>
  );
}
