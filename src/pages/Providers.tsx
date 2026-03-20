/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useProviders, useDeleteProvider } from "@/hooks/use-data";
import { useUserRole, canEdit } from "@/hooks/use-user-role";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
    Plus,
    Users,
    Phone,
    Mail,
    MapPin,
    MoreVertical,
    Edit,
    Trash2,
    Search,
    User as UserIcon,
    CreditCard,
    Briefcase,
    Star,
    Euro
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { SkeletonCard } from "@/components/SkeletonCard";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";
import { Tables } from "@/integrations/supabase/types";
import { ProviderFormDialog } from "@/components/providers/ProviderFormDialog";
import { ProviderInvitationDialog } from "@/components/providers/ProviderInvitationDialog";

export default function Providers() {
    const { data: providers = [], isLoading } = useProviders();
    const { data: roleData } = useUserRole();
    const { user } = useAuth();
    const navigate = useNavigate();
    const deleteProviderMutation = useDeleteProvider();

    const [search, setSearch] = useState("");
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [editingProvider, setEditingProvider] = useState<Tables<"providers"> | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [providerToDelete, setProviderToDelete] = useState<Tables<"providers"> | null>(null);

    const canManage = canEdit(roleData?.role, "parametres"); // Admins/Managers can manage

    const filtered = providers.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
         
        (p.contact_info as any)?.email?.toLowerCase().includes(search.toLowerCase()) ||
        p.specialties?.some(s => s.toLowerCase().includes(search.toLowerCase()))
    );

    const handleEdit = (provider: Tables<"providers">) => {
        setEditingProvider(provider);
        setIsFormOpen(true);
    };

    const handleCreate = () => {
        setEditingProvider(null);
        setIsFormOpen(true);
    };

    const handleDeleteClick = (provider: Tables<"providers">) => {
        setProviderToDelete(provider);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (providerToDelete) {
            await deleteProviderMutation.mutateAsync(providerToDelete.id);
            setIsDeleteDialogOpen(false);
            setProviderToDelete(null);
        }
    };

    return (
        <AppLayout>
            <div className="space-y-6 max-w-7xl animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-display font-bold tracking-tight">Prestataires</h1>
                        <p className="text-muted-foreground text-sm mt-1">{providers.length} {providers.length <= 1 ? 'prestataire référencé' : 'prestataires référencés'}</p>
                    </div>
                    {canManage && (
                        <div className="flex gap-2">
                            <Button className="gradient-primary text-white rounded-xl gap-2 hover:opacity-90 shadow-md" onClick={() => setIsInviteOpen(true)}>
                                <Mail className="h-4 w-4" /> Inviter un prestataire
                            </Button>
                        </div>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Rechercher par nom, spécialité, email..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-10 h-10 rounded-xl"
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <SkeletonCard key={i} />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <EmptyState
                        icon={Users}
                        title={search ? "Aucun résultat" : "Aucun prestataire"}
                        description={search ? `Aucun prestataire ne correspond à "${search}".` : "Commencez par inviter vos techniciens et DJs pour qu'ils complètent leur profil."}
                        actionLabel={canManage && !search ? "Inviter un prestataire" : undefined}
                        onAction={() => setIsInviteOpen(true)}
                    />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filtered.map(p => (
                            <Card key={p.id} className="group hover:shadow-lg transition-all duration-300 border-border/50 relative overflow-hidden">
                                <CardHeader className="pb-3">
                                    <div className="flex justify-between items-start">
                                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl mb-2">
                                            {p.name.charAt(0).toUpperCase()}
                                        </div>
                                        {(canManage || (roleData?.role === 'prestataire' && p.user_id === user?.id)) && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {(canManage || (roleData?.role === 'prestataire' && p.user_id === user?.id)) && (
                                                        <DropdownMenuItem onClick={() => handleEdit(p)}>
                                                            <Edit className="h-4 w-4 mr-2" /> Modifier
                                                        </DropdownMenuItem>
                                                    )}
                                                    {canManage && (
                                                        <DropdownMenuItem onClick={() => handleDeleteClick(p)} className="text-destructive">
                                                            <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>
                                    <CardTitle className="text-xl group-hover:text-primary transition-colors">{p.name}</CardTitle>
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {p.specialties?.map(s => (
                                            <Badge key={s} variant="secondary" className="text-[10px] px-2 py-0">{s}</Badge>
                                        ))}
                                        {(!p.specialties || p.specialties.length === 0) && (
                                            <span className="text-xs text-muted-foreground italic">Aucune spécialité</span>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2 text-sm text-muted-foreground">
                                        {(p.contact_info as any)?.email && (
                                            <div className="flex items-center gap-2">
                                                <Mail className="h-3.5 w-3.5" /> {(p.contact_info as any).email}
                                            </div>
                                        )}
                                        {(p.contact_info as any)?.phone && (
                                            <div className="flex items-center gap-2">
                                                <Phone className="h-3.5 w-3.5" /> {(p.contact_info as any).phone}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between pt-3 border-t border-border">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-muted-foreground uppercase font-semibold">Taux Journalier</span>
                                            <span className="font-bold text-lg text-foreground flex items-center gap-1">
                                                {p.daily_rate} <Euro className="h-3.5 w-3.5" />
                                            </span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] text-muted-foreground uppercase font-semibold">Taux Horaire</span>
                                            <span className="font-semibold text-foreground flex items-center gap-1">
                                                {p.hourly_rate} <Euro className="h-3 w-3" />
                                            </span>
                                        </div>
                                    </div>

                                    <Button
                                        variant="ghost"
                                        className="w-full mt-2 group-hover:bg-primary group-hover:text-white transition-all rounded-xl gap-2 h-9 text-xs"
                                        onClick={() => navigate(`/prestataires/${p.id}`)}
                                    >
                                        Voir la fiche complète <Plus className="h-3 w-3" />
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                <ProviderFormDialog
                    open={isFormOpen}
                    onOpenChange={setIsFormOpen}
                    provider={editingProvider}
                />

                <ProviderInvitationDialog
                    open={isInviteOpen}
                    onOpenChange={setIsInviteOpen}
                />

                <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer le prestataire ?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Cette action supprimera la fiche de <strong>{providerToDelete?.name}</strong>.
                                Les assignations passées dans les devis et factures seront conservées.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-white hover:bg-destructive/90">
                                {deleteProviderMutation.isPending ? "Suppression..." : "Supprimer"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </AppLayout>
    );
}
