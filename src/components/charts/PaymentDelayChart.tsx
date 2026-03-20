import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Card, CardContent } from "@/components/ui/card";

interface PaymentDelayChartProps {
  factures: { date: string; due_date: string | null; status: string; total_ttc: number }[];
  paiements: { facture_id: string | null; payment_date: string }[];
}

export function PaymentDelayChart({ factures, paiements }: PaymentDelayChartProps) {
  const data = useMemo(() => {
    const buckets = [
      { label: "À temps", min: -Infinity, max: 0, count: 0, amount: 0 },
      { label: "1-15j", min: 1, max: 15, count: 0, amount: 0 },
      { label: "16-30j", min: 16, max: 30, count: 0, amount: 0 },
      { label: "31-60j", min: 31, max: 60, count: 0, amount: 0 },
      { label: "60j+", min: 61, max: Infinity, count: 0, amount: 0 },
    ];

    factures.forEach((f) => {
      if (!f.due_date) return;
      const dueDate = new Date(f.due_date);
      let refDate: Date;

      if (f.status === "payée") {
        const payment = paiements.find((p) => p.facture_id === f.date); // approximate
        refDate = payment ? new Date(payment.payment_date) : new Date();
      } else if (f.status === "en_retard" || f.status === "envoyée") {
        refDate = new Date();
      } else {
        return;
      }

      const delayDays = Math.floor((refDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      const bucket = buckets.find((b) => delayDays >= b.min && delayDays <= b.max);
      if (bucket) {
        bucket.count++;
        bucket.amount += Number(f.total_ttc);
      }
    });

    return buckets.filter((b) => b.count > 0);
  }, [factures, paiements]);

  if (data.length === 0) return null;

  return (
    <Card className="shadow-card border-border/50">
      <CardContent className="p-6">
        <h3 className="font-display font-semibold mb-4">Délais de paiement</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                formatter={(value: number, name: string) =>
                  name === "amount" ? [`${value.toLocaleString()}€`, "Montant"] : [value, "Factures"]
                }
              />
              <Bar dataKey="count" name="Factures" fill="hsl(var(--warning))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
