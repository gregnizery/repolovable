import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useLogisticsConfigs, useUpsertLogisticsConfig, useDeleteLogisticsConfig } from "@/hooks/use-logistics-config";
import { Plus, Trash2, Loader2, Truck, Package, ClipboardCheck, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

const defaultEventTypes = [
  { value: "default", label: "Par défaut (tous types)" },
  { value: "concert", label: "Concert" },
  { value: "mariage", label: "Mariage" },
  { value: "corporate", label: "Corporate" },
  { value: "festival", label: "Festival" },
  { value: "séminaire", label: "Séminaire" },
  { value: "salon", label: "Salon / Expo" },
  { value: "théâtre", label: "Théâtre / Spectacle" },
];

export function LogisticsSettingsPanel() {
  const { data: configs, isLoading } = useLogisticsConfigs();
  const upsert = useUpsertLogisticsConfig();
  const deleteConfig = useDeleteLogisticsConfig();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    event_type: "default",
    delivery_hours_before: "4",
    pickup_hours_after: "2",
    auto_transport: true,
    auto_packing_list: true,
    auto_checkout: true,
  });

  const resetForm = () => setForm({
    event_type: "default",
    delivery_hours_before: "4",
    pickup_hours_after: "2",
    auto_transport: true,
    auto_packing_list: true,
    auto_checkout: true,
  });

  const handleSave = async () => {
    await upsert.mutateAsync({
      event_type: form.event_type,
      delivery_hours_before: parseFloat(form.delivery_hours_before) || 4,
      pickup_hours_after: parseFloat(form.pickup_hours_after) || 2,
      auto_transport: form.auto_transport,
      auto_packing_list: form.auto_packing_list,
      auto_checkout: form.auto_checkout,
    });
    setOpen(false);
    resetForm();
  };

  const usedTypes = new Set(configs?.map(c => c.event_type) || []);
  const availableTypes = defaultEventTypes.filter(t => !usedTypes.has(t.value));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4 text-warning" /> Automatisation logistique
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Configurez les délais et l'auto-génération par type d'événement. Dès qu'une mission passe en « Confirmée », le système crée automatiquement les transports, la packing list et les check-outs.
          </p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 rounded-xl">
              <Plus className="h-3.5 w-3.5" /> Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Configuration logistique</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Type d'événement</Label>
                <select
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  value={form.event_type}
                  onChange={e => setForm(f => ({ ...f, event_type: e.target.value }))}
                >
                  {availableTypes.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Truck className="h-3.5 w-3.5 text-info" /> Livraison (h avant)
                  </Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    value={form.delivery_hours_before}
                    onChange={e => setForm(f => ({ ...f, delivery_hours_before: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Truck className="h-3.5 w-3.5 text-warning" /> Récup (h après)
                  </Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    value={form.pickup_hours_after}
                    onChange={e => setForm(f => ({ ...f, pickup_hours_after: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5 text-sm">
                    <Truck className="h-3.5 w-3.5" /> Transport auto
                  </Label>
                  <Switch checked={form.auto_transport} onCheckedChange={v => setForm(f => ({ ...f, auto_transport: v }))} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5 text-sm">
                    <Package className="h-3.5 w-3.5" /> Packing list auto
                  </Label>
                  <Switch checked={form.auto_packing_list} onCheckedChange={v => setForm(f => ({ ...f, auto_packing_list: v }))} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5 text-sm">
                    <ClipboardCheck className="h-3.5 w-3.5" /> Check-out auto
                  </Label>
                  <Switch checked={form.auto_checkout} onCheckedChange={v => setForm(f => ({ ...f, auto_checkout: v }))} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>Annuler</Button>
              <Button onClick={handleSave} className="rounded-xl" disabled={upsert.isPending}>
                {upsert.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
      ) : !configs || configs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center">
            <Zap className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Aucune configuration. Les valeurs par défaut s'appliquent : livraison 4h avant, récupération 2h après.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {configs.map(c => {
            const label = defaultEventTypes.find(t => t.value === c.event_type)?.label || c.event_type;
            return (
              <Card key={c.id} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Livraison {c.delivery_hours_before}h avant · Récup {c.pickup_hours_after}h après
                      </p>
                      <div className="flex gap-2 mt-1.5">
                        {c.auto_transport && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-info/10 text-info">Transport</span>}
                        {c.auto_packing_list && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-success/10 text-success">Packing</span>}
                        {c.auto_checkout && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-warning/10 text-warning">Check-out</span>}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteConfig.mutate(c.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
