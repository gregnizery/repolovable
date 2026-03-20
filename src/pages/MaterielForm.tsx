/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { useMateriel, useCreateMateriel, useUpdateMateriel, useStorageLocations, useSuppliers } from "@/hooks/use-data";

const categories = ["Son", "Lumière", "Vidéo", "Structure", "Câblage", "Mobilier", "Décoration", "Autre"];
const statuses = [
  { value: "disponible", label: "Disponible" },
  { value: "en_mission", label: "En mission" },
  { value: "maintenance", label: "Maintenance" },
  { value: "hors_service", label: "Hors service" },
];

export default function MaterielForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const { data: equipment = [] } = useMateriel();
  const createMutation = useCreateMateriel();
  const updateMutation = useUpdateMateriel();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [barcode, setBarcode] = useState("");
  const [storageLocationId, setStorageLocationId] = useState("");
  const { data: storageLocations = [] } = useStorageLocations();
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState("disponible");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [rentalPrice, setRentalPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [trackingType, setTrackingType] = useState<"unique" | "batch">("unique");
  const [isB2bShared, setIsB2bShared] = useState(false);

  const [isSubrented, setIsSubrented] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [subrentCost, setSubrentCost] = useState("");
  const { data: suppliers = [] } = useSuppliers();

  useEffect(() => {
    if (isEdit) {
      const item = equipment.find(e => e.id === id);
      if (item) {
        setName(item.name);
        setCategory(item.category || "");
        setDescription(item.description || "");
        setSerialNumber(item.serial_number || "");
        setBarcode(item.barcode || "");
         
        setStorageLocationId((item as any).storage_location_id || "");
        setQuantity(item.quantity);
        setStatus(item.status);
        setPurchasePrice(item.purchase_price?.toString() || "");
        setRentalPrice(item.rental_price?.toString() || "");
        setNotes(item.notes || "");
         
        setTrackingType((item as any).tracking_type || "unique");
         
        setIsB2bShared((item as any).is_b2b_shared || false);

         
        const subrented = (item as any).is_subrented || false;
        setIsSubrented(subrented);
         
        setSupplierId(subrented ? ((item as any).supplier_id || "") : "");
         
        setSubrentCost(subrented ? ((item as any).subrent_cost?.toString() || "") : "");
      }
    }
  }, [isEdit, id, equipment]);

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleTrackingTypeChange = (type: "unique" | "batch") => {
    setTrackingType(type);
    if (type === "unique") {
      setQuantity(1);
    } else {
      setSerialNumber("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = {
      name: name.trim(),
      category: category || null,
      description: description || null,
      serial_number: trackingType === "unique" ? (serialNumber || null) : null,
      storage_location_id: storageLocationId || null,
      status,
      purchase_price: purchasePrice ? Number(purchasePrice) : null,
      rental_price: rentalPrice ? Number(rentalPrice) : null,
      notes: notes || null,
      tracking_type: trackingType,
      is_b2b_shared: isB2bShared,
      is_subrented: isSubrented,
      supplier_id: isSubrented && supplierId !== "none" ? supplierId : null,
      subrent_cost: isSubrented && subrentCost ? Number(subrentCost) : 0,
    };

    if (isEdit) {
      updateMutation.mutate({ id, ...payload }, {
        onSuccess: () => navigate(`/materiel/${id}`),
      });
    } else {
      createMutation.mutate(payload, {
        onSuccess: (data) => navigate(`/materiel/${data.id}`),
      });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl">
        <button onClick={() => navigate("/materiel")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Retour au matériel
        </button>

        <div>
          <h1 className="text-2xl font-display font-bold">{isEdit ? "Modifier l'équipement" : "Nouveau matériel"}</h1>
          <p className="text-muted-foreground text-sm mt-1">{isEdit ? "Mettez à jour les informations" : "Ajoutez un nouvel équipement à votre inventaire"}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="shadow-card border-border/50">
            <CardContent className="p-6 space-y-6">
              <h3 className="font-display font-semibold">Informations générales</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nom de l'équipement *</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Enceinte JBL EON715" className="rounded-xl" required />
                </div>
                <div className="space-y-2">
                  <Label>Catégorie</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Description</Label>
                  <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description de l'équipement..." className="rounded-xl resize-none" rows={3} />
                </div>
              </div>

              <h3 className="font-display font-semibold pt-2">Identification & Suivi</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>Mode de suivi</Label>
                  <div className="flex gap-4 p-1 bg-muted/50 rounded-xl w-fit">
                    <button type="button" onClick={() => handleTrackingTypeChange("unique")} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${trackingType === "unique" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                      Matériel Unique
                    </button>
                    <button type="button" onClick={() => handleTrackingTypeChange("batch")} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${trackingType === "batch" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                      Lot / Vrac
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {trackingType === "unique" ? "Un équipement physique unique. La quantité sera toujours de 1." : "Un ensemble de câbles, chaises, etc. La quantité est modifiable."}
                  </p>
                </div>
                {trackingType === "unique" && (
                  <div className="space-y-2">
                    <Label>Numéro de série</Label>
                    <Input value={serialNumber} onChange={e => setSerialNumber(e.target.value)} placeholder="S/N" className="rounded-xl" />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Code-barres</Label>
                  <Input value={barcode} onChange={e => setBarcode(e.target.value)} placeholder="Code-barres / QR" className="rounded-xl" />
                </div>
              </div>

              <h3 className="font-display font-semibold pt-2">Stock & Localisation</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Quantité</Label>
                  <Input type="number" min={1} value={trackingType === "unique" ? 1 : quantity} onChange={e => setQuantity(Number(e.target.value))} disabled={trackingType === "unique"} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Statut</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {statuses.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Lieu de stockage</Label>
                  <Select value={storageLocationId} onValueChange={setStorageLocationId}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-muted-foreground italic">Aucun lieu assigné</SelectItem>
                      {storageLocations.map((loc: any) => (
                        <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <h3 className="font-display font-semibold pt-2">Tarification</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prix d'achat (€)</Label>
                  <Input type="number" step="0.01" min={0} value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} placeholder="0.00" className="rounded-xl" disabled={isSubrented} />
                </div>
                <div className="space-y-2">
                  <Label>Prix de location / jour (€)</Label>
                  <Input type="number" step="0.01" min={0} value={rentalPrice} onChange={e => setRentalPrice(e.target.value)} placeholder="0.00" className="rounded-xl" />
                </div>
              </div>

              <div className="border-t border-border/50 pt-6 mt-2">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-display font-semibold">Partage réseau B2B</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">Mettre ce matériel à disposition de mes partenaires dans le catalogue B2B ?</p>
                  </div>
                  <Switch checked={isB2bShared} onCheckedChange={setIsB2bShared} />
                </div>
              </div>

              <div className="border-t border-border/50 pt-6 mt-2">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-display font-semibold">Sous-location (Cross-renting)</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">Cet équipement est-il loué chez un confrère ?</p>
                  </div>
                  <Switch checked={isSubrented} onCheckedChange={setIsSubrented} />
                </div>

                {isSubrented && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-xl border border-border/50">
                    <div className="space-y-2">
                      <Label>Fournisseur / Confrère</Label>
                      <Select value={supplierId} onValueChange={setSupplierId}>
                        <SelectTrigger className="rounded-xl bg-background">
                          <SelectValue placeholder="Sélectionner un fournisseur..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none" className="text-muted-foreground italic">Aucun fournisseur assigné</SelectItem>
                          {suppliers.map((sup: any) => (
                            <SelectItem key={sup.id} value={sup.id}>{sup.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Coût de sous-location / jour (€)</Label>
                      <Input type="number" step="0.01" min={0} value={subrentCost} onChange={e => setSubrentCost(e.target.value)} placeholder="0.00" className="rounded-xl bg-background" />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2 mt-6">
                <Label>Notes</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes internes..." className="rounded-xl resize-none" rows={3} />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="rounded-xl" onClick={() => navigate("/materiel")}>Annuler</Button>
                <Button type="submit" className="gradient-primary text-white rounded-xl gap-2 hover:opacity-90 flex-1" disabled={isPending || !name.trim()}>
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isEdit ? "Enregistrer" : "Ajouter"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </AppLayout>
  );
}
