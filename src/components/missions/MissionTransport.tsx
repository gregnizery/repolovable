import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useProviders as useTeamProviders } from "@/hooks/use-data";
import { useTransportPlans, useCreateTransportPlan, useUpdateTransportStatus, useUpdateTransportPlan } from "@/hooks/use-logistics";
import { useTeam, useTeamMembers } from "@/hooks/use-team";
import { useVehicles } from "@/hooks/use-vehicles";
import { Truck, Plus, Loader2, MapPin, Clock, User, Car, ChevronRight, UserPlus, Check } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; class: string }> = {
  "planifié": { label: "Planifié", class: "bg-info/10 text-info border-info/30" },
  "en_route": { label: "En route", class: "bg-warning/10 text-warning border-warning/30" },
  "terminé": { label: "Terminé", class: "bg-success/10 text-success border-success/30" },
  "annulé": { label: "Annulé", class: "bg-muted text-muted-foreground border-border" },
};

const nextStatus: Record<string, string> = {
  "planifié": "en_route",
  "en_route": "terminé",
};

const nextLabel: Record<string, string> = {
  "planifié": "Démarrer",
  "en_route": "Terminer",
};

const typeLabels: Record<string, { label: string; icon: string }> = {
  livraison: { label: "Livraison", icon: "📦" },
  récupération: { label: "Récupération", icon: "🔄" },
  recuperation: { label: "Récupération", icon: "🔄" },
};

interface Props {
  missionId: string;
  canEdit: boolean;
}

/** Build a unified list of assignable people (team members + providers) */
function useAssignablePersons() {
  const { data: team } = useTeam();
  const teamId = (team as any)?.teams?.id;
  const { data: members = [] } = useTeamMembers(teamId);
  const { data: providers = [] } = useTeamProviders();

  const persons: { id: string; label: string; type: "member" | "provider" }[] = [];

  members.forEach((m) => {
    const name = [m.first_name, m.last_name].filter(Boolean).join(" ") || m.email || "Membre";
    persons.push({ id: `member:${m.user_id}`, label: `${name} (${m.role})`, type: "member" });
  });

  providers.forEach((p) => {
    persons.push({ id: `provider:${p.id}`, label: `${p.name} (prestataire)`, type: "provider" });
  });

  return persons;
}

