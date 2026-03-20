import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateSupplier, useUpdateSupplier } from "@/hooks/use-data";
import { Tables } from "@/integrations/supabase/types";

interface SupplierFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    supplier?: Tables<"suppliers"> | null;
}

export function SupplierFormDialog({ open, onOpenChange, supplier }: SupplierFormDialogProps) {
    const isEditing = !!supplier;
    const createMutation = useCreateSupplier();
    const updateMutation = useUpdateSupplier();

    interface FormValues {
        name: string;
        contact_name: string;
        email: string;
        phone: string;
        address: string;
        notes: string;
    }

    const { register, handleSubmit, reset } = useForm<FormValues>({
        defaultValues: {
            name: "",
            contact_name: "",
            email: "",
            phone: "",
            address: "",
            notes: "",
        },
    });

    useEffect(() => {
        if (open) {
            if (supplier) {
                reset({
                    name: supplier.name,
                    contact_name: supplier.contact_name || "",
                    email: supplier.email || "",
                    phone: supplier.phone || "",
                    address: supplier.address || "",
                    notes: supplier.notes || "",
                });
            } else {
                reset({
                    name: "",
                    contact_name: "",
                    email: "",
                    phone: "",
                    address: "",
                    notes: "",
                });
            }
        }
    }, [open, supplier, reset]);

    const onSubmit = async (data: FormValues) => {
        try {
            if (isEditing && supplier) {
                await updateMutation.mutateAsync({ id: supplier.id, ...data });
            } else {
                await createMutation.mutateAsync(data);
            }
            onOpenChange(false);
        } catch (e: unknown) {
            console.error(e);
        }
    };

    const isPending = createMutation.isPending || updateMutation.isPending;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? "Modifier le prestataire" : "Nouveau prestataire"}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nom de l'entreprise *</Label>
                        <Input id="name" {...register("name", { required: true })} placeholder="Ex: Audiopro Loc" />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="contact_name">Nom du contact</Label>
                        <Input id="contact_name" {...register("contact_name")} placeholder="Jean Dupont" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" {...register("email")} placeholder="contact@audiopro.fr" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Téléphone</Label>
                            <Input id="phone" {...register("phone")} placeholder="01 23 45 67 89" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="address">Adresse</Label>
                        <Textarea
                            id="address"
                            {...register("address")}
                            placeholder="123 rue de la technique, 75000 Paris"
                            className="resize-none"
                            rows={2}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes / Informations complémentaires</Label>
                        <Textarea
                            id="notes"
                            {...register("notes")}
                            placeholder="Conditions particulières de location, jours de fermeture..."
                            className="resize-none"
                            rows={3}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Annuler
                        </Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? "Enregistrement..." : "Enregistrer"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
