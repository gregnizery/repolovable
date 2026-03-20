/* eslint-disable @typescript-eslint/no-explicit-any */
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMateriel, useDeleteMateriel, useMaterielMissions, useStockMovements, useCreateStockMovement } from "@/hooks/use-data";
import { useUserRole, canEdit } from "@/hooks/use-user-role";
import { ArrowLeft, Edit, Trash2, Package, MapPin, Hash, Barcode, DollarSign, Calendar, Loader2, Briefcase, ArrowDownCircle, ArrowUpCircle, Plus, QrCode, Download, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useRef, useCallback } from "react";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import QRCode from "qrcode";
import { Users } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

const statusConfig: Record<string, { label: string; class: string }> = {
  disponible: { label: "Disponible", class: "bg-success/10 text-success" },
  en_mission: { label: "En mission", class: "bg-info/10 text-info" },
  maintenance: { label: "Maintenance", class: "bg-warning/10 text-warning" },
  hors_service: { label: "Hors service", class: "bg-destructive/10 text-destructive" },
};

function getActiveMission(eq: any) {
  if (!eq.mission_materiel || eq.mission_materiel.length === 0) return null;
  const activeMissions = eq.mission_materiel
    .map((mm: any) => mm.missions)
    .filter((m: any) => m && (m.status === "en_cours" || m.status === "planifiée") && m.end_date);
  if (activeMissions.length === 0) return null;
  return activeMissions.sort((a: any, b: any) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime())[0];
}

const movementReasons = ["Achat", "Retour mission", "Prêt", "Mission", "Perte", "Casse", "Maintenance", "Autre"];

