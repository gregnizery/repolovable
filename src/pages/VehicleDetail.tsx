import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useVehicles, useUpdateVehicle } from "@/hooks/use-vehicles";
import { useVehicleCosts, useCreateVehicleCost, useDeleteVehicleCost } from "@/hooks/use-vehicle-costs";
import { useVehicleMissions } from "@/hooks/use-vehicle-missions";
import { useUserRole, canEdit } from "@/hooks/use-user-role";
import {
  ArrowLeft, Truck, Shield, Wrench, CalendarIcon, Fuel, MapPin,
  Plus, Trash2, AlertTriangle, CheckCircle, History, DollarSign, Loader2,
} from "lucide-react";
import { format, parseISO, differenceInDays, isPast } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const costCategories = [
  { value: "carburant", label: "Carburant", icon: Fuel },
  { value: "entretien", label: "Entretien", icon: Wrench },
  { value: "assurance", label: "Assurance", icon: Shield },
  { value: "controle_technique", label: "Contrôle technique", icon: CheckCircle },
  { value: "reparation", label: "Réparation", icon: Wrench },
  { value: "autre", label: "Autre", icon: DollarSign },
];

const statusConfig: Record<string, { label: string; class: string }> = {
  disponible: { label: "Disponible", class: "bg-success/10 text-success" },
  en_mission: { label: "En mission", class: "bg-warning/10 text-warning" },
  maintenance: { label: "Maintenance", class: "bg-destructive/10 text-destructive" },
  hors_service: { label: "Hors service", class: "bg-muted text-muted-foreground" },
};

const transportTypeLabels: Record<string, string> = {
  livraison: "Livraison",
  recuperation: "Récupération",
};

function ExpiryBadge({ date, label }: { date: string | null; label: string }) {
  if (!date) return <span className="text-xs text-muted-foreground">Non renseigné</span>;
  const d = parseISO(date);
  const daysLeft = differenceInDays(d, new Date());
  const expired = isPast(d);
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm">{format(d, "dd MMM yyyy", { locale: fr })}</span>
      {expired ? (
        <Badge variant="destructive" className="text-[10px] gap-1">
          <AlertTriangle className="h-3 w-3" /> Expiré
        </Badge>
      ) : daysLeft <= 30 ? (
        <Badge className="text-[10px] gap-1 bg-warning/10 text-warning border-warning/30">
          <AlertTriangle className="h-3 w-3" /> {daysLeft}j restants
        </Badge>
      ) : (
        <Badge variant="outline" className="text-[10px] gap-1 text-success">
          <CheckCircle className="h-3 w-3" /> Valide
        </Badge>
      )}
    </div>
  );
}

