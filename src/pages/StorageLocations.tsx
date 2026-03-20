import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Plus, Edit2, Trash2, Loader2, Package } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useStorageLocations, useCreateStorageLocation, useUpdateStorageLocation, useDeleteStorageLocation } from "@/hooks/use-data";
import { useAuth } from "@/hooks/use-auth";

export default function StorageLocations() {
    const { user } = useAuth();
    const { data: locations, isLoading } = useStorageLocations();
    const createLocation = useCreateStorageLocation();
    const updateLocation = useUpdateStorageLocation();
    const deleteLocation = useDeleteStorageLocation();

    const [open, setOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [name, setName] = useState("");
    const [address, setAddress] = useState("");
    const [notes, setNotes] = useState("");

    const resetForm = () => {
        setName("");
        setAddress("");
        setNotes("");
        setEditingId(null);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleEdit = (location: any) => {
        setName(location.name);
        setAddress(location.address || "");
        setNotes(location.notes || "");
        setEditingId(location.id);
        setOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;

        if (editingId) {
            await updateLocation.mutateAsync({
                id: editingId,
                name,
                address: address || null,
                notes: notes || null,
            });
        } else {
            await createLocation.mutateAsync({
                name,
                address: address || null,
                notes: notes || null,
            });
        }

        setOpen(false);
        resetForm();
    };

    const handleDelete = async (id: string) => {
        if (confirm("Voulez-vous vraiment supprimer ce lieu de stockage ? Matériel non impacté.")) {
            await deleteLocation.mutateAsync(id);
        }
    };

    if (isLoading) {
        return (
            <AppLayout>
                <div className="flex h-[80vh] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-display font-medium tracking-tight">Lieux de stockage</h1>
                        <p className="text-muted-foreground mt-1 text-sm">Organisez et gérez l'emplacement physique de votre inventaire.</p>
                    </div>

                    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
                        <DialogTrigger asChild>
                            <Button className="gradient-primary text-white rounded-xl shadow-button border-0 hover:shadow-button-hover transition-all duration-300">
                                <Plus className="h-4 w-4 mr-2" /> Nouveau local
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>{editingId ? "Modifier le lieu" : "Nouveau lieu de stockage"}</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                                <div className="space-y-2">
                                    <Label>Nom du lieu *</Label>
                                    <Input
                                        placeholder="Entrepôt Principal, Camion A, etc."
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Adresse (optionnel)</Label>
                                    <Input
                                        placeholder="12 rue de la Paix..."
                                        value={address}
                                        onChange={e => setAddress(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Notes internes (optionnel)</Label>
                                    <Textarea
                                        placeholder="Infos d'accès, codes, etc."
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                        rows={3}
                                    />
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                                    <Button type="submit" disabled={createLocation.isPending || updateLocation.isPending || !name}>
                                        {createLocation.isPending || updateLocation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(!locations || locations.length === 0) ? (
                        <div className="col-span-full text-center py-12 rounded-2xl border border-dashed border-border/60 bg-muted/20">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4">
                                <MapPin className="h-6 w-6" />
                            </div>
                            <h3 className="font-display font-medium text-lg">Aucun lieu de stockage</h3>
                            <p className="text-muted-foreground text-sm mt-1 mb-4">Créez votre premier entrepôt pour y assigner du matériel.</p>
                            <Button variant="outline" onClick={() => setOpen(true)} className="rounded-xl border-dashed">
                                Créer un lieu
                            </Button>
                        </div>
                    ) : (
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        locations.map((loc: any) => (
                            <Card key={loc.id} className="shadow-card border-border/50 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-300">
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                                <MapPin className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h3 className="font-display font-bold text-foreground">{loc.name}</h3>
                                                {loc.address && <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" /> {loc.address}</p>}
                                            </div>
                                        </div>
                                    </div>
                                    {loc.notes && (
                                        <div className="mt-4 text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/50">
                                            {loc.notes}
                                        </div>
                                    )}
                                    <div className="mt-5 flex gap-2">
                                        <Button variant="outline" size="sm" className="flex-1 rounded-xl group hover:border-black hover:bg-black hover:text-white transition-colors" onClick={() => handleEdit(loc)}>
                                            <Edit2 className="h-4 w-4 mr-2 group-hover:text-white" /> Modifier
                                        </Button>
                                        <Button variant="outline" size="sm" className="rounded-xl px-3 border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors" onClick={() => handleDelete(loc.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
