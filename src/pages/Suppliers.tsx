import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useSuppliers, useDeleteSupplier } from "@/hooks/use-data";
import { useUserRole, canEdit } from "@/hooks/use-user-role";
import { Button } from "@/components/ui/button";
import { Plus, Building2, Phone, Mail, MapPin, MoreVertical, Edit, Trash2, Link as LinkIcon, Users, ArrowRightLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SupplierFormDialog } from "@/components/suppliers/SupplierFormDialog";
import { B2BConnectDialog } from "@/components/suppliers/B2BConnectDialog";
import { B2BRequestsView } from "@/components/suppliers/B2BRequestsView";
import { Tables } from "@/integrations/supabase/types";

export default function Suppliers() {
    const { data: suppliers, isLoading } = useSuppliers();
    const deleteSupplierMutation = useDeleteSupplier();
    const { data: roleData } = useUserRole();
    const canEditSuppliers = canEdit(roleData?.role, "materiel");

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isB2BOpen, setIsB2BOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Tables<"suppliers"> | null>(null);

    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [supplierToDelete, setSupplierToDelete] = useState<Tables<"suppliers"> | null>(null);

    const handleEdit = (supplier: Tables<"suppliers">) => {
        setEditingSupplier(supplier);
        setIsFormOpen(true);
    };

    const handleCreate = () => {
        setEditingSupplier(null);
        setIsFormOpen(true);
    };

    const handleDeleteClick = (supplier: Tables<"suppliers">) => {
        setSupplierToDelete(supplier);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (supplierToDelete) {
            await deleteSupplierMutation.mutateAsync(supplierToDelete.id);
            setIsDeleteDialogOpen(false);
            setSupplierToDelete(null);
        }
    };

    return (
        <AppLayout>
            <div className="flex-1 space-y-6 animate-fade-in max-w-7xl">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-display font-bold tracking-tight">Réseau B2B & Fournisseurs</h1>
                        <p className="text-muted-foreground mt-1">Gérez votre carnet d'adresses confrères et vos partenaires Planify.</p>
                    </div>
                    <div className="flex gap-3">
                        {canEditSuppliers && (
                            <>
                                <Button variant="outline" onClick={() => setIsB2BOpen(true)} className="shadow-sm">
                                    <LinkIcon className="h-4 w-4 mr-2" />
                                    Connecter un compte Planify
                                </Button>
                                <Button onClick={handleCreate} className="shadow-md">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Nouveau Prestataire
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {/* Main Content */}
                <Tabs defaultValue="network" className="w-full">
                    <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
                        <TabsTrigger value="network" className="gap-2">
                            <Users className="h-4 w-4" /> Réseau & Contacts
                        </TabsTrigger>
                        <TabsTrigger value="requests" className="gap-2">
                            <ArrowRightLeft className="h-4 w-4" /> Demandes B2B
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="network" className="space-y-6 m-0">
                        {isLoading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[1, 2, 3].map((i) => (
                                    <Card key={i} className="overflow-hidden">
                                        <CardHeader className="pb-3"><Skeleton className="h-6 w-2/3" /></CardHeader>
                                        <CardContent className="space-y-3"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-4 w-3/4" /></CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : suppliers?.length === 0 ? (
                            <div className="text-center py-16 px-4 bg-muted/30 rounded-2xl border border-dashed mx-auto max-w-2xl">
                                <div className="bg-background w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border shadow-sm">
                                    <Building2 className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <h3 className="text-xl font-semibold mb-2">Aucun prestataire</h3>
                                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                                    Ajoutez vos fournisseurs, agences et confrères pour gérer la sous-location de matériel.
                                </p>
                                <Button onClick={handleCreate}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Ajouter le premier
                                </Button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {suppliers?.map((supplier) => (
                                    <Card key={supplier.id} className="group hover:shadow-md transition-all duration-200 border-sidebar-border relative overflow-hidden">
                                        {supplier.connected_team_id && (
                                            <div className="absolute top-0 right-0 p-1.5 bg-primary/10 text-primary rounded-bl-lg border-b border-l border-primary/20" title="Connecté au réseau Planify">
                                                <LinkIcon className="h-4 w-4" />
                                            </div>
                                        )}
                                        <CardHeader className="pb-3 pr-10">
                                            <CardTitle className="flex items-center gap-2 text-xl">
                                                {supplier.name}
                                            </CardTitle>
                                            {supplier.contact_name && (
                                                <CardDescription className="flex items-center gap-1.5 mt-1">
                                                    <Users className="h-3.5 w-3.5" />
                                                    {supplier.contact_name}
                                                </CardDescription>
                                            )}
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-2.5 text-sm text-muted-foreground">
                                                {supplier.email && (
                                                    <div className="flex items-center gap-2">
                                                        <Mail className="h-4 w-4 shrink-0 text-muted-foreground/70" />
                                                        <a href={`mailto:${supplier.email}`} className="hover:text-primary transition-colors truncate">{supplier.email}</a>
                                                    </div>
                                                )}
                                                {supplier.phone && (
                                                    <div className="flex items-center gap-2">
                                                        <Phone className="h-4 w-4 shrink-0 text-muted-foreground/70" />
                                                        <a href={`tel:${supplier.phone}`} className="hover:text-primary transition-colors">{supplier.phone}</a>
                                                    </div>
                                                )}
                                                {supplier.address && (
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className="h-4 w-4 shrink-0 text-muted-foreground/70" />
                                                        <span className="truncate">{supplier.address}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {canEditSuppliers && (
                                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => handleEdit(supplier)}>
                                                                <Edit className="h-4 w-4 mr-2" />
                                                                Modifier
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleDeleteClick(supplier)} className="text-destructive focus:bg-destructive/10">
                                                                <Trash2 className="h-4 w-4 mr-2" />
                                                                Supprimer
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="requests" className="m-0">
                        <B2BRequestsView />
                    </TabsContent>
                </Tabs>

                <SupplierFormDialog
                    open={isFormOpen}
                    onOpenChange={setIsFormOpen}
                    supplier={editingSupplier}
                />

                <B2BConnectDialog
                    open={isB2BOpen}
                    onOpenChange={setIsB2BOpen}
                />

                <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Cette action supprimera définitivement le fournisseur <strong>{supplierToDelete?.name}</strong>.
                                S'il est lié à du matériel, ce lien sera effacé (mais le matériel restera dans votre inventaire).
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={confirmDelete}
                                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                disabled={deleteSupplierMutation.isPending}
                            >
                                {deleteSupplierMutation.isPending ? "Suppression..." : "Supprimer"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </AppLayout>
    );
}
