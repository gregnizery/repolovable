import { AppLayout } from "@/components/layout/AppLayout";
import { WorkspaceHero, WorkspacePage, WorkspacePanel } from "@/components/layout/Workspace";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMissions } from "@/hooks/use-data";
import { useUserRole, canEdit } from "@/hooks/use-user-role";
import { Search, Plus, MapPin, Clock, Users as UsersIcon, Calendar, Download } from "lucide-react";
import { exportToCSV } from "@/lib/export-csv";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonCard } from "@/components/SkeletonCard";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { useSubscription } from "@/hooks/use-subscription";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const statusConfig: Record<string, { label: string; class: string }> = {
  "planifiée": { label: "Planifiée", class: "bg-info/10 text-info" },
  en_cours: { label: "En cours", class: "bg-warning/10 text-warning" },
  "terminée": { label: "Terminée", class: "bg-success/10 text-success" },
  "annulée": { label: "Annulée", class: "bg-muted text-muted-foreground" },
};

export default function Missions() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const navigate = useNavigate();
  const { data: missions = [], isLoading } = useMissions();
  const { data: roleData } = useUserRole();
  const { limits, isFree } = useSubscription();
  const canEditMissions = canEdit(roleData?.role, "missions");
  useRealtimeSync("missions", [["missions"]]);

  const missionsThisMonth = missions.filter(m => {
    if (!m.created_at) return false;
    const date = new Date(m.created_at);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;

  const isLimitReached = limits.missionsPerMonth !== "unlimited" && missionsThisMonth >= (limits.missionsPerMonth as number);

  const filtered = missions.map(m => {
    const devisCount = m.devis ? (Array.isArray(m.devis) ? m.devis.length : 1) : 0;
    const devisArray = m.devis ? (Array.isArray(m.devis) ? m.devis : [m.devis]) : [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const devisSum = devisArray.reduce((sum: number, d: any) => {
      // Exclure brouillons et refusés du total
      if (d.status === 'brouillon' || d.status === 'refusé' || d.status === 'expiré') return sum;
      return sum + (d.total_ht || 0);
    }, 0);

    // Si la mission a des devis liés, on prend leur somme HT. Sinon on garde l'ancien montant manuel
    const computedAmount = devisCount > 0 ? devisSum : (m.amount || 0);

    return { ...m, computedAmount, hasDevis: devisCount > 0 };
  }).filter(m => {
    const clientName = m.clients?.name || "";
    const matchSearch = m.title.toLowerCase().includes(search.toLowerCase()) || clientName.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || m.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <AppLayout>
      <WorkspacePage>
        <WorkspaceHero
          eyebrow="Opérations"
          title="Collection Missions"
          description="Suivez les interventions actives, filtrez par statut et gardez une lecture immédiate des budgets, affectations et échéances."
          actions={(
            <>
              <Button variant="outline" className="rounded-2xl gap-2" onClick={() => exportToCSV(filtered, [
                { key: "title", label: "Titre" },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                { key: "clients", label: "Client", format: (v: unknown) => (v as any)?.name || "" },
                { key: "event_type", label: "Type" },
                { key: "status", label: "Statut" },
                { key: "start_date", label: "Début", format: (v) => v ? new Date(v as string).toLocaleString("fr-FR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).replace(" à", " -") : "" },
                { key: "end_date", label: "Fin", format: (v) => v ? new Date(v as string).toLocaleString("fr-FR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).replace(" à", " -") : "" },
                { key: "location", label: "Lieu" },
                { key: "computedAmount", label: "Montant HT", format: (v) => v ? `${v}€` : "0€" },
              ], "missions")}>
                <Download className="h-4 w-4" />
                Exporter
              </Button>
              {canEditMissions && (
                <Button
                  className={cn("rounded-2xl gap-2", isLimitReached && "opacity-50 grayscale cursor-not-allowed")}
                  onClick={() => !isLimitReached && navigate("/missions/nouveau")}
                  disabled={isLimitReached}
                >
                  <Plus className="h-4 w-4" />
                  Nouvelle mission
                </Button>
              )}
            </>
          )}
          aside={(
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-[24px] border border-border/60 bg-background/80 p-4 shadow-inner">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Volume</p>
                <p className="mt-2 text-2xl font-display font-bold text-foreground">{missions.length}</p>
                <p className="mt-1 text-sm text-muted-foreground">mission{missions.length > 1 ? "s" : ""} total.</p>
              </div>
              <div className="rounded-[24px] border border-border/60 bg-background/80 p-4 shadow-inner">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Planifiées</p>
                <p className="mt-2 text-2xl font-display font-bold text-info">{missions.filter((m) => m.status === "planifiée").length}</p>
                <p className="mt-1 text-sm text-muted-foreground">à préparer dans le planning.</p>
              </div>
              <div className="rounded-[24px] border border-border/60 bg-background/80 p-4 shadow-inner">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">En cours</p>
                <p className="mt-2 text-2xl font-display font-bold text-warning">{missions.filter((m) => m.status === "en_cours").length}</p>
                <p className="mt-1 text-sm text-muted-foreground">intervention(s) à monitorer.</p>
              </div>
            </div>
          )}
        />

        {isLimitReached && (
          <Alert variant="destructive" className="bg-destructive/5 border-destructive/20 rounded-2xl">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Limite atteinte</AlertTitle>
            <AlertDescription>
              Vous avez atteint la limite de {limits.missionsPerMonth} missions pour ce mois avec votre plan {isFree ? "Gratuit" : "actuel"}.
              Passez au plan Pro pour des missions illimitées.
            </AlertDescription>
          </Alert>
        )}

        <WorkspacePanel title="Filtrer et prioriser" description="Recherche rapide et segmentation par statut pour piloter les interventions.">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-11 rounded-2xl" />
            </div>
            <div className="flex gap-2 flex-wrap">
              {["all", "planifiée", "en_cours", "terminée", "annulée"].map(s => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={cn("text-xs font-medium px-3 py-1.5 rounded-full transition-colors",
                    filter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {s === "all" ? "Toutes" : statusConfig[s]?.label}
                </button>
              ))}
            </div>
          </div>
        </WorkspacePanel>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} variant="mission" />
            ))}
          </div>
        ) : filtered.length === 0 && search ? (
          <EmptyState icon={Search} title="Aucun résultat" description={`Aucune mission ne correspond à "${search}".`} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="Aucune mission planifiée"
            description={canEditMissions ? "Créez votre première mission pour organiser vos interventions." : "Aucune mission n'a été planifiée pour le moment."}
            actionLabel={canEditMissions ? "Créer une mission" : undefined}
            onAction={canEditMissions ? () => navigate("/missions/nouveau") : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(m => (
              <Card key={m.id} className="shadow-card border-border/50 hover:shadow-lg transition-all duration-300 cursor-pointer group" onClick={() => navigate(`/missions/${m.id}`)}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", statusConfig[m.status]?.class)}>{statusConfig[m.status]?.label}</span>
                    <span className="text-xs text-muted-foreground">{m.event_type || ""}</span>
                  </div>
                  <h3 className="font-semibold text-lg group-hover:text-primary transition-colors mb-1">{m.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{m.clients?.name || ""}</p>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    {m.start_date && (
                      <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> {new Date(m.start_date).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).replace(" à", " -")}</div>
                    )}
                    {m.location && <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> {m.location}</div>}
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground font-medium">Budget HT</span>
                      {m.hasDevis && <span className="text-[10px] text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded mt-0.5 w-fit font-medium">Devis lié</span>}
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-lg font-bold">{(m.computedAmount || 0).toLocaleString('fr-FR', { minimumFractionDigits: 0 })} €</span>
                      {Array.isArray(m.mission_assignments) && m.mission_assignments.length > 0 && (
                        <div className="flex -space-x-2 mt-1" title={`${m.mission_assignments.length} prestataire(s) assigné(s)`}>
                          {(m.mission_assignments as any[]).slice(0, 3).map((a: any) => (
                            <Avatar key={a.user_id} className="w-6 h-6 border-2 border-background">
                              <AvatarImage src={a.profiles?.avatar_url} />
                              <AvatarFallback className="text-[9px] bg-primary/10 text-primary uppercase">
                                {a.profiles?.first_name?.[0]}{a.profiles?.last_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {m.mission_assignments.length > 3 && (
                            <div className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[9px] font-bold text-muted-foreground z-10">
                              +{m.mission_assignments.length - 3}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
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
