import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useB2BCatalog, useCreateSubrentRequest } from "@/hooks/use-data";
import { Search, Loader2, Package, MapPin, Hash, Send } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface CatalogItem {
    id: string;
    name: string;
    category: string | null;
    team_id: string;
    quantity: number;
    description: string | null;
    rental_price: number | null;
    teams?: {
        name: string;
    } | null;
}

interface B2BCatalogDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    missionId?: string;
    defaultSearch?: string;
}

export function B2BCatalogDialog({ open, onOpenChange, missionId, defaultSearch = "" }: B2BCatalogDialogProps) {
    const { data: catalog = [], isLoading } = useB2BCatalog();
    const createRequest = useCreateSubrentRequest();

    const [searchTerm, setSearchTerm] = useState(defaultSearch);
    const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
    const [requestQuantity, setRequestQuantity] = useState(1);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [notes, setNotes] = useState("");

    const filteredCatalog = catalog.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleSelect = (item: CatalogItem) => {
        setSelectedItem(item);
        setRequestQuantity(1);
    };

    const handleSendRequest = () => {
        if (!selectedItem) return;
        if (!startDate || !endDate) {
            toast.error("Veuillez définir des dates pour la demande.");
            return;
        }

        createRequest.mutate({
            materiel_id: selectedItem.id,
            materiel_name: selectedItem.name,
            provider_team_id: selectedItem.team_id,
            quantity: requestQuantity,
            start_date: startDate,
            end_date: endDate,
            notes: notes || null,
            mission_id: missionId || null,
            status: "pending"
        }, {
            onSuccess: () => {
                setSelectedItem(null);
                setNotes("");
                setStartDate("");
                setEndDate("");
                onOpenChange(false);
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            onOpenChange(val);
            if (!val) setSelectedItem(null);
        }}>
            <DialogContent className="sm:max-w-2xl h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
                <div className="p-6 pb-4 border-b">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Search className="h-5 w-5 text-primary" />
                            Catalogue Partenaire (B2B)
                        </DialogTitle>
                        <DialogDescription>
                            Retrouvez le matériel mis à disposition par vos contacts partenaires.
                        </DialogDescription>
                    </DialogHeader>

                    {!selectedItem && (
                        <div className="relative mt-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Rechercher un équipement..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 rounded-xl"
                            />
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-muted/10">
                    {isLoading ? (
                        <div className="flex justify-center flex-col items-center p-12 text-muted-foreground">
                            <Loader2 className="h-8 w-8 animate-spin mb-4" />
                            <p>Chargement du catalogue...</p>
                        </div>
                    ) : selectedItem ? (
                        <div className="space-y-6">
                            <button
                                onClick={() => setSelectedItem(null)}
                                className="text-sm text-primary hover:underline"
                            >
                                &larr; Retour au catalogue
                            </button>

                            <div className="p-4 border rounded-xl bg-background shadow-sm space-y-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-display font-semibold text-lg">{selectedItem.name}</h3>
                                        <p className="text-sm text-muted-foreground">{selectedItem.category}</p>
                                    </div>
                                    <Badge variant="outline" className="bg-primary/5">{selectedItem.teams?.name}</Badge>
                                </div>

                                <div className="text-sm space-y-2">
                                    <div className="flex justify-between py-1 border-b">
                                        <span className="text-muted-foreground">Disponibilité max:</span>
                                        <span className="font-medium">{selectedItem.quantity} unité(s)</span>
                                    </div>
                                    {selectedItem.description && (
                                        <div className="py-2">
                                            <span className="text-muted-foreground block mb-1">Description:</span>
                                            <span className="text-foreground">{selectedItem.description}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4 pt-4 border-t">
                                    <h4 className="font-medium">Demande de sous-location</h4>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium">Date de début *</label>
                                            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="rounded-xl" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium">Date de fin *</label>
                                            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="rounded-xl" />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-medium">Quantité requise *</label>
                                        <Input
                                            type="number"
                                            min={1}
                                            max={selectedItem.quantity}
                                            value={requestQuantity}
                                            onChange={e => setRequestQuantity(parseInt(e.target.value) || 1)}
                                            className="rounded-xl"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-medium">Message ou précisions</label>
                                        <Input
                                            value={notes}
                                            onChange={e => setNotes(e.target.value)}
                                            placeholder="Ex: Récupération le matin à l'entrepôt..."
                                            className="rounded-xl"
                                        />
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <Button
                                        className="w-full gap-2 rounded-xl gradient-primary text-white"
                                        onClick={handleSendRequest}
                                        disabled={createRequest.isPending || !startDate || !endDate}
                                    >
                                        {createRequest.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                        Envoyer la demande au partenaire
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : filteredCatalog.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-xl border-border/50">
                            <Package className="h-12 w-12 text-muted-foreground/30 mb-4" />
                            <p className="text-muted-foreground">Aucun matériel trouvé dans le catalogue partenaire.</p>
                            <p className="text-xs text-muted-foreground mt-2">Invitez des partenaires B2B depuis l'onglet "Réseau B2B" pour voir leur matériel partagé.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredCatalog.map(item => (
                                <div
                                    key={item.id}
                                    className="p-4 border rounded-xl bg-background shadow-sm hover:border-primary/50 hover:shadow-md transition-all cursor-pointer flex justify-between items-center group"
                                    onClick={() => handleSelect(item)}
                                >
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">{item.name}</h4>
                                            {item.rental_price && <Badge variant="secondary" className="text-xs">{item.rental_price}€/j</Badge>}
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {item.teams?.name}</span>
                                            <span className="flex items-center gap-1"><Hash className="h-3 w-3" /> Qté : {item.quantity}</span>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm" className="rounded-full group-hover:bg-primary/10 group-hover:text-primary">
                                        Sélectionner
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
