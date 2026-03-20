/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2 } from "lucide-react";
import { useCreatePaiement, useFactures } from "@/hooks/use-data";
import { supabase } from "@/integrations/supabase/client";

const methods = [
  { value: "virement", label: "Virement" },
  { value: "carte", label: "Carte" },
  { value: "espèces", label: "Espèces" },
  { value: "chèque", label: "Chèque" },
  { value: "stripe", label: "Stripe" },
] as const;

export function PaiementFormDialog() {
  const [open, setOpen] = useState(false);
  const [factureId, setFactureId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<string>("virement");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [cashJustification, setCashJustification] = useState("");
  const [maxAmount, setMaxAmount] = useState<number | null>(null);

  const { data: factures = [] } = useFactures();
  const createPaiement = useCreatePaiement();

  const unpaidFactures = factures.filter(f => f.status !== "payée" && f.status !== "annulée");

  const selectedFacture = factures.find(f => f.id === factureId);

  const resetForm = () => {
    setFactureId("");
    setAmount("");
    setMethod("virement");
    setDate(new Date().toISOString().slice(0, 10));
    setReference("");
    setNotes("");
    setCashJustification("");
    setMaxAmount(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factureId || !amount || !method || !date) return;

    await createPaiement.mutateAsync({
      facture_id: factureId,
      amount: parseFloat(amount),
      payment_date: date,
      method: method as "virement" | "carte" | "espèces" | "chèque" | "stripe",
      reference: reference || undefined,
      notes: notes || undefined,
      cash_justification: method === "espèces" ? cashJustification || undefined : undefined,
    });

    resetForm();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gradient-primary text-white rounded-xl gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Nouveau paiement
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enregistrer un paiement</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Facture *</Label>
            <Select value={factureId} onValueChange={async (v) => {
              setFactureId(v);
              setAmount("");
              setMaxAmount(null);
              const f = factures.find(x => x.id === v);
              if (f) {
                const { data, error } = await supabase
                  .from("paiements")
                  .select("amount, validation_status")
                  .eq("facture_id", v);
                if (!error && data) {
                  const paid = data
                    .filter(p => p.validation_status !== "rejected" && p.validation_status !== "pending")
                    .reduce((sum, p) => sum + Number(p.amount), 0);
                  const remaining = Math.max(0, Number(f.total_ttc) - paid);
                  setAmount(String(remaining));
                  setMaxAmount(remaining);
                } else {
                  setAmount(String(Number(f.total_ttc)));
                  setMaxAmount(Number(f.total_ttc));
                }
              }
            }}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Sélectionner une facture" />
              </SelectTrigger>
              <SelectContent>
                {unpaidFactures.map(f => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.number} — {(f as any).clients?.name || ""} — {Number(f.total_ttc).toLocaleString("fr-FR")}€
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Montant (€) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max={maxAmount ?? undefined}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="rounded-xl"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="rounded-xl"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Méthode *</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {methods.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {method === "espèces" && (
            <div className="space-y-2">
              <Label>Justification espèces</Label>
              <Input
                value={cashJustification}
                onChange={e => setCashJustification(e.target.value)}
                className="rounded-xl"
                placeholder="Motif du paiement en espèces"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Référence</Label>
            <Input
              value={reference}
              onChange={e => setReference(e.target.value)}
              className="rounded-xl"
              placeholder="N° de transaction, chèque..."
            />
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="rounded-xl"
              rows={2}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="rounded-xl flex-1" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button
              type="submit"
              className="gradient-primary text-white rounded-xl flex-1"
              disabled={!factureId || !amount || Number(amount) <= 0 || (maxAmount !== null && Number(amount) > maxAmount) || createPaiement.isPending}
            >
              {createPaiement.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
