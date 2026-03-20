import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, FileText, PenLine, Download } from "lucide-react";
import { cn } from "@/lib/utils";

const mockPublicDevis = {
  number: "DEV-2026-001",
  clientName: "Marie Dupont",
  company: "EventPro",
  date: "10 janvier 2026",
  validUntil: "10 février 2026",
  items: [
    { description: "Prestation DJ Mariage (10h)", quantity: 1, unitPrice: 2500, total: 2500 },
    { description: "Sonorisation complète — JBL EON 615 x4", quantity: 1, unitPrice: 800, total: 800 },
    { description: "Éclairage ambiance LED x8", quantity: 1, unitPrice: 450, total: 450 },
  ],
  totalHT: 3750,
  tva: 750,
  totalTTC: 4500,
  emitter: {
    name: "Planify Events",
    address: "12 rue de la Paix, 75002 Paris",
    siret: "123 456 789 00012",
    email: "contact@planify.fr",
    phone: "01 23 45 67 89",
  },
};

export default function PublicDevisSign() {
  const [signed, setSigned] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const d = mockPublicDevis;

  if (signed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-6 animate-slide-up max-w-md">
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto">
            <Check className="h-10 w-10 text-success" />
          </div>
          <h1 className="text-2xl font-display font-bold">Devis signé avec succès !</h1>
          <p className="text-muted-foreground">
            Le devis <span className="font-semibold text-foreground">{d.number}</span> a été signé et confirmé.
            Vous recevrez une confirmation par email.
          </p>
          <Button variant="outline" className="gap-2 rounded-xl">
            <Download className="h-4 w-4" /> Télécharger le PDF
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto flex items-center justify-between h-14 px-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center text-xs font-bold text-white">P</div>
            <span className="font-display font-semibold">Planify</span>
          </div>
          <span className="text-sm text-muted-foreground">Signature de devis</span>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8 max-w-3xl space-y-6 animate-fade-in">
        {/* Devis document */}
        <Card className="shadow-lg border-border/50 overflow-hidden">
          {/* Document header */}
          <div className="gradient-primary p-6 text-white">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white/70 text-sm font-medium uppercase tracking-wider">Devis</p>
                <p className="text-2xl font-display font-bold mt-1">{d.number}</p>
              </div>
              <div className="text-right text-sm text-white/80">
                <p>Émis le {d.date}</p>
                <p>Valide jusqu'au {d.validUntil}</p>
              </div>
            </div>
          </div>

          <CardContent className="p-6 space-y-6">
            {/* Parties */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Émetteur</p>
                <p className="font-semibold">{d.emitter.name}</p>
                <p className="text-sm text-muted-foreground">{d.emitter.address}</p>
                <p className="text-sm text-muted-foreground">SIRET : {d.emitter.siret}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Client</p>
                <p className="font-semibold">{d.clientName}</p>
                {d.company && <p className="text-sm text-muted-foreground">{d.company}</p>}
              </div>
            </div>

            {/* Table */}
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left p-3 font-medium text-muted-foreground">Description</th>
                    <th className="text-center p-3 font-medium text-muted-foreground w-16">Qté</th>
                    <th className="text-right p-3 font-medium text-muted-foreground w-24">P.U. HT</th>
                    <th className="text-right p-3 font-medium text-muted-foreground w-24">Total HT</th>
                  </tr>
                </thead>
                <tbody>
                  {d.items.map((item, i) => (
                    <tr key={i} className="border-t border-border/50">
                      <td className="p-3">{item.description}</td>
                      <td className="p-3 text-center text-muted-foreground">{item.quantity}</td>
                      <td className="p-3 text-right text-muted-foreground">{item.unitPrice.toLocaleString()}€</td>
                      <td className="p-3 text-right font-medium">{item.total.toLocaleString()}€</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-64 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Total HT</span><span>{d.totalHT.toLocaleString()}€</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">TVA (20%)</span><span>{d.tva.toLocaleString()}€</span></div>
                <div className="flex justify-between pt-2 border-t border-border text-base font-bold"><span>Total TTC</span><span>{d.totalTTC.toLocaleString()}€</span></div>
              </div>
            </div>

            {/* Signature zone */}
            <div className="border-t border-border pt-6">
              <h3 className="font-display font-semibold flex items-center gap-2 mb-4">
                <PenLine className="h-4 w-4 text-primary" /> Signature
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                En signant ce devis, vous acceptez les conditions décrites ci-dessus et confirmez votre accord.
              </p>

              {/* Mock signature pad */}
              <div
                className={cn(
                  "w-full h-40 rounded-xl border-2 border-dashed flex items-center justify-center cursor-crosshair transition-colors",
                  hasSignature ? "border-success bg-success/5" : "border-border hover:border-primary/50 bg-muted/30"
                )}
                onMouseDown={() => { setDrawing(true); setHasSignature(true); }}
                onMouseUp={() => setDrawing(false)}
                onMouseLeave={() => setDrawing(false)}
              >
                {hasSignature ? (
                  <div className="text-center">
                    <p className="font-display text-2xl italic text-foreground/70">{d.clientName}</p>
                    <p className="text-xs text-muted-foreground mt-2">Signature enregistrée</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Cliquez et dessinez votre signature ici</p>
                )}
              </div>

              {hasSignature && (
                <div className="flex items-center gap-3 mt-4">
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => setHasSignature(false)}
                  >
                    Effacer
                  </Button>
                  <Button
                    className="gradient-primary text-white rounded-xl gap-2 hover:opacity-90 flex-1"
                    onClick={() => setSigned(true)}
                  >
                    <Check className="h-4 w-4" /> Confirmer et signer le devis
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Propulsé par <span className="font-semibold">Planify</span> · Document sécurisé
        </p>
      </div>
    </div>
  );
}
