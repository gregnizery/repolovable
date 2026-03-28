import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useVehicles, useVehicleAssignments, useCreateVehicle, useUpdateVehicle, useDeleteVehicle } from "@/hooks/use-vehicles";
import { useUserRole, canEdit } from "@/hooks/use-user-role";
import { Car, Plus, Loader2, Pencil, Trash2, Truck, MapPin, List, CalendarDays, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { isPast, parseISO, differenceInDays } from "date-fns";
import { VehicleWeekCalendar } from "@/components/vehicles/VehicleWeekCalendar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const vehicleTypes = [
  { value: "utilitaire", label: "Utilitaire" },
  { value: "camion", label: "Camion" },
  { value: "voiture", label: "Voiture" },
  { value: "remorque", label: "Remorque" },
  { value: "autre", label: "Autre" },
];

const statusConfig: Record<string, { label: string; class: string }> = {
  disponible: { label: "Disponible", class: "bg-success/10 text-success" },
  en_mission: { label: "En mission", class: "bg-warning/10 text-warning" },
  maintenance: { label: "Maintenance", class: "bg-destructive/10 text-destructive" },
  hors_service: { label: "Hors service", class: "bg-muted text-muted-foreground" },
};

const emptyForm = { name: "", type: "utilitaire", plate_number: "", capacity: "", notes: "", status: "disponible" };

export default function Vehicles() {
  const navigate = useNavigate();
  const { data: vehicles = [], isLoading } = useVehicles();
  const { data: assignments = {} } = useVehicleAssignments();
  const { data: roleData } = useUserRole();
  const canManage = canEdit(roleData?.role, "materiel");
  const createVehicle = useCreateVehicle();
  const updateVehicle = useUpdateVehicle();
  const deleteVehicle = useDeleteVehicle();

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [view, setView] = useState<"list" | "calendar">("list");

  const resetForm = () => { setForm(emptyForm); setEditId(null); };

  const openEdit = (v: any) => {
    setForm({ name: v.name, type: v.type || "utilitaire", plate_number: v.plate_number || "", capacity: v.capacity || "", notes: v.notes || "", status: v.status || "disponible" });
    setEditId(v.id);
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (editId) {
      await updateVehicle.mutateAsync({ id: editId, ...form });
    } else {
      await createVehicle.mutateAsync(form);
    }
    resetForm();
    setOpen(false);
  };

  const isPending = createVehicle.isPending || updateVehicle.isPending;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Véhicules</h1>
            <p className="text-sm text-muted-foreground">Gérez votre flotte de véhicules</p>
          </div>
          {canManage && (
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="gap-2 rounded-xl"><Plus className="h-4 w-4" /> Ajouter</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{editId ? "Modifier le véhicule" : "Nouveau véhicule"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nom *</Label>
                    <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="rounded-xl" placeholder="Ex: Renault Master" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                        <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {vehicleTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Immatriculation</Label>
                      <Input value={form.plate_number} onChange={e => setForm(f => ({ ...f, plate_number: e.target.value }))} className="rounded-xl" placeholder="AA-123-BB" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Capacité</Label>
                      <Input value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} className="rounded-xl" placeholder="Ex: 12m³, 1.5t" />
                    </div>
                    <div className="space-y-2">
                      <Label>Statut</Label>
                      <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                        <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="rounded-xl" rows={2} placeholder="Détails, assurance, kilométrage…" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" className="rounded-xl" onClick={() => { setOpen(false); resetForm(); }}>Annuler</Button>
                  <Button onClick={handleSubmit} className="rounded-xl" disabled={isPending || !form.name.trim()}>
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : editId ? "Enregistrer" : "Ajouter"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          <div className="flex items-center gap-1 border border-border/50 rounded-xl p-0.5">
            <Button size="sm" variant={view === "list" ? "default" : "ghost"} className="h-7 rounded-lg gap-1.5 text-xs" onClick={() => setView("list")}>
              <List className="h-3.5 w-3.5" /> Liste
            </Button>
            <Button size="sm" variant={view === "calendar" ? "default" : "ghost"} className="h-7 rounded-lg gap-1.5 text-xs" onClick={() => setView("calendar")}>
              <CalendarDays className="h-3.5 w-3.5" /> Planning
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
        ) : vehicles.length === 0 ? (
          <Card className="shadow-card border-border/50">
            <CardContent className="p-12 text-center">
              <Car className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">Aucun véhicule enregistré</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Ajoutez vos véhicules pour les assigner aux transports</p>
            </CardContent>
          </Card>
        ) : view === "calendar" ? (
          <VehicleWeekCalendar vehicles={vehicles} />
        ) : (
          <div className="space-y-2">
            {vehicles.map((v: any) => {
              const sc = statusConfig[v.status] || statusConfig.disponible;
              const typeLabel = vehicleTypes.find(t => t.value === v.type)?.label || v.type;
              const assignment = assignments[v.id];
              return (
                <Card key={v.id} className="shadow-card border-border/50 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/vehicules/${v.id}`)}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", assignment ? "bg-warning/10" : "bg-primary/10")}>
                        <Truck className={cn("h-5 w-5", assignment ? "text-warning" : "text-primary")} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{v.name}</p>
                          <Badge variant="outline" className={cn("text-[10px] shrink-0", sc.class)}>{sc.label}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {typeLabel}
                          {v.plate_number && ` · ${v.plate_number}`}
                          {v.capacity && ` · ${v.capacity}`}
                        </p>
                        {assignment && (
                          <div className="flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3 text-warning shrink-0" />
                            <p className="text-xs text-warning font-medium truncate">
                              {assignment.type === "livraison" ? "Livraison" : "Récupération"} · {assignment.missionTitle}
                              {assignment.status === "en_route" && " · En route"}
                            </p>
                          </div>
                        )}
                        {(() => {
                          const alerts: string[] = [];
                          if (v.insurance_expiry && isPast(parseISO(v.insurance_expiry))) alerts.push("Assurance expirée");
                          else if (v.insurance_expiry && differenceInDays(parseISO(v.insurance_expiry), new Date()) <= 30) alerts.push("Assurance expire bientôt");
                          if (v.ct_expiry && isPast(parseISO(v.ct_expiry))) alerts.push("CT expiré");
                          else if (v.ct_expiry && differenceInDays(parseISO(v.ct_expiry), new Date()) <= 30) alerts.push("CT expire bientôt");
                          return alerts.length > 0 ? (
                            <div className="flex items-center gap-1 mt-1">
                              <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />
                              <p className="text-[10px] text-destructive font-medium truncate">{alerts.join(" · ")}</p>
                            </div>
                          ) : null;
                        })()}
                      </div>
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" onClick={() => openEdit(v)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-destructive hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer {v.name} ?</AlertDialogTitle>
                              <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="rounded-xl">Annuler</AlertDialogCancel>
                              <AlertDialogAction className="rounded-xl bg-destructive text-destructive-foreground" onClick={() => deleteVehicle.mutate(v.id)}>
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