export default function MaterielDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: equipment = [], isLoading } = useMateriel();
  const { data: roleData } = useUserRole();
  const canEditMateriel = canEdit(roleData?.role, "materiel");
  const deleteMutation = useDeleteMateriel();
  const item = equipment.find(e => e.id === id);
  const { data: materielMissions = [] } = useMaterielMissions(id);
  const { data: movements = [] } = useStockMovements(id);
  const createMovement = useCreateStockMovement();
  const [movementDialog, setMovementDialog] = useState(false);
  const [mvType, setMvType] = useState<"entrée" | "sortie">("entrée");
  const [mvQty, setMvQty] = useState(1);
  const [mvReason, setMvReason] = useState("");
  const [mvNotes, setMvNotes] = useState("");
  const [qrDialog, setQrDialog] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  useRealtimeSync("materiel", [["materiel"]]);
  useRealtimeSync("stock_movements", [["stock_movements", id!]]);
  useRealtimeSync("mission_materiel", [["materiel_missions", id!]]);

  const handleShowQr = useCallback(async () => {
    const found = equipment.find(e => e.id === id);
    if (!found) return;
    const content = found.barcode || found.serial_number || found.id;
    try {
      const dataUrl = await QRCode.toDataURL(content, { width: 256, margin: 2 });
      setQrDataUrl(dataUrl);
      setQrDialog(true);
    } catch (e) {
      console.error(e);
    }
  }, [equipment, id]);

  const handleDownloadQr = useCallback(() => {
    if (!qrDataUrl) return;
    const found = equipment.find(e => e.id === id);
    if (!found) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `qr-${found.name.replace(/\s+/g, "-").toLowerCase()}.png`;
    a.click();
  }, [qrDataUrl, equipment, id]);

  const handlePrintQr = useCallback(() => {
    const printWindow = window.open("", "_blank");
    if (!printWindow || !qrDataUrl || !item) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Imprimer QR - ${item.name}</title>
          <style>
            body { 
              display: flex; 
              flex-direction: column; 
              align-items: center; 
              justify-content: center; 
              height: 100vh; 
              margin: 0; 
              font-family: sans-serif;
            }
            .label {
              border: 1px solid #eee;
              padding: 20px;
              text-align: center;
              width: 250px;
            }
            img { width: 200px; height: 200px; }
            .name { font-weight: bold; margin-top: 10px; font-size: 16px; }
            .id { font-family: monospace; font-size: 10px; color: #666; margin-top: 5px; }
            @media print {
              body { height: auto; }
              .label { border: none; }
            }
          </style>
        </head>
        <body>
          <div class="label">
            <img src="${qrDataUrl}" />
            <div class="name">${item.name}</div>
            <div class="id">${item.barcode || item.serial_number || item.id}</div>
          </div>
          <script>
            setTimeout(() => {
              window.print();
              window.close();
            }, 500);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }, [qrDataUrl, item]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-4 max-w-4xl">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!item) {
    return (
      <AppLayout>
        <div className="p-12 text-center text-muted-foreground">Équipement introuvable</div>
      </AppLayout>
    );
  }

  const sc = statusConfig[item.status];

  const handleDelete = () => {
    deleteMutation.mutate(item.id, {
      onSuccess: () => navigate("/materiel"),
    });
  };

  const handleAddMovement = () => {
    createMovement.mutate(
      { materiel_id: id!, type: mvType, quantity: mvQty, reason: mvReason || undefined, notes: mvNotes || undefined },
      {
        onSuccess: () => {
          setMovementDialog(false);
          setMvQty(1);
          setMvReason("");
          setMvNotes("");
        },
      }
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl">
        <button onClick={() => navigate("/materiel")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Retour au matériel
        </button>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-display font-bold">{item.name}</h1>
              <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", sc?.class)}>{sc?.label}</span>
              {(item as any).is_b2b_shared && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Partagé B2B
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-sm">{item.category || "Sans catégorie"} · Ajouté le {new Date(item.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
          {canEditMateriel && (
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" className="gap-2 rounded-xl" onClick={() => navigate(`/materiel/${id}/modifier`)}>
                <Edit className="h-4 w-4" /> Modifier
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="gap-2 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" /> Supprimer
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer cet équipement ?</AlertDialogTitle>
                    <AlertDialogDescription>Cette action est irréversible. L'équipement « {item.name} » sera définitivement supprimé.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl">Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Supprimer"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-card border-border/50">
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center gap-4">
                  <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", (item as any).is_subrented ? "bg-accent/15 text-accent" : "bg-warning/10 text-warning")}>
                    {(item as any).is_subrented ? <Users className="h-7 w-7" /> : <Package className="h-7 w-7" />}
                  </div>
                  <div>
                    <h2 className="text-xl font-display font-bold">{item.name}</h2>
                    <p className="text-sm text-muted-foreground">{item.category}</p>
                  </div>
                </div>

                {item.description && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Description</p>
                    <p className="text-sm text-foreground">{item.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <InfoBlock icon={Hash} label="N° de série" value={item.serial_number} />
                  <InfoBlock icon={Barcode} label="Code-barres" value={item.barcode} />
                  <InfoBlock icon={MapPin} label="Emplacement" value={(item as any).is_subrented ? ((item as any).suppliers?.name || "Sous-location") : ((item as any).storage_locations?.name || item.location)} />
                  <InfoBlock icon={Package} label="Quantité" value={String(item.quantity)} />

                  {(item as any).is_subrented ? (
                    <>
                      <InfoBlock icon={DollarSign} label="Coût sous-loc / jour" value={(item as any).subrent_cost ? `${(item as any).subrent_cost} €` : null} />
                      <InfoBlock icon={DollarSign} label="Location / jour" value={item.rental_price ? `${item.rental_price} €` : null} />
                    </>
                  ) : (
                    <>
                      <InfoBlock icon={DollarSign} label="Prix d'achat" value={item.purchase_price ? `${item.purchase_price} €` : null} />
                      <InfoBlock icon={DollarSign} label="Location / jour" value={item.rental_price ? `${item.rental_price} €` : null} />
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {item.notes && (
              <Card className="shadow-card border-border/50">
                <CardContent className="p-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Notes</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{item.notes}</p>
                </CardContent>
              </Card>
            )}

            {(() => {
              if (item.status !== "en_mission") return null;
              const activeMission = getActiveMission(item);
              if (!activeMission || !activeMission.end_date) return null;
              const endDate = new Date(activeMission.end_date);
              const today = new Date();
              const diffDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              return (
                <Card className="shadow-card border-info/20 bg-info/5">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-info/10 text-info flex items-center justify-center shrink-0">
                        <CalendarDays className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-semibold text-info mb-1">Actuellement en mission</p>
                        <p className="text-sm text-foreground mb-3">
                          Affecté à : <button onClick={() => navigate(`/missions/${activeMission.id}`)} className="font-medium hover:underline text-primary">{activeMission.title}</button>
                        </p>
                        <div className="flex gap-6">
                          <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground">Retour prévu</span>
                            <span className="font-medium">{endDate.toLocaleDateString("fr-FR")}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground">Disponibilité</span>
                            <span className="font-medium text-info">
                              {diffDays > 0
                                ? `Dans ${diffDays} jour${diffDays > 1 ? "s" : ""}`
                                : diffDays === 0
                                  ? "Demain"
                                  : "Maintenant (théoriquement)"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            {/* Missions associées */}
            {materielMissions.length > 0 && (
              <Card className="shadow-card border-border/50">
                <CardContent className="p-6">
                  <h3 className="font-display font-semibold flex items-center gap-2 mb-4"><Briefcase className="h-4 w-4 text-primary" /> Missions associées</h3>
                  <div className="space-y-2">
                    {materielMissions.map((mm: any) => (
                      <div key={mm.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate(`/missions/${mm.mission_id}`)}>
                        <Briefcase className="h-4 w-4 text-primary shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between items-start">
                            <p className="font-medium text-sm truncate">{mm.missions?.title}</p>
                            {(item.tracking_type === "batch" || mm.quantity > 1) && (
                              <span className="text-xs font-semibold px-2 py-0.5 bg-background rounded-md border border-border shrink-0 ml-2">Qté: {mm.quantity}</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {mm.missions?.start_date ? (
                              mm.missions?.end_date
                                ? `Du ${new Date(mm.missions.start_date).toLocaleString("fr-FR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).replace(" à", " -")} au ${new Date(mm.missions.end_date).toLocaleString("fr-FR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).replace(" à", " -")}`
                                : `Le ${new Date(mm.missions.start_date).toLocaleString("fr-FR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).replace(" à", " -")}`
                            ) : "Dates non définies"} · <span className={cn("px-1.5 py-0.5 rounded text-[10px]", statusConfig[mm.missions?.status]?.class || "")}>{mm.missions?.status}</span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Historique des mouvements */}
            <Card className="shadow-card border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-semibold flex items-center gap-2">
                    <ArrowDownCircle className="h-4 w-4 text-success" /> Historique des mouvements
                  </h3>
                  {canEditMateriel && (
                    <Dialog open={movementDialog} onOpenChange={setMovementDialog}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1.5 rounded-xl"><Plus className="h-3.5 w-3.5" /> Mouvement</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Enregistrer un mouvement</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="flex gap-2">
                            <button onClick={() => setMvType("entrée")} className={cn("flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border transition-colors text-sm font-medium", mvType === "entrée" ? "border-success bg-success/10 text-success" : "border-border text-muted-foreground hover:bg-muted/50")}>
                              <ArrowDownCircle className="h-4 w-4" /> Entrée
                            </button>
                            <button onClick={() => setMvType("sortie")} className={cn("flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border transition-colors text-sm font-medium", mvType === "sortie" ? "border-destructive bg-destructive/10 text-destructive" : "border-border text-muted-foreground hover:bg-muted/50")}>
                              <ArrowUpCircle className="h-4 w-4" /> Sortie
                            </button>
                          </div>
                          <div className="space-y-2">
                            <Label>Quantité</Label>
                            <Input type="number" min={1} value={mvQty} onChange={e => setMvQty(Math.max(1, parseInt(e.target.value) || 1))} className="h-11 rounded-xl" />
                          </div>
                          <div className="space-y-2">
                            <Label>Raison</Label>
                            <select value={mvReason} onChange={e => setMvReason(e.target.value)} className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm">
                              <option value="">Sélectionner...</option>
                              {movementReasons.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label>Notes</Label>
                            <textarea value={mvNotes} onChange={e => setMvNotes(e.target.value)} placeholder="Notes optionnelles..." rows={2} className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                          </div>
                          <Button className="w-full gradient-primary text-white rounded-xl" onClick={handleAddMovement} disabled={createMovement.isPending}>
                            {createMovement.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Enregistrer
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>

                {movements.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucun mouvement enregistré.</p>
                ) : (
                  <div className="space-y-2">
                    {movements.map((mv: any) => (
                      <div key={mv.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                        {mv.type === "entrée" ? (
                          <ArrowDownCircle className="h-5 w-5 text-success shrink-0" />
                        ) : (
                          <ArrowUpCircle className="h-5 w-5 text-destructive shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn("text-sm font-semibold", mv.type === "entrée" ? "text-success" : "text-destructive")}>
                              {mv.type === "entrée" ? "+" : "-"}{mv.quantity}
                            </span>
                            {mv.reason && <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{mv.reason}</span>}
                          </div>
                          {mv.notes && <p className="text-xs text-muted-foreground mt-0.5 truncate">{mv.notes}</p>}
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {new Date(mv.movement_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            {canEditMateriel && (
              <Card className="shadow-card border-border/50">
                <CardContent className="p-5 space-y-3">
                  <h3 className="font-display font-semibold">Actions rapides</h3>
                  <Button variant="outline" className="w-full gap-2 rounded-xl justify-start" onClick={() => navigate(`/materiel/${id}/modifier`)}>
                    <Edit className="h-4 w-4 text-primary" /> Modifier
                  </Button>
                  <Button variant="outline" className="w-full gap-2 rounded-xl justify-start" onClick={handleShowQr}>
                    <QrCode className="h-4 w-4 text-primary" /> Générer QR code
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="w-full gap-2 rounded-xl justify-start text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" /> Supprimer
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer cet équipement ?</AlertDialogTitle>
                        <AlertDialogDescription>Cette action est irréversible. L'équipement « {item.name} » sera définitivement supprimé.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            )}

            <Card className="shadow-card border-border/50">
              <CardContent className="p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Dates</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Créé le {new Date(item.created_at).toLocaleDateString("fr-FR")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Modifié le {new Date(item.updated_at).toLocaleDateString("fr-FR")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={qrDialog} onOpenChange={setQrDialog}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><QrCode className="h-4 w-4" /> QR Code — {item.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            {qrDataUrl && (
              <img src={qrDataUrl} alt={`QR code ${item.name}`} className="rounded-xl border border-border/50 w-48 h-48" />
            )}
            <p className="text-xs text-muted-foreground text-center">
              Code encodé : <span className="font-mono font-medium">{item.barcode || item.serial_number || item.id}</span>
            </p>
            <div className="grid grid-cols-2 gap-2 w-full">
              <Button onClick={handleDownloadQr} variant="outline" className="gap-2 rounded-xl">
                <Download className="h-4 w-4" /> PNG
              </Button>
              <Button onClick={handlePrintQr} className="gap-2 rounded-xl gradient-primary text-white">
                <QrCode className="h-4 w-4" /> Imprimer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function InfoBlock({ icon: Icon, label, value }: { icon: typeof Hash; label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}
