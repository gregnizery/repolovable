/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUserRole, canEdit } from "@/hooks/use-user-role";
import { AppLayout } from "@/components/layout/AppLayout";
import { WorkspaceBackLink, WorkspaceHero, WorkspacePage } from "@/components/layout/Workspace";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMission, useMissionMateriel, useMateriel, useAddMissionMateriel, useRemoveMissionMateriel, useMissionAssignments, useAssignToMission, useUnassignFromMission } from "@/hooks/use-data";
import { useTeam, useTeamMembers } from "@/hooks/use-team";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDisponibiliteMultiple } from "@/hooks/use-disponibilite";
import { ArrowLeft, MapPin, Clock, Edit, Calendar, Package, Plus, X, Loader2, AlertTriangle, CheckCircle, Info, Lock, FileText, Ban, Search, Users, Phone, UserPlus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { B2BCatalogDialog } from "@/components/suppliers/B2BCatalogDialog";
import { useSubrentRequests } from "@/hooks/use-data";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const statusConfig: Record<string, { label: string; class: string }> = {
  "planifiée": { label: "Planifiée", class: "bg-info/10 text-info" },
  en_cours: { label: "En cours", class: "bg-warning/10 text-warning" },
  "terminée": { label: "Terminée", class: "bg-success/10 text-success" },
  "annulée": { label: "Annulée", class: "bg-muted text-muted-foreground" },
  "confirmée": { label: "Confirmée", class: "bg-primary/10 text-primary" },
};

export default function MissionDetail() {
  const { id } = useParams();
  const { data: roleData } = useUserRole();
  const canEditMission = canEdit(roleData?.role, "missions");
  const navigate = useNavigate();
  const { data: mission, isLoading } = useMission(id);
  const { data: missionMateriel = [] } = useMissionMateriel(id);
  const { data: allMateriel = [] } = useMateriel();
  const addMateriel = useAddMissionMateriel();
  const removeMateriel = useRemoveMissionMateriel();
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [cancelReason, setCancelReason] = useState("");
  const [b2bCatalogOpen, setB2bCatalogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const { data: subrentRequests = [] } = useSubrentRequests();
  const queryClient = useQueryClient();
  useRealtimeSync("missions", [["missions", id!]]);
  useRealtimeSync("mission_materiel", [["mission_materiel", id!]]);
  // useRealtimeSync for subrent_requests requires updating the hook's allowed tables, so we'll skip it here or update the hook later.


  const assignedIds = new Set(missionMateriel.map((mm: any) => mm.materiel_id));

  const assignedMaterielIds = missionMateriel.map((mm: any) => mm.materiel_id as string);
  const availableMateriel = allMateriel.filter(m => !assignedIds.has(m.id));
  const availableIds = availableMateriel.map(m => m.id);

  // Check if mission has stock movements (blocks materiel editing)
  const { data: movementCount = 0 } = useQuery({
    queryKey: ["mission_movements_count", id],
    queryFn: async () => {
      if (!id || assignedMaterielIds.length === 0) return 0;
      const { count, error } = await supabase
        .from("stock_movements")
        .select("id", { count: "exact", head: true })
        .in("materiel_id", assignedMaterielIds)
        .or(`reason.like.%${id}%,notes.like.%${id}%`);
      if (error) return 0;
      return count || 0;
    },
    enabled: !!id && assignedMaterielIds.length > 0,
  });

  // Check if mission has linked devis
  const { data: devisCount = 0 } = useQuery({
    queryKey: ["mission_devis_count", id],
    queryFn: async () => {
      if (!id) return 0;
      const { count, error } = await supabase
        .from("devis")
        .select("id", { count: "exact", head: true })
        .eq("mission_id", id);
      if (error) return 0;
      return count || 0;
    },
    enabled: !!id,
  });

  // Check if mission has linked factures
  const { data: factureCount = 0 } = useQuery({
    queryKey: ["mission_facture_count", id],
    queryFn: async () => {
      if (!id) return 0;
      const { count, error } = await supabase
        .from("factures")
        .select("id", { count: "exact", head: true })
        .eq("mission_id", id);
      if (error) return 0;
      return count || 0;
    },
    enabled: !!id,
  });

  const isLocked = movementCount > 0 || devisCount > 0 || factureCount > 0;
  const lockReasons: string[] = [];
  if (movementCount > 0) lockReasons.push(`${movementCount} mouvement(s) de stock`);
  if (devisCount > 0) lockReasons.push(`${devisCount} devis`);
  if (factureCount > 0) lockReasons.push(`${factureCount} facture(s)`);

  // Check availability for all available materiel
  const { data: dispoMap } = useDisponibiliteMultiple(
    dialogOpen && !isLocked ? availableIds : [],
    mission?.start_date,
    mission?.end_date,
    id
  );

  const cancelMission = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("Mission introuvable");
      const cancellationReason = cancelReason.trim();

      const { data: emailData, error: emailError } = await supabase.functions.invoke("send-mission-cancellation-email", {
        body: { mission_id: id, reason: cancellationReason || undefined },
      });

      if (emailError) throw new Error(emailError.message || "Mission annulée, mais envoi email impossible");
      if (emailData?.error) throw new Error(emailData.error);
      return emailData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["missions"] });
      queryClient.invalidateQueries({ queryKey: ["missions", id] });
      toast.success("Mission annulée et client prévenu par email");
      setCancelReason("");
    },
    onError: (e: Error) => {
      toast.error(e.message || "Erreur lors de l'annulation");
    },
  });

  const handleAdd = (materielId: string) => {
    const qty = quantities[materielId] || 1;
    addMateriel.mutate(
      { mission_id: id!, materiel_id: materielId, quantity: qty },
      { onSuccess: () => setDialogOpen(false) }
    );
  };

  const { data: assignments = [], isLoading: loadingAssignments } = useMissionAssignments(id);
  const { data: teamMembership } = useTeam();
  const { data: teamMembers = [] } = useTeamMembers(teamMembership?.team_id);
  const assignUser = useAssignToMission();
  const unassignUser = useUnassignFromMission();

  const handleAssign = (userId: string) => {
    assignUser.mutate({ mission_id: id!, user_id: userId }, {
      onSuccess: () => setAssignDialogOpen(false)
    });
  };

  if (isLoading) return <AppLayout><div className="space-y-4 max-w-4xl"><Skeleton className="h-8 w-48" /><Skeleton className="h-32 w-full" /></div></AppLayout>;
  if (!mission) return <AppLayout><div className="p-12 text-center text-muted-foreground">Mission introuvable</div></AppLayout>;

  const hasDates = !!mission.start_date && !!mission.end_date;
  const missionSubrentRequests = subrentRequests.filter(r => r.mission_id === id);

  return (
    <AppLayout>
      <WorkspacePage className="max-w-6xl">
        <WorkspaceBackLink to="/missions" label="Retour aux missions" />

        <WorkspaceHero
          eyebrow="Opérations"
          title={mission.title}
          description={`${mission.clients?.name || "Client non renseigné"}${mission.event_type ? ` · ${mission.event_type}` : ""}`}
          actions={canEditMission ? (
            <>
              <Button variant="outline" className="gap-2 rounded-2xl" onClick={() => navigate(`/finance/devis/nouveau?fromMission=${id}`)}>
                <FileText className="h-4 w-4" />
                Générer un devis
              </Button>
              {mission.status !== "annulée" && mission.status !== "terminée" && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="gap-2 rounded-2xl"><Ban className="h-4 w-4" /> Annuler la mission</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Annuler cette mission ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Le statut passera à « annulée » et un email sera envoyé automatiquement au client pour le prévenir.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Motif d'annulation (optionnel)</p>
                      <Textarea
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        placeholder="Ex: indisponibilité prestataire, report demandé par le client..."
                        rows={3}
                        className="rounded-xl resize-none"
                      />
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-xl">Conserver la mission</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={(e) => {
                          e.preventDefault();
                          cancelMission.mutate();
                        }}
                        className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={cancelMission.isPending}
                      >
                        {cancelMission.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmer l'annulation"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <Button variant="outline" className="gap-2 rounded-2xl" onClick={() => navigate(`/missions/${id}/modifier`)}>
                <Edit className="h-4 w-4" />
                Modifier
              </Button>
            </>
          ) : undefined}
          aside={(
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-[24px] border border-border/60 bg-background/80 p-4 shadow-inner">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Statut</p>
                <p className={cn("mt-2 inline-flex w-fit rounded-full px-3 py-1 text-sm font-semibold", statusConfig[mission.status]?.class)}>{statusConfig[mission.status]?.label}</p>
                <p className="mt-2 text-sm text-muted-foreground">Mission suivie dans le cockpit opérations.</p>
              </div>
              <div className="rounded-[24px] border border-border/60 bg-background/80 p-4 shadow-inner">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Chronologie</p>
                <p className="mt-2 text-lg font-display font-semibold text-foreground">{mission.start_date ? new Date(mission.start_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) : "À planifier"}</p>
                <p className="mt-1 text-sm text-muted-foreground">{mission.end_date ? `Fin prévue le ${new Date(mission.end_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}` : "Date de fin non renseignée."}</p>
              </div>
              {canEditMission && (
                <div className="rounded-[24px] border border-border/60 bg-background/80 p-4 shadow-inner">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Budget</p>
                  <p className="mt-2 text-2xl font-display font-bold text-primary">{(mission.amount || 0).toLocaleString("fr-FR")}€</p>
                  <p className="mt-1 text-sm text-muted-foreground">Montant renseigné sur la mission.</p>
                </div>
              )}
            </div>
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {mission.start_date && (
            <Card className="shadow-card border-border/50"><CardContent className="p-4 flex items-center gap-3"><Calendar className="h-5 w-5 text-primary" /><div><p className="text-xs text-muted-foreground">Date début</p><p className="font-medium text-sm">{new Date(mission.start_date).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).replace(" à", " -")}</p></div></CardContent></Card>
          )}
          {mission.end_date && (
            <Card className="shadow-card border-border/50"><CardContent className="p-4 flex items-center gap-3"><Clock className="h-5 w-5 text-info" /><div><p className="text-xs text-muted-foreground">Date fin</p><p className="font-medium text-sm">{new Date(mission.end_date).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).replace(" à", " -")}</p></div></CardContent></Card>
          )}
          {mission.location && (
            <Card className="shadow-card border-border/50"><CardContent className="p-4 flex items-center gap-3"><MapPin className="h-5 w-5 text-warning" /><div><p className="text-xs text-muted-foreground">Lieu</p><p className="font-medium text-sm">{mission.location}</p></div></CardContent></Card>
          )}
          {mission.clients?.phone && (
            <Card className="shadow-card border-border/50"><CardContent className="p-4 flex items-center gap-3"><Phone className="h-5 w-5 text-success" /><div><p className="text-xs text-muted-foreground">Contact</p><p className="font-medium text-sm">{mission.clients.phone}</p></div></CardContent></Card>
          )}
          {canEditMission && (
            <Card className="shadow-card border-border/50"><CardContent className="p-4 flex items-center gap-3"><div className="text-2xl font-bold text-primary">{(mission.amount || 0).toLocaleString()}€</div></CardContent></Card>
          )}
        </div>

        {mission.description && (
          <Card className="shadow-card border-border/50">
            <CardContent className="p-6">
              <h3 className="font-display font-semibold mb-2">Description</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{mission.description}</p>
            </CardContent>
          </Card>
        )}

        {mission.notes && (
          <Card className="shadow-card border-border/50">
            <CardContent className="p-6">
              <h3 className="font-display font-semibold mb-2">Notes</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{mission.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Matériel associé */}
        <Card className={cn("shadow-card border-border/50", isLocked && "border-warning/30")}>
          <CardContent className="p-6">
            {/* Lock banner */}
            {isLocked && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-warning/10 border border-warning/30 mb-4">
                <Lock className="h-4 w-4 text-warning shrink-0" />
                <div>
                  <p className="text-sm font-medium text-warning">Modification du matériel verrouillée</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Cette mission a {lockReasons.join(", ")} associé(s). Supprimez-les d'abord pour modifier le matériel.
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold flex items-center gap-2">
                <Package className="h-4 w-4 text-warning" /> Matériel associé
                {isLocked && <Lock className="h-3.5 w-3.5 text-warning" />}
              </h3>
              {!isLocked && canEditMission && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5 rounded-xl border-dashed border-primary/50 text-primary hover:bg-primary/5" onClick={() => setB2bCatalogOpen(true)}>
                    <Search className="h-3.5 w-3.5" /> Chercher chez un partenaire
                  </Button>
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1.5 rounded-xl"><Plus className="h-3.5 w-3.5" /> Ajouter</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Ajouter du matériel</DialogTitle>
                      </DialogHeader>

                      {!hasDates && (
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-warning/10 border border-warning/30 text-sm">
                          <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                          <p className="text-warning">La mission doit avoir des dates de début et de fin pour vérifier la disponibilité.</p>
                        </div>
                      )}

                      {availableMateriel.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">Tout le matériel est déjà associé ou aucun matériel n'existe.</p>
                      ) : (
                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                          {availableMateriel.map(m => {
                            const dispo = dispoMap?.get(m.id);
                            const isLoading = dialogOpen && hasDates && !dispo;
                            const qty = quantities[m.id] || 1;
                            const isAvailable = !dispo || dispo.quantite_disponible >= qty;
                            const maxQty = dispo?.quantite_disponible ?? m.quantity;
                            const hasConflicts = dispo && dispo.conflits && dispo.conflits.length > 0;

                            return (
                              <div key={m.id} className={cn(
                                "p-3 rounded-xl border transition-colors",
                                !hasDates ? "border-border hover:bg-muted/50" :
                                  isAvailable ? "border-success/30 hover:bg-success/5" : "border-destructive/30 bg-destructive/5"
                              )}>
                                <div className="flex items-center gap-3">
                                  <Package className="h-4 w-4 text-warning shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium text-sm truncate">{m.name}</p>
                                      {hasDates && dispo && (
                                        isAvailable ? (
                                          <Badge variant="outline" className="text-[10px] border-success/50 text-success shrink-0">
                                            <CheckCircle className="h-2.5 w-2.5 mr-1" /> Dispo: {dispo.quantite_disponible}
                                          </Badge>
                                        ) : (
                                          <Badge variant="outline" className="text-[10px] border-destructive/50 text-destructive shrink-0">
                                            <AlertTriangle className="h-2.5 w-2.5 mr-1" /> Indispo
                                          </Badge>
                                        )
                                      )}
                                      {isLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      {m.category || "Sans catégorie"}{m.serial_number ? ` · ${m.serial_number}` : ""}
                                      {dispo ? ` · Stock: ${dispo.stock_total}` : ` · Stock: ${m.quantity}`}
                                    </p>

                                    {hasConflicts && (
                                      <div className="mt-1.5 space-y-1">
                                        {dispo!.conflits.map((c, i) => (
                                          <div key={i} className="flex items-center gap-1.5 text-[11px] text-destructive/80">
                                            <AlertTriangle className="h-3 w-3 shrink-0" />
                                            <span>
                                              {c.type === "mission_active"
                                                ? `Mission "${c.mission_title}" (${c.quantity} unité${c.quantity > 1 ? "s" : ""})`
                                                : `Retour manquant: "${c.mission_title}" (${c.quantity})`
                                              }
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    {m.tracking_type === "batch" && (
                                      <Input
                                        type="number"
                                        min={1}
                                        max={maxQty}
                                        value={qty}
                                        onChange={e => setQuantities(prev => ({ ...prev, [m.id]: Math.max(1, parseInt(e.target.value) || 1) }))}
                                        className="w-16 h-8 rounded-lg text-center text-sm"
                                      />
                                    )}
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 rounded-lg"
                                      onClick={() => handleAdd(m.id)}
                                      disabled={addMateriel.isPending || (hasDates && !isAvailable)}
                                    >
                                      {addMateriel.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {hasDates && (
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-2 border-t border-border">
                          <Info className="h-3.5 w-3.5 shrink-0" />
                          Disponibilité calculée avec buffers logistiques ±12h et retours manquants (7j).
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>

            {missionMateriel.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucun matériel associé à cette mission.</p>
            ) : (
              <div className="space-y-2">
                {missionMateriel.map((mm: any) => (
                  <div key={mm.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-3 min-w-0 cursor-pointer" onClick={() => navigate(`/materiel/${mm.materiel_id}`)}>
                      <Package className="h-4 w-4 text-warning shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{mm.materiel?.name}</p>
                        <p className="text-xs text-muted-foreground">{mm.materiel?.category || ""}{mm.quantity > 1 ? ` · Qté: ${mm.quantity}` : ""}</p>
                      </div>
                    </div>
                    {!isLocked && canEditMission && (
                      <button onClick={() => removeMateriel.mutate(mm.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Équipe assignée */}
        <Card className="shadow-card border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> Équipe assignée
              </h3>
              {canEditMission && (
                <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 rounded-xl"><UserPlus className="h-3.5 w-3.5" /> Assigner</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Assigner un membre</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 mt-4">
                      {teamMembers.filter(m => !assignments.find((a: any) => a.user_id === m.user_id)).map(member => (
                        <div key={member.id} className="flex items-center justify-between p-3 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={member.avatar_url || ""} />
                              <AvatarFallback className="text-[10px] font-bold">{member.first_name?.[0]}{member.last_name?.[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{member.first_name} {member.last_name}</p>
                              <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                            </div>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => handleAssign(member.user_id)} disabled={assignUser.isPending}>
                            {assignUser.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      ))}
                      {teamMembers.filter(m => !assignments.find((a: any) => a.user_id === m.user_id)).length === 0 && (
                        <p className="text-sm text-center text-muted-foreground py-4">Tous les membres sont déjà assignés.</p>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucun membre assigné à cette mission.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {assignments.map((assignment: any) => {
                  const memberRole = teamMembers.find(m => m.user_id === assignment.user_id)?.role || "Membre";
                  return (
                    <div key={assignment.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50 group">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border-2 border-background shadow-sm">
                          <AvatarImage src={assignment.profiles?.avatar_url || ""} />
                          <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                            {assignment.profiles?.first_name?.[0]}{assignment.profiles?.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{assignment.profiles?.first_name} {assignment.profiles?.last_name}</p>
                          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">{memberRole}</p>
                        </div>
                      </div>
                      {canEditMission && (
                        <button
                          onClick={() => unassignUser.mutate({ mission_id: id!, user_id: assignment.user_id })}
                          className="text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-all p-1"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Demandes de sous-location liées */}
        {missionSubrentRequests.length > 0 && (
          <Card className="shadow-card border-border/50">
            <CardContent className="p-6">
              <h3 className="font-display font-semibold flex items-center gap-2 mb-4">
                <Users className="h-4 w-4 text-primary" /> Demandes de sous-location B2B
              </h3>
              <div className="space-y-2">
                {missionSubrentRequests.map(req => (
                  <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm truncate">{req.materiel_name}</span>
                        <Badge variant="outline" className="text-[10px] shrink-0">Qté: {req.quantity}</Badge>
                        <Badge variant="secondary" className={cn(
                          "text-[10px] shrink-0",
                          req.status === "pending" ? "bg-warning/10 text-warning" :
                            req.status === "accepted" ? "bg-success/10 text-success" :
                              "bg-destructive/10 text-destructive"
                        )}>
                          {req.status === "pending" ? "En attente" : req.status === "accepted" ? "Acceptée" : "Refusée"}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                        <span>Fournisseur: {req.provider?.name || "Inconnu"}</span>
                        <span>
                          Du {new Date(req.start_date).toLocaleDateString("fr-FR")} au {new Date(req.end_date).toLocaleDateString("fr-FR")}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </WorkspacePage>

      <B2BCatalogDialog
        open={b2bCatalogOpen}
        onOpenChange={setB2bCatalogOpen}
        missionId={id}
      />
    </AppLayout>
  );
}
