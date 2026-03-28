import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useEquipmentCheckouts, useCreateCheckout } from "@/hooks/use-logistics";
import { ArrowUpCircle, ArrowDownCircle, Plus, Loader2, ClipboardCheck } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const conditionConfig: Record<string, { label: string; class: string }> = {
  bon: { label: "Bon état", class: "bg-success/10 text-success" },
  usé: { label: "Usé", class: "bg-warning/10 text-warning" },
  endommagé: { label: "Endommagé", class: "bg-destructive/10 text-destructive" },
};

interface Props {
  missionId: string;
  missionMateriel: any[];
  canEdit: boolean;
}

export function MissionCheckInOut({ missionId, missionMateriel, canEdit }: Props) {
  const { data: checkouts = [] } = useEquipmentCheckouts(missionId);
  const createCheckout = useCreateCheckout();
  const [open, setOpen] = useState(false);

  const [form, setForm] = useState({
    materiel_id: "",
    type: "checkout",
    quantity: "1",
    condition: "bon",
    notes: "",
  });

  const resetForm = () => setForm({ materiel_id: "", type: "checkout", quantity: "1", condition: "bon", notes: "" });

  const handleSubmit = async () => {
    if (!form.materiel_id) return;
    await createCheckout.mutateAsync({
      mission_id: missionId,
      materiel_id: form.materiel_id,
      type: form.type,
      quantity: parseInt(form.quantity) || 1,
      condition: form.condition,
      notes: form.notes || undefined,
    });
    resetForm();
    setOpen(false);
  };

  return (
    <Card className="shadow-card border-border/50">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-primary" /> Check-in / Check-out
          </h3>
          {canEdit && missionMateriel.length > 0 && (
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 rounded-xl">
                  <Plus className="h-3.5 w-3.5" /> Enregistrer
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Enregistrer un mouvement</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="checkout">📤 Départ (check-out)</SelectItem>
                        <SelectItem value="checkin">📥 Retour (check-in)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Matériel *</Label>
                    <Select value={form.materiel_id} onValueChange={v => setForm(f => ({ ...f, materiel_id: v }))}>
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                      <SelectContent>
                        {missionMateriel.map((mm: any) => (
                          <SelectItem key={mm.materiel_id} value={mm.materiel_id}>
                            {mm.materiel?.name} (×{mm.quantity})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Quantité</Label>
                      <Input
                        type="number"
                        min="1"
                        value={form.quantity}
                        onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>État</Label>
                      <Select value={form.condition} onValueChange={v => setForm(f => ({ ...f, condition: v }))}>
                        <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bon">Bon état</SelectItem>
                          <SelectItem value="usé">Usé</SelectItem>
                          <SelectItem value="endommagé">Endommagé</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={form.notes}
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                      className="rounded-xl"
                      rows={2}
                      placeholder="Observations, dommages constatés…"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>Annuler</Button>
                  <Button
                    onClick={handleSubmit}
                    className="rounded-xl"
                    disabled={!form.materiel_id || createCheckout.isPending}
                  >
                    {createCheckout.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {checkouts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucun mouvement enregistré pour cette mission.
          </p>
        ) : (
          <div className="space-y-2">
            {checkouts.map((c: any) => {
              const cc = conditionConfig[c.condition] || { label: c.condition, class: "bg-muted" };
              const isAuto = c.notes?.includes("Auto-généré");
              return (
                <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                  {c.type === "checkout"
                    ? <ArrowUpCircle className="h-5 w-5 text-warning shrink-0" />
                    : <ArrowDownCircle className="h-5 w-5 text-success shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-sm truncate">{c.materiel?.name || "—"}</p>
                      {isAuto && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary shrink-0">⚡ Auto</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(c.checked_at), "d MMM yyyy HH:mm", { locale: fr })} · ×{c.quantity}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${cc.class}`}>
                    {cc.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