export function MissionTransport({ missionId, canEdit }: Props) {
  const { data: plans = [] } = useTransportPlans(missionId);
  const createPlan = useCreateTransportPlan();
  const updateStatus = useUpdateTransportStatus();
  const updatePlan = useUpdateTransportPlan();
  const persons = useAssignablePersons();
  const { data: vehicles = [] } = useVehicles();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const [form, setForm] = useState({
    type: "livraison",
    scheduled_at: "",
    address: "",
    vehicle_id: "",
    assignee: "",
    driver_name: "",
    notes: "",
  });

  const resetForm = () => setForm({ type: "livraison", scheduled_at: "", address: "", vehicle_id: "", assignee: "", driver_name: "", notes: "" });

  const resolveDriverName = () => {
    if (form.assignee === "other") return form.driver_name;
    if (form.assignee) {
      const person = persons.find(p => p.id === form.assignee);
      return person?.label.replace(/ \(.*\)$/, "") || form.driver_name;
    }
    return form.driver_name || undefined;
  };

  const handleSubmit = async () => {
    const selectedVehicle = vehicles.find((v: any) => v.id === form.vehicle_id);
    await createPlan.mutateAsync({
      mission_id: missionId,
      type: form.type,
      scheduled_at: form.scheduled_at || undefined,
      address: form.address || undefined,
      vehicle: selectedVehicle ? `${selectedVehicle.name}${selectedVehicle.plate_number ? ` (${selectedVehicle.plate_number})` : ""}` : undefined,
      driver_name: resolveDriverName(),
      notes: form.notes || undefined,
    });
    resetForm();
    setOpen(false);
  };

  const handleAssign = (planId: string, personId: string, customName?: string) => {
    let driverName = customName || "";
    if (personId !== "other") {
      const person = persons.find(p => p.id === personId);
      driverName = person?.label.replace(/ \(.*\)$/, "") || "";
    }
    updatePlan.mutate({ id: planId, driver_name: driverName }, {
      onSettled: () => setAssigningId(null),
    });
  };

  return (
    <Card className="shadow-card border-border/50">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold flex items-center gap-2">
            <Truck className="h-4 w-4 text-warning" /> Transport
          </h3>
          {canEdit && (
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 rounded-xl">
                  <Plus className="h-3.5 w-3.5" /> Planifier
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Planifier un transport</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="livraison">📦 Livraison</SelectItem>
                        <SelectItem value="recuperation">🔄 Récupération</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date & heure</Label>
                    <Input
                      type="datetime-local"
                      value={form.scheduled_at}
                      onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Assigné à</Label>
                    <Select value={form.assignee} onValueChange={v => setForm(f => ({ ...f, assignee: v, driver_name: v === "other" ? f.driver_name : "" }))}>
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="Sélectionner une personne…" /></SelectTrigger>
                      <SelectContent>
                        {persons.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.type === "provider" ? "🎧 " : "👤 "}{p.label}
                          </SelectItem>
                        ))}
                        <SelectItem value="other">✏️ Autre (saisie libre)</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.assignee === "other" && (
                      <Input
                        value={form.driver_name}
                        onChange={e => setForm(f => ({ ...f, driver_name: e.target.value }))}
                        className="rounded-xl mt-2"
                        placeholder="Nom de la personne"
                      />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Adresse</Label>
                      <Input
                        value={form.address}
                        onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                        className="rounded-xl"
                        placeholder="Lieu de livraison / récup"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Véhicule</Label>
                      {vehicles.length > 0 ? (
                        <Select value={form.vehicle_id} onValueChange={v => setForm(f => ({ ...f, vehicle_id: v }))}>
                          <SelectTrigger className="rounded-xl"><SelectValue placeholder="Choisir un véhicule…" /></SelectTrigger>
                          <SelectContent>
                            {(vehicles as any[]).filter((v: any) => v.status === "disponible").map((v: any) => (
                              <SelectItem key={v.id} value={v.id}>
                                🚛 {v.name}{v.plate_number ? ` · ${v.plate_number}` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-xs text-muted-foreground pt-2">Aucun véhicule. <a href="/vehicules" className="underline text-primary">En ajouter</a></p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={form.notes}
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                      className="rounded-xl"
                      rows={2}
                      placeholder="Instructions, accès, contact sur place…"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>Annuler</Button>
                  <Button onClick={handleSubmit} className="rounded-xl" disabled={createPlan.isPending}>
                    {createPlan.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Planifier"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {plans.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucun transport planifié pour cette mission.
          </p>
        ) : (
          <div className="space-y-3">
            {plans.map((p: any) => (
              <TransportCard
                key={p.id}
                plan={p}
                canEdit={canEdit}
                persons={persons}
                updatingId={updatingId}
                assigningId={assigningId}
                onAdvance={(id, status) => {
                  setUpdatingId(id);
                  updateStatus.mutate({ id, status }, { onSettled: () => setUpdatingId(null) });
                }}
                onAssign={(id, personId, customName) => {
                  setAssigningId(id);
                  handleAssign(id, personId, customName);
                }}
                isAssigning={updatePlan.isPending}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface TransportCardProps {
  plan: any;
  canEdit: boolean;
  persons: { id: string; label: string; type: "member" | "provider" }[];
  updatingId: string | null;
  assigningId: string | null;
  onAdvance: (id: string, status: string) => void;
  onAssign: (id: string, personId: string, customName?: string) => void;
  isAssigning: boolean;
}

function TransportCard({ plan: p, canEdit, persons, updatingId, assigningId, onAdvance, onAssign, isAssigning }: TransportCardProps) {
  const sc = statusConfig[p.status] || { label: p.status, class: "bg-muted" };
  const tl = typeLabels[p.type] || { label: p.type, icon: "🚚" };
  const next = nextStatus[p.status];
  const canAdvance = canEdit && next;
  const [showAssign, setShowAssign] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState("");
  const [customName, setCustomName] = useState("");

  const handleConfirmAssign = () => {
    if (!selectedPerson) return;
    onAssign(p.id, selectedPerson, selectedPerson === "other" ? customName : undefined);
    setShowAssign(false);
    setSelectedPerson("");
    setCustomName("");
  };

  return (
    <div className={cn(
      "p-3 rounded-xl border space-y-2 bg-muted/30",
      sc.class.split(" ").find(c => c.startsWith("border-")) || "border-border/50"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">{tl.icon}</span>
          <span className="font-medium text-sm">{tl.label}</span>
        </div>
        <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", sc.class)}>{sc.label}</span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {p.scheduled_at && (
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3 shrink-0" />
            {format(new Date(p.scheduled_at), "d MMM yyyy HH:mm", { locale: fr })}
          </div>
        )}
        {p.address && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{p.address}</span>
          </div>
        )}
        {p.vehicle && (
          <div className="flex items-center gap-1.5">
            <Car className="h-3 w-3 shrink-0" />
            {p.vehicle}
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <User className="h-3 w-3 shrink-0" />
          {p.driver_name ? (
            <span className="font-medium text-foreground">{p.driver_name}</span>
          ) : (
            <span className="italic text-muted-foreground/60">Non assigné</span>
          )}
        </div>
      </div>

      {p.notes && <p className="text-xs text-muted-foreground italic">{p.notes}</p>}

      {/* Inline assign */}
      {showAssign && (
        <div className="space-y-2 p-2 rounded-lg bg-background border border-border">
          <Select value={selectedPerson} onValueChange={v => { setSelectedPerson(v); if (v !== "other") setCustomName(""); }}>
            <SelectTrigger className="rounded-xl h-8 text-xs">
              <SelectValue placeholder="Choisir une personne…" />
            </SelectTrigger>
            <SelectContent>
              {persons.map(person => (
                <SelectItem key={person.id} value={person.id}>
                  {person.type === "provider" ? "🎧 " : "👤 "}{person.label}
                </SelectItem>
              ))}
              <SelectItem value="other">✏️ Autre (saisie libre)</SelectItem>
            </SelectContent>
          </Select>
          {selectedPerson === "other" && (
            <Input
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              placeholder="Nom de la personne"
              className="rounded-xl h-8 text-xs"
            />
          )}
          <div className="flex gap-2">
            <Button size="sm" className="rounded-xl text-xs h-7 gap-1" onClick={handleConfirmAssign} disabled={!selectedPerson || (selectedPerson === "other" && !customName) || (assigningId === p.id && isAssigning)}>
              {assigningId === p.id && isAssigning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              Confirmer
            </Button>
            <Button size="sm" variant="ghost" className="rounded-xl text-xs h-7" onClick={() => { setShowAssign(false); setSelectedPerson(""); setCustomName(""); }}>
              Annuler
            </Button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {canEdit && p.status !== "terminé" && p.status !== "annulé" && (
        <div className="flex items-center gap-2 pt-1">
          {!p.driver_name && !showAssign && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 rounded-xl text-xs h-7"
              onClick={() => setShowAssign(true)}
            >
              <UserPlus className="h-3 w-3" /> Assigner
            </Button>
          )}
          {p.driver_name && !showAssign && (
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5 rounded-xl text-xs h-7"
              onClick={() => setShowAssign(true)}
            >
              <UserPlus className="h-3 w-3" /> Réassigner
            </Button>
          )}
          {canAdvance && (
            <Button
              size="sm"
              className="gap-1.5 rounded-xl text-xs h-7"
              onClick={() => onAdvance(p.id, next)}
              disabled={updatingId === p.id}
            >
              {updatingId === p.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>{nextLabel[p.status]} <ChevronRight className="h-3 w-3" /></>
              )}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="rounded-xl text-xs h-7 text-destructive hover:text-destructive"
            onClick={() => onAdvance(p.id, "annulé")}
            disabled={updatingId === p.id}
          >
            Annuler
          </Button>
        </div>
      )}
    </div>
  );
}
