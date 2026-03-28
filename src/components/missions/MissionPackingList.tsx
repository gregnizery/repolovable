import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useEquipmentCheckouts } from "@/hooks/use-logistics";
import { ListChecks, Download, Package, Check, AlertTriangle } from "lucide-react";

interface Props {
  missionId: string;
  missionTitle: string;
  missionMateriel: any[];
  missionDate?: string;
  missionLocation?: string;
}

export function MissionPackingList({ missionId, missionTitle, missionMateriel, missionDate, missionLocation }: Props) {
  const { data: checkouts = [] } = useEquipmentCheckouts(missionId);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const packingData = useMemo(() => {
    return missionMateriel.map((mm: any) => {
      const checkedOut = checkouts
        .filter((c: any) => c.materiel_id === mm.materiel_id && c.type === "checkout")
        .reduce((sum: number, c: any) => sum + c.quantity, 0);
      const checkedIn = checkouts
        .filter((c: any) => c.materiel_id === mm.materiel_id && c.type === "checkin")
        .reduce((sum: number, c: any) => sum + c.quantity, 0);

      return {
        id: mm.id,
        materiel_id: mm.materiel_id,
        name: mm.materiel?.name || "—",
        category: mm.materiel?.category || "Sans catégorie",
        quantity: mm.quantity,
        checkedOut,
        checkedIn,
        allOut: checkedOut >= mm.quantity,
        allBack: checkedIn >= mm.quantity,
      };
    });
  }, [missionMateriel, checkouts]);

  const totalItems = packingData.length;
  const allCheckedOut = packingData.every(p => p.allOut);
  const allCheckedIn = packingData.every(p => p.allBack);
  const progress = totalItems > 0 ? Math.round((checkedItems.size / totalItems) * 100) : 0;

  const toggleItem = (id: string) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDownloadTxt = () => {
    const lines = [
      `PACKING LIST — ${missionTitle}`,
      missionDate ? `Date: ${new Date(missionDate).toLocaleDateString("fr-FR")}` : "",
      missionLocation ? `Lieu: ${missionLocation}` : "",
      "═".repeat(50),
      "",
      ...packingData.map(p =>
        `[ ] ${p.name} — Qté: ${p.quantity}${p.category ? ` (${p.category})` : ""}`
      ),
      "",
      "═".repeat(50),
      `Total: ${totalItems} référence(s), ${packingData.reduce((s, p) => s + p.quantity, 0)} pièce(s)`,
    ].filter(Boolean);

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `packing-list-${missionTitle.replace(/[^a-zA-Z0-9]/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Group by category
  const grouped = useMemo(() => {
    const g: Record<string, typeof packingData> = {};
    packingData.forEach(p => {
      (g[p.category] ??= []).push(p);
    });
    return g;
  }, [packingData]);

  if (missionMateriel.length === 0) return null;

  return (
    <Card className="shadow-card border-border/50">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-info" /> Packing List
          </h3>
          <Button variant="outline" size="sm" className="gap-1.5 rounded-xl" onClick={handleDownloadTxt}>
            <Download className="h-3.5 w-3.5" /> Exporter
          </Button>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span>Pointage : {checkedItems.size}/{totalItems}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Status badges */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${allCheckedOut ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
            {allCheckedOut ? <><Check className="h-3 w-3 inline mr-1" />Tout sorti</> : "Sorties en cours"}
          </span>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${allCheckedIn ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
            {allCheckedIn ? <><Check className="h-3 w-3 inline mr-1" />Tout retourné</> : "Retours en cours"}
          </span>
        </div>

        {/* Items by category */}
        <div className="space-y-4">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">{cat}</p>
              <div className="space-y-1.5">
                {items.map(item => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border transition-colors cursor-pointer ${
                      checkedItems.has(item.id) ? "bg-success/5 border-success/30" : "bg-muted/20 border-border/50 hover:bg-muted/40"
                    }`}
                    onClick={() => toggleItem(item.id)}
                  >
                    <Checkbox
                      checked={checkedItems.has(item.id)}
                      onCheckedChange={() => toggleItem(item.id)}
                      className="shrink-0"
                    />
                    <Package className="h-4 w-4 text-warning shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${checkedItems.has(item.id) ? "line-through text-muted-foreground" : ""}`}>
                        {item.name}
                      </p>
                    </div>
                    <span className="text-xs tabular-nums text-muted-foreground shrink-0">×{item.quantity}</span>
                    <div className="flex gap-1 shrink-0">
                      {item.allOut ? (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-success/10 text-success">Sorti</span>
                      ) : item.checkedOut > 0 ? (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-warning/10 text-warning">{item.checkedOut}/{item.quantity}</span>
                      ) : null}
                      {item.allBack ? (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-info/10 text-info">Retourné</span>
                      ) : item.checkedIn > 0 ? (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{item.checkedIn}/{item.quantity}</span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
