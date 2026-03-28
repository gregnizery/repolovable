import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Card, CardContent } from "@/components/ui/card";

interface CashFlowChartProps {
  paiements: { payment_date: string; amount: number }[];
  factures: { date: string; total_ttc: number; status: string }[];
  months?: number;
}

export function CashFlowChart({ paiements, factures, months = 6 }: CashFlowChartProps) {
  const data = useMemo(() => {
    const now = new Date();
    const result: { month: string; label: string; encaissements: number; decaissements: number; solde: number }[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("fr-FR", { month: "short" });
      result.push({ month: key, label, encaissements: 0, decaissements: 0, solde: 0 });
    }

    paiements.forEach((p) => {
      const d = new Date(p.payment_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const entry = result.find((r) => r.month === key);
      if (entry) entry.encaissements += Number(p.amount);
    });

    // Use unpaid invoices as "décaissements" proxy (outstanding)
    factures
      .filter(f => f.status !== "payée" && f.status !== "annulée")
      .forEach((f) => {
        const d = new Date(f.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const entry = result.find((r) => r.month === key);
        if (entry) entry.decaissements += Number(f.total_ttc);
      });

    let cumul = 0;
    result.forEach((r) => {
      cumul += r.encaissements - r.decaissements;
      r.solde = cumul;
    });

    return result;
  }, [paiements, factures, months]);

  return (
    <Card className="shadow-card border-border/50">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold">Flux de trésorerie</h3>
          <span className="text-xs text-muted-foreground">{months} derniers mois</span>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <defs>
                <linearGradient id="cashFlowIn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="cashFlowOut" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-muted-foreground" />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} className="text-muted-foreground" />
              <ReferenceLine y={0} className="stroke-border" />
              <Tooltip
                formatter={(value: number, name: string) => [
                  `${value.toLocaleString("fr-FR")}€`,
                  name === "encaissements" ? "Encaissements" : name === "decaissements" ? "Décaissements" : "Solde",
                ]}
                contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 13 }}
                labelStyle={{ color: "hsl(var(--muted-foreground))" }}
              />
              <Area
                type="monotone"
                dataKey="encaissements"
                stroke="hsl(var(--success))"
                strokeWidth={2}
                fill="url(#cashFlowIn)"
              />
              <Area
                type="monotone"
                dataKey="decaissements"
                stroke="hsl(var(--destructive))"
                strokeWidth={2}
                strokeDasharray="4 4"
                fill="url(#cashFlowOut)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-success" />
            <span className="text-xs text-muted-foreground">Encaissements</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 border-t-2 border-dashed border-destructive" style={{ width: 12 }} />
            <span className="text-xs text-muted-foreground">Décaissements</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
