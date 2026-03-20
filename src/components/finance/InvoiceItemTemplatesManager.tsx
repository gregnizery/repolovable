import { useState } from "react";
import { useInvoiceItemTemplates, useCreateInvoiceItemTemplate, useUpdateInvoiceItemTemplate, useDeleteInvoiceItemTemplate } from "@/hooks/use-invoice-templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

export function InvoiceItemTemplatesManager() {
    const { data: templates = [], isLoading } = useInvoiceItemTemplates();
    const createTemplate = useCreateInvoiceItemTemplate();
    const updateTemplate = useUpdateInvoiceItemTemplate();
    const deleteTemplate = useDeleteInvoiceItemTemplate();

    const [isOpen, setIsOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [defaultPrice, setDefaultPrice] = useState<number>(0);
    const [type, setType] = useState<"gestion" | "technique" | "autre">("autre");

    const resetForm = () => {
        setEditingId(null);
        setName("");
        setDescription("");
        setDefaultPrice(0);
        setType("autre");
    };

    const handleOpenEdit = (template: { id: string; name: string; description: string | null; default_price: number | string; type: "gestion" | "technique" | "autre" }) => {
        setEditingId(template.id);
        setName(template.name);
        setDescription(template.description || "");
        setDefaultPrice(Number(template.default_price));
        setType(template.type);
        setIsOpen(true);
    };

    const handleSave = async () => {
        if (!name) return;

        const payload = {
            name,
            description: description || null,
            default_price: defaultPrice,
            type,
        };

        if (editingId) {
            await updateTemplate.mutateAsync({ id: editingId, ...payload });
        } else {
            await createTemplate.mutateAsync(payload);
        }

        setIsOpen(false);
        resetForm();
    };

    const handleDelete = async (id: string) => {
        if (confirm("Êtes-vous sûr de vouloir supprimer ce modèle ?")) {
            await deleteTemplate.mutateAsync(id);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Modèles de Lignes (Prestations/Produits)</h3>
                <Dialog open={isOpen} onOpenChange={(v) => { setIsOpen(v); if (!v) resetForm(); }}>
                    <DialogTrigger asChild>
                        <Button size="sm"><Plus className="w-4 h-4 mr-2" /> Nouveau modèle</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingId ? "Modifier le modèle" : "Créer un modèle"}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Nom / Référence</Label>
                                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Heure de prestation technique" />
                            </div>
                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description détaillée..." />
                            </div>
                            <div className="space-y-2">
                                <Label>Prix unitaire par défaut (HT)</Label>
                                <Input type="number" min="0" step="0.01" value={defaultPrice} onChange={(e) => setDefaultPrice(Number(e.target.value))} />
                            </div>
                            <div className="space-y-2">
                                <Label>Type</Label>
                                <Select value={type} onValueChange={(val) => setType(val as "gestion" | "technique" | "autre")}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner le type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="gestion">Gestion</SelectItem>
                                        <SelectItem value="technique">Prestation Technique</SelectItem>
                                        <SelectItem value="autre">Autre</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button onClick={handleSave} className="w-full" disabled={createTemplate.isPending || updateTemplate.isPending}>
                                {(createTemplate.isPending || updateTemplate.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Enregistrer
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {isLoading ? (
                <div className="text-center py-4 text-muted-foreground">Chargement...</div>
            ) : templates.length === 0 ? (
                <div className="text-center py-8 border rounded-lg bg-muted/20 text-muted-foreground">
                    Aucun modèle de ligne enregistré.
                </div>
            ) : (
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nom</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="text-right">Prix Défaut</TableHead>
                                <TableHead className="w-[100px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {templates.map((t) => (
                                <TableRow key={t.id}>
                                    <TableCell className="font-medium">{t.name}</TableCell>
                                    <TableCell className="capitalize">{t.type}</TableCell>
                                    <TableCell className="text-right">{Number(t.default_price).toFixed(2)} €</TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(t)}>
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)} className="text-destructive">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}
