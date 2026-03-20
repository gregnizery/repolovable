import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMissions, useMateriel } from "@/hooks/use-data";
import { useValidateMovement, useBatchMovement } from "@/hooks/use-movements";
import { useQueryClient } from "@tanstack/react-query";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import {
  ArrowLeft, ScanLine, Package, Check, X, AlertTriangle,
  Loader2, Trash2, Send, ArrowDownToLine, ArrowUpFromLine, Camera,
} from "lucide-react";
import BarcodeScanner from "@/components/BarcodeScanner";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface BatchItem {
  id: string; // local key
  materiel_id: string;
  materiel_name: string;
  quantity: number;
  status: "pending" | "validating" | "valid" | "error";
  error?: string;
  max_quantity?: number;
}

export default function BatchMovements() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: missions = [] } = useMissions();
  const { data: equipment = [] } = useMateriel();
  useRealtimeSync("materiel", [["materiel"]]);
  useRealtimeSync("stock_movements", [["stock_movements"]]);
  useRealtimeSync("mission_materiel", [["mission_materiel"]]);

  const [missionId, setMissionId] = useState("");
  const [type, setType] = useState<"sortie" | "retour">("sortie");
  const [items, setItems] = useState<BatchItem[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [isCommitting, setIsCommitting] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const validateMutation = useValidateMovement();
  const batchMutation = useBatchMovement();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const activeMissions = missions.filter(m =>
    ["planifiée", "confirmée", "en_cours"].includes(m.status)
  );

  // Handle scan from camera
  const handleCameraScan = useCallback((code: string) => {
    const term = code.trim().toLowerCase();
    const found = equipment.find(e =>
      e.barcode?.toLowerCase() === term ||
      e.serial_number?.toLowerCase() === term ||
      e.name.toLowerCase() === term
    );

    if (!found) {
      toast.error(`Aucun matériel trouvé pour "${code}"`);
      return;
    }

    if (items.some(i => i.materiel_id === found.id)) {
      toast.warning("Ce matériel est déjà dans le lot");
      return;
    }

    const newItem: BatchItem = {
      id: crypto.randomUUID(),
      materiel_id: found.id,
      materiel_name: found.name,
      quantity: 1,
      status: "pending",
    };

    setItems(prev => [...prev, newItem]);
    toast.success(`Ajouté : ${found.name}`);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      validateItem(newItem.id, found.id, 1);
    }, 180);
  }, [equipment, items]);

  // Add item by search (code-barres, serial, or name)
  const addItem = useCallback(() => {
    if (!searchInput.trim() || !missionId) return;
    const term = searchInput.trim().toLowerCase();
    const found = equipment.find(e =>
      e.barcode?.toLowerCase() === term ||
      e.serial_number?.toLowerCase() === term ||
      e.name.toLowerCase() === term
    );

    if (!found) {
      toast.error(`Aucun matériel trouvé pour "${searchInput}"`);
      return;
    }

    if (items.some(i => i.materiel_id === found.id)) {
      toast.warning("Ce matériel est déjà dans le lot");
      return;
    }

    const newItem: BatchItem = {
      id: crypto.randomUUID(),
      materiel_id: found.id,
      materiel_name: found.name,
      quantity: 1,
      status: "pending",
    };

    setItems(prev => [...prev, newItem]);
    setSearchInput("");

    // Debounced live validation
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      validateItem(newItem.id, found.id, 1);
    }, 180);
  }, [searchInput, missionId, equipment, items]);

  const validateItem = useCallback(async (localId: string, materielId: string, quantity: number) => {
    setItems(prev => prev.map(i =>
      i.id === localId ? { ...i, status: "validating" as const } : i
    ));

    try {
      const result = await validateMutation.mutateAsync({
        materiel_id: materielId,
        mission_id: missionId,
        type,
        quantity,
      });

      setItems(prev => prev.map(i =>
        i.id === localId
          ? result.valid
            ? { ...i, status: "valid" as const, error: undefined, max_quantity: result.max_quantity }
            : { ...i, status: "error" as const, error: result.error }
          : i
      ));
    } catch (err) {
      setItems(prev => prev.map(i =>
        i.id === localId
          ? { ...i, status: "error" as const, error: (err as Error).message }
          : i
      ));
    }
  }, [missionId, type, validateMutation]);

  const updateQuantity = useCallback((localId: string, qty: number) => {
    const item = items.find(i => i.id === localId);
    if (!item) return;

    setItems(prev => prev.map(i =>
      i.id === localId ? { ...i, quantity: qty, status: "pending" as const } : i
    ));

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      validateItem(localId, item.materiel_id, qty);
    }, 180);
  }, [items, validateItem]);

  const removeItem = useCallback((localId: string) => {
    setItems(prev => prev.filter(i => i.id !== localId));
  }, []);

  const revalidateAll = useCallback(() => {
    items.forEach(item => {
      validateItem(item.id, item.materiel_id, item.quantity);
    });
  }, [items, validateItem]);

  const allValid = items.length > 0 && items.every(i => i.status === "valid");

  const commitBatch = useCallback(async () => {
    if (!allValid || !missionId) return;
    setIsCommitting(true);

    try {
      const result = await batchMutation.mutateAsync({
        mission_id: missionId,
        type,
        items: items.map(i => ({ materiel_id: i.materiel_id, quantity: i.quantity })),
      });

      if (result.success) {
        toast.success(`${type === "sortie" ? "Sortie" : "Retour"} batch réussi — ${result.count} mouvements`);
        queryClient.invalidateQueries({ queryKey: ["stock_movements"] });
        queryClient.invalidateQueries({ queryKey: ["materiel"] });
        setItems([]);
      } else {
        toast.error(result.error || "Erreur lors du commit");
        if (result.details) {
          result.details.forEach(d => {
            setItems(prev => prev.map(i =>
              i.materiel_id === d.materiel_id
                ? { ...i, status: "error" as const, error: d.error }
                : i
            ));
          });
        }
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsCommitting(false);
    }
  }, [allValid, missionId, type, items, batchMutation, queryClient]);

  const selectedMission = missions.find(m => m.id === missionId);

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl">
        <button onClick={() => navigate("/materiel")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Retour au matériel
        </button>

        <div>
          <h1 className="text-2xl font-display font-bold">Mouvements batch</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Sortie ou retour de matériel par lot — validation live avant commit
          </p>
        </div>

        {/* Config */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Mission</label>
            <Select value={missionId} onValueChange={(v) => { setMissionId(v); setItems([]); }}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Sélectionner une mission" />
              </SelectTrigger>
              <SelectContent>
                {activeMissions.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.title} — {m.status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Type de mouvement</label>
            <div className="flex gap-2">
              <Button
                variant={type === "sortie" ? "default" : "outline"}
                className={cn("flex-1 rounded-xl gap-2", type === "sortie" && "gradient-primary text-white")}
                onClick={() => { setType("sortie"); setItems([]); }}
              >
                <ArrowUpFromLine className="h-4 w-4" /> Sortie
              </Button>
              <Button
                variant={type === "retour" ? "default" : "outline"}
                className={cn("flex-1 rounded-xl gap-2", type === "retour" && "bg-success text-success-foreground hover:bg-success/90")}
                onClick={() => { setType("retour"); setItems([]); }}
              >
                <ArrowDownToLine className="h-4 w-4" /> Retour
              </Button>
            </div>
          </div>
        </div>

        {/* Scan input */}
        {missionId && (
          <Card className="shadow-card border-border/50">
            <CardContent className="p-4 space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Code-barres, N° série ou nom..."
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addItem()}
                    className="pl-10 h-10 rounded-xl"
                    autoFocus
                  />
                </div>
                <Button onClick={addItem} className="rounded-xl gap-2" variant="outline">
                  <Package className="h-4 w-4" /> Ajouter
                </Button>
                <Button
                  onClick={() => setShowScanner(!showScanner)}
                  variant={showScanner ? "default" : "outline"}
                  className={cn("rounded-xl gap-2", showScanner && "gradient-primary text-white")}
                >
                  <Camera className="h-4 w-4" /> {showScanner ? "Fermer" : "Scanner"}
                </Button>
              </div>

              {showScanner && (
                <BarcodeScanner
                  onScan={handleCameraScan}
                  onClose={() => setShowScanner(false)}
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* Items list */}
        {items.length > 0 && (
          <Card className="shadow-card border-border/50">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  {items.length} élément{items.length > 1 ? "s" : ""} dans le lot
                </h3>
                <Button variant="ghost" size="sm" className="text-xs" onClick={revalidateAll}>
                  Revalider tout
                </Button>
              </div>

              <div className="space-y-2">
                {items.map(item => (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border transition-all",
                      item.status === "valid" && "border-success/30 bg-success/5",
                      item.status === "error" && "border-destructive/30 bg-destructive/5",
                      item.status === "validating" && "border-warning/30 bg-warning/5",
                      item.status === "pending" && "border-border bg-muted/20",
                    )}
                  >
                    {/* Status icon */}
                    <div className="shrink-0">
                      {item.status === "valid" && <Check className="h-5 w-5 text-success" />}
                      {item.status === "error" && <AlertTriangle className="h-5 w-5 text-destructive" />}
                      {item.status === "validating" && <Loader2 className="h-5 w-5 text-warning animate-spin" />}
                      {item.status === "pending" && <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.materiel_name}</p>
                      {item.error && <p className="text-xs text-destructive mt-0.5">{item.error}</p>}
                      {item.status === "valid" && item.max_quantity !== undefined && (
                        <p className="text-xs text-muted-foreground mt-0.5">Max: {item.max_quantity}</p>
                      )}
                    </div>

                    {/* Quantity */}
                    <Input
                      type="number"
                      min={1}
                      max={item.max_quantity || 999}
                      value={item.quantity}
                      onChange={e => updateQuantity(item.id, Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20 h-8 rounded-lg text-center text-sm"
                    />

                    {/* Remove */}
                    <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Commit button */}
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div className="text-sm text-muted-foreground">
                  {selectedMission && <span>Mission : <strong>{selectedMission.title}</strong></span>}
                </div>
                <Button
                  onClick={commitBatch}
                  disabled={!allValid || isCommitting}
                  className={cn(
                    "rounded-xl gap-2",
                    type === "sortie" ? "gradient-primary text-white hover:opacity-90" : "bg-success text-success-foreground hover:bg-success/90"
                  )}
                >
                  {isCommitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Traitement...</>
                  ) : (
                    <><Send className="h-4 w-4" /> Valider {type === "sortie" ? "la sortie" : "le retour"} ({items.length})</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {missionId && items.length === 0 && (
          <div className="text-center py-12">
            <ScanLine className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              Scannez ou saisissez un code-barres pour commencer
            </p>
          </div>
        )}

        {!missionId && (
          <div className="text-center py-12">
            <AlertTriangle className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              Sélectionnez une mission pour commencer les mouvements
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