export default function VehicleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: vehicles = [], isLoading } = useVehicles();
  const { data: costs = [], isLoading: costsLoading } = useVehicleCosts(id || "");
  const { data: missions = [], isLoading: missionsLoading } = useVehicleMissions(id || "");
  const { data: roleData } = useUserRole();
  const canManage = canEdit(roleData?.role, "materiel");
  const updateVehicle = useUpdateVehicle();
  const createCost = useCreateVehicleCost();
  const deleteCost = useDeleteVehicleCost();

  const vehicle = vehicles.find((v: any) => v.id === id);

  const [costOpen, setCostOpen] = useState(false);
  const [costForm, setCostForm] = useState({ amount: "", category: "carburant", description: "", notes: "", cost_date: format(new Date(), "yyyy-MM-dd") });
  const [insuranceDate, setInsuranceDate] = useState<Date | undefined>();
  const [ctDate, setCtDate] = useState<Date | undefined>();
  const [mileage, setMileage] = useState("");
  const [editingDates, setEditingDates] = useState(false);

  if (isLoading) {
    return <AppLayout><div className="space-y-4 max-w-4xl"><Skeleton className="h-10 w-48" /><Skeleton className="h-64 w-full rounded-xl" /></div></AppLayout>;
  }

  if (!vehicle) {
    return <AppLayout><div className="text-center py-12"><p className="text-muted-foreground">Véhicule non trouvé</p><Button variant="outline" className="mt-4" onClick={() => navigate("/vehicules")}>Retour</Button></div></AppLayout>;
  }

  const sc = statusConfig[vehicle.status] || statusConfig.disponible;
  const totalCosts = costs.reduce((s: number, c: any) => s + Number(c.amount), 0);

  const handleSaveDates = async () => {
    await updateVehicle.mutateAsync({
      id: vehicle.id,
      ...(insuranceDate ? { insurance_expiry: format(insuranceDate, "yyyy-MM-dd") } : {}),
      ...(ctDate ? { ct_expiry: format(ctDate, "yyyy-MM-dd") } : {}),
      ...(mileage ? { mileage: parseInt(mileage) } : {}),
    });
    setEditingDates(false);
  };

  const handleAddCost = async () => {
    await createCost.mutateAsync({
      vehicle_id: vehicle.id,
      amount: parseFloat(costForm.amount),
      category: costForm.category,
      description: costForm.description || undefined,
      notes: costForm.notes || undefined,
      cost_date: costForm.cost_date,
    });
    setCostForm({ amount: "", category: "carburant", description: "", notes: "", cost_date: format(new Date(), "yyyy-MM-dd") });
    setCostOpen(false);
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => navigate("/vehicules")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-display font-bold">{vehicle.name}</h1>
                <p className="text-xs text-muted-foreground">
                  {vehicle.type}{vehicle.plate_number && ` · ${vehicle.plate_number}`}{vehicle.capacity && ` · ${vehicle.capacity}`}
                </p>
              </div>
              <Badge variant="outline" className={cn("shrink-0", sc.class)}>{sc.label}</Badge>
            </div>
          </div>
        </div>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-3 rounded-xl">
            <TabsTrigger value="info" className="rounded-lg gap-1.5 text-xs">
              <Shield className="h-3.5 w-3.5" /> Infos & Documents
            </TabsTrigger>
            <TabsTrigger value="costs" className="rounded-lg gap-1.5 text-xs">
              <DollarSign className="h-3.5 w-3.5" /> Coûts
            </TabsTrigger>
            <TabsTrigger value="missions" className="rounded-lg gap-1.5 text-xs">
              <History className="h-3.5 w-3.5" /> Missions
            </TabsTrigger>
          </TabsList>

          {/* INFO TAB */}
          <TabsContent value="info" className="space-y-4 mt-4">
            <Card className="shadow-card border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Assurance & Contrôle technique</CardTitle>
                  {canManage && !editingDates && (
                    <Button size="sm" variant="outline" className="rounded-lg text-xs h-7" onClick={() => {
                      setInsuranceDate(vehicle.insurance_expiry ? parseISO(vehicle.insurance_expiry) : undefined);
                      setCtDate(vehicle.ct_expiry ? parseISO(vehicle.ct_expiry) : undefined);
                      setMileage(vehicle.mileage?.toString() || "");
                      setEditingDates(true);
                    }}>
                      Modifier
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {editingDates ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Expiration assurance</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-full justify-start text-left font-normal rounded-xl text-sm", !insuranceDate && "text-muted-foreground")}>
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {insuranceDate ? format(insuranceDate, "dd/MM/yyyy") : "Sélectionner"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={insuranceDate} onSelect={setInsuranceDate} className="p-3 pointer-events-auto" />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Expiration CT</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-full justify-start text-left font-normal rounded-xl text-sm", !ctDate && "text-muted-foreground")}>
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {ctDate ? format(ctDate, "dd/MM/yyyy") : "Sélectionner"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={ctDate} onSelect={setCtDate} className="p-3 pointer-events-auto" />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Kilométrage</Label>
                      <Input value={mileage} onChange={(e) => setMileage(e.target.value)} className="rounded-xl" placeholder="Ex: 45000" type="number" />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" className="rounded-lg" onClick={() => setEditingDates(false)}>Annuler</Button>
                      <Button size="sm" className="rounded-lg" onClick={handleSaveDates} disabled={updateVehicle.isPending}>
                        {updateVehicle.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-2"><Shield className="h-4 w-4" /> Assurance</span>
                      <ExpiryBadge date={vehicle.insurance_expiry} label="Assurance" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-2"><CheckCircle className="h-4 w-4" /> Contrôle technique</span>
                      <ExpiryBadge date={vehicle.ct_expiry} label="CT" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-2"><Truck className="h-4 w-4" /> Kilométrage</span>
                      <span className="text-sm font-medium">{vehicle.mileage ? `${vehicle.mileage.toLocaleString("fr-FR")} km` : "Non renseigné"}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {vehicle.notes && (
              <Card className="shadow-card border-border/50">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
                <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{vehicle.notes}</p></CardContent>
              </Card>
            )}
          </TabsContent>

          {/* COSTS TAB */}
          <TabsContent value="costs" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total des coûts</p>
                <p className="text-2xl font-bold">{totalCosts.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</p>
              </div>
              {canManage && (
                <Dialog open={costOpen} onOpenChange={setCostOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="rounded-xl gap-1.5"><Plus className="h-4 w-4" /> Ajouter un coût</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>Nouveau coût</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Montant *</Label>
                          <Input type="number" step="0.01" value={costForm.amount} onChange={(e) => setCostForm(f => ({ ...f, amount: e.target.value }))} className="rounded-xl" placeholder="0.00" />
                        </div>
                        <div className="space-y-2">
                          <Label>Catégorie</Label>
                          <Select value={costForm.category} onValueChange={(v) => setCostForm(f => ({ ...f, category: v }))}>
                            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {costCategories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Date</Label>
                        <Input type="date" value={costForm.cost_date} onChange={(e) => setCostForm(f => ({ ...f, cost_date: e.target.value }))} className="rounded-xl" />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Input value={costForm.description} onChange={(e) => setCostForm(f => ({ ...f, description: e.target.value }))} className="rounded-xl" placeholder="Ex: Plein diesel" />
                      </div>
                      <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea value={costForm.notes} onChange={(e) => setCostForm(f => ({ ...f, notes: e.target.value }))} className="rounded-xl" rows={2} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" className="rounded-xl" onClick={() => setCostOpen(false)}>Annuler</Button>
                      <Button className="rounded-xl" onClick={handleAddCost} disabled={createCost.isPending || !costForm.amount}>
                        {createCost.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ajouter"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {costsLoading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
            ) : costs.length === 0 ? (
              <Card className="shadow-card border-border/50">
                <CardContent className="p-8 text-center">
                  <DollarSign className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Aucun coût enregistré</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {costs.map((c: any) => {
                  const cat = costCategories.find(cc => cc.value === c.category);
                  const Icon = cat?.icon || DollarSign;
                  return (
                    <Card key={c.id} className="shadow-card border-border/50">
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{c.description || cat?.label || c.category}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {format(parseISO(c.cost_date), "dd MMM yyyy", { locale: fr })}
                              {c.notes && ` · ${c.notes}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-semibold">{Number(c.amount).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</span>
                          {canManage && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg text-destructive hover:text-destructive">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Supprimer ce coût ?</AlertDialogTitle>
                                  <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="rounded-xl">Annuler</AlertDialogCancel>
                                  <AlertDialogAction className="rounded-xl bg-destructive text-destructive-foreground" onClick={() => deleteCost.mutate({ id: c.id, vehicleId: vehicle.id })}>
                                    Supprimer
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* MISSIONS TAB */}
          <TabsContent value="missions" className="space-y-4 mt-4">
            {missionsLoading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
            ) : missions.length === 0 ? (
              <Card className="shadow-card border-border/50">
                <CardContent className="p-8 text-center">
                  <History className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Aucune mission associée</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {missions.map((tp: any) => {
                  const mission = tp.missions;
                  const missionStatus = mission?.status || "—";
                  return (
                    <Card
                      key={tp.id}
                      className="shadow-card border-border/50 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => mission?.id && navigate(`/missions/${mission.id}`)}
                    >
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                            tp.type === "livraison" ? "bg-accent/10" : "bg-warning/10"
                          )}>
                            <MapPin className={cn("h-4 w-4", tp.type === "livraison" ? "text-accent-foreground" : "text-warning")} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{mission?.title || "Mission"}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {transportTypeLabels[tp.type] || tp.type}
                              {tp.scheduled_at && ` · ${format(parseISO(tp.scheduled_at), "dd MMM yyyy HH:mm", { locale: fr })}`}
                              {mission?.clients?.name && ` · ${(mission.clients as any).name}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className="text-[10px]">{tp.status}</Badge>
                          <Badge variant="secondary" className="text-[10px]">{missionStatus}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
