import { useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMateriel, useMissions } from "@/hooks/use-data";
import { Camera, ScanLine, Check, X, Package, ArrowLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import BarcodeScanner from "@/components/BarcodeScanner";
import { toast } from "sonner";
import { useValidateMovement, useBatchMovement } from "@/hooks/use-movements";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const statusConfig: Record<string, { label: string; class: string }> = {
  disponible: { label: "Disponible", class: "bg-success/10 text-success" },
  en_mission: { label: "En mission", class: "bg-info/10 text-info" },
  maintenance: { label: "Maintenance", class: "bg-warning/10 text-warning" },
  hors_service: { label: "Hors service", class: "bg-destructive/10 text-destructive" },
};

/** Normalize string for accent-insensitive comparison */
const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export default function ScanMateriel() {
  const navigate = useNavigate();
  const { data: equipment = [] } = useMateriel();
  const { data: missions = [] } = useMissions();
  useRealtimeSync("materiel", [["materiel"]]);
  const [scannedItem, setScannedItem] = useState<Tables<"materiel"> | null>(null);
  const [scanLog, setScanLog] = useState<{ name: string; time: string; action: string }[]>([]);

  // Stock movement state
  const [missionDialogOpen, setMissionDialogOpen] = useState(false);
  const [movementType, setMovementType] = useState<"sortie" | "retour">("sortie");
  const [movementLoading, setMovementLoading] = useState(false);

  const validateMovement = useValidateMovement();
  const batchMovement = useBatchMovement();

  const handleScan = useCallback((code: string) => {
    const term = normalize(code);
    // Exact match on barcode / serial_number, partial + accent-insensitive on name
    const found = equipment.find(e =>
      (e.barcode && normalize(e.barcode) === term) ||
      (e.serial_number && normalize(e.serial_number) === term) ||
      normalize(e.name).includes(term)
    );

    if (found) {
      setScannedItem(found);
      setScanLog(prev => [
        { name: found.name, time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }), action: "Scanné" },
        ...prev,
      ]);
      // Haptic feedback for mobile
      if ("vibrate" in window.navigator) {
        window.navigator.vibrate(100);
      }
      toast.success(`Matériel identifié : ${found.name}`);
    } else {
      toast.error(`Aucun matériel trouvé pour "${code}"`);
    }
  }, [equipment]);

  const openMovementDialog = (type: "sortie" | "retour") => {
    if (!scannedItem) return;
    setMovementType(type);
    setMissionDialogOpen(true);
  };

  const handleMovement = async (mission: Tables<"missions">) => {
    if (!scannedItem) return;
    setMovementLoading(true);
    try {
      // Validate first
      const validation = await validateMovement.mutateAsync({
        materiel_id: scannedItem.id,
        mission_id: mission.id,
        type: movementType,
        quantity: 1,
      });

      if (!validation.valid) {
        toast.error(validation.error || "Mouvement invalide");
        setMovementLoading(false);
        return;
      }

      // Execute batch movement
      const result = await batchMovement.mutateAsync({
        mission_id: mission.id,
        type: movementType,
        items: [{ materiel_id: scannedItem.id, quantity: 1 }],
      });

      if (result.success) {
        const label = movementType === "sortie" ? "Sortie" : "Retour";
        toast.success(`${label} enregistré(e) pour ${scannedItem.name} → ${mission.title}`);
        setScanLog(prev => [
          { name: scannedItem.name, time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }), action: label },
          ...prev,
        ]);
      } else {
        toast.error(result.error || "Erreur lors du mouvement");
      }
    } catch (err) {
      toast.error((err as Error).message || "Erreur inattendue");
    } finally {
      setMovementLoading(false);
      setMissionDialogOpen(false);
    }
  };

  // Filter missions that allow movements
  const activeMissions = missions.filter(m =>
    ["planifiée", "confirmée", "en_cours"].includes(m.status)
  );

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl">
        <button onClick={() => navigate("/materiel")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Retour au matériel
        </button>

        <div>
          <h1 className="text-2xl font-display font-bold">Scanner matériel</h1>
          <p className="text-muted-foreground text-sm mt-1">Scannez un QR code ou code-barres pour identifier un équipement</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-card border-border/50 overflow-hidden">
            <CardContent className="p-4">
              <BarcodeScanner onScan={handleScan} />
            </CardContent>
          </Card>

          <div className="space-y-4">
            {scannedItem && (
              <Card className="shadow-card border-success/30 bg-success/5 animate-slide-up">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-success/10 text-success flex items-center justify-center shrink-0"><Package className="h-6 w-6" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{scannedItem.name}</h3>
                        <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", statusConfig[scannedItem.status]?.class)}>{statusConfig[scannedItem.status]?.label}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{scannedItem.category}</p>
                      <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                        {scannedItem.serial_number && <div><span className="text-muted-foreground">S/N :</span> <span className="font-medium">{scannedItem.serial_number}</span></div>}
                        {scannedItem.location && <div><span className="text-muted-foreground">Lieu :</span> <span className="font-medium">{scannedItem.location}</span></div>}
                        {scannedItem.rental_price && <div><span className="text-muted-foreground">Tarif :</span> <span className="font-medium">{scannedItem.rental_price}€/jour</span></div>}
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button size="sm" variant="outline" className="flex-1 h-12 rounded-xl gap-2 text-sm" onClick={() => navigate(`/materiel/${scannedItem.id}`)}>
                          <Package className="h-4 w-4" /> Détail
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 h-12 rounded-xl gap-2 text-sm" onClick={() => openMovementDialog("retour")}>
                          <Check className="h-4 w-4" /> Entrée
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 h-12 rounded-xl gap-2 text-sm" onClick={() => openMovementDialog("sortie")}>
                          <X className="h-4 w-4" /> Sortie
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="shadow-card border-border/50">
              <CardContent className="p-5">
                <h3 className="font-display font-semibold mb-4 flex items-center gap-2"><Camera className="h-4 w-4 text-primary" /> Historique des scans</h3>
                {scanLog.length === 0 ? (
                  <div className="text-center py-8">
                    <ScanLine className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Aucun scan effectué</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {scanLog.map((log, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-success" />
                          <span className="text-sm font-medium">{log.name}</span>
                          {log.action !== "Scanné" && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">{log.action}</span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">{log.time}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Mission selection dialog for stock movements */}
      <Dialog open={missionDialogOpen} onOpenChange={setMissionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{movementType === "sortie" ? "Sortie stock" : "Entrée stock"}</DialogTitle>
            <DialogDescription>
              Sélectionnez la mission associée à ce mouvement pour <strong>{scannedItem?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          {movementLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : activeMissions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Aucune mission active disponible</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {activeMissions.map(mission => (
                <button
                  key={mission.id}
                  onClick={() => handleMovement(mission)}
                  className="w-full text-left p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors"
                >
                  <p className="font-medium text-sm">{mission.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {mission.status} · {mission.location || "—"}
                  </p>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
