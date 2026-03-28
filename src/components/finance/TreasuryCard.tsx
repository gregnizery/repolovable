import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Wallet, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TreasuryCardProps {
  paiements: { payment_date: string; amount: number }[];
  factures: { total_ttc: number; status: string; due_date: string | null }[];
  devisList: { total_ttc: number; status: string }[];
}

export function TreasuryCard({ paiements, factures, devisList }: TreasuryCardProps) {
  const stats = useMemo(() => {
    const totalEncaisse = paiements.reduce((s, p) => s + Number(p.amount), 0);

    const unpaidTotal = factures
      .filter(f => f.status === "envoyée" || f.status === "en_retard")
      .reduce((s, f) => s + Number(f.total_ttc), 0);

    const overdueTotal = factures
      .filter(f => f.status === "en_retard")
      .reduce((s, f) => s + Number(f.total_ttc), 0);

    const pendingDevisTotal = devisList
      .filter(d => d.status === "envoyé")
      .reduce((s, d) => s + Number(d.total_ttc), 0);

    // Month-over-month growth
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;

    let thisMonthTotal = 0;
    let lastMonthTotal = 0;
    paiements.forEach(p => {
      const d = new Date(p.payment_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (key === thisMonth) thisMonthTotal += Number(p.amount);
      if (key === lastMonth) lastMonthTotal += Number(p.amount);
    });

    const growthPct = lastMonthTotal > 0
      ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100
      : thisMonthTotal > 0 ? 100 : 0;

    return { totalEncaisse, unpaidTotal, overdueTotal, pendingDevisTotal, thisMonthTotal, growthPct };
  }, [paiements, factures, devisList]);

  const fmt = (v: number) => v.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Main balance card */}
      <Card className="lg:col-span-2 shadow-card border-border/50 overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-success via-primary to-info" />
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">Solde encaissé</p>
              </div>
              <p className="text-3xl font-display font-bold tracking-tight">{fmt(stats.totalEncaisse)} €</p>
            </div>
            <div
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold",
                stats.growthPct >= 0
                  ? "bg-success/10 text-success"
                  : "bg-destructive/10 text-destructive"
              )}
            >
              {stats.growthPct >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {stats.growthPct >= 0 ? "+" : ""}{stats.growthPct.toFixed(1)}%
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-border p-3.5 bg-card">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-success/10">
                  <ArrowUpRight className="h-3.5 w-3.5 text-success" />
                </div>
                <span className="text-xs text-muted-foreground">Ce mois</span>
              </div>
              <p className="text-lg font-display font-bold text-success">{fmt(stats.thisMonthTotal)} €</p>
            </div>
            <div className="rounded-xl border border-border p-3.5 bg-card">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-warning/10">
                  <Clock className="h-3.5 w-3.5 text-warning" />
                </div>
                <span className="text-xs text-muted-foreground">À encaisser</span>
              </div>
              <p className="text-lg font-display font-bold text-warning">{fmt(stats.unpaidTotal)} €</p>
            </div>
            <div className="rounded-xl border border-border p-3.5 bg-card">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-destructive/10">
                  <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                </div>
                <span className="text-xs text-muted-foreground">En retard</span>
              </div>
              <p className="text-lg font-display font-bold text-destructive">{fmt(stats.overdueTotal)} €</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pipeline card */}
      <Card className="shadow-card border-border/50 overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-info" />
        <CardContent className="p-6 flex flex-col justify-between h-full">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Pipeline commercial</p>
            <p className="text-2xl font-display font-bold tracking-tight">{fmt(stats.pendingDevisTotal)} €</p>
            <p className="text-xs text-muted-foreground mt-1">Devis en attente de signature</p>
          </div>

          <div className="mt-6 space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">Taux de conversion potentiel</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{
                    width: `${Math.min(100, stats.totalEncaisse > 0 && stats.pendingDevisTotal > 0
                      ? (stats.totalEncaisse / (stats.totalEncaisse + stats.pendingDevisTotal)) * 100
                      : stats.totalEncaisse > 0 ? 100 : 0
                    )}%`
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-xs mt-1.5">
                <span className="text-success font-medium">Encaissé</span>
                <span className="text-muted-foreground">En attente</span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 border border-border/50">
              <ArrowDownRight className="h-4 w-4 text-info shrink-0" />
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{fmt(stats.totalEncaisse + stats.unpaidTotal)} €</span> de CA total facturable
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
