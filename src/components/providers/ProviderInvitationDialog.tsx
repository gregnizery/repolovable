import { useState } from "react";
import { useForm } from "react-hook-form";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useInviteProvider, useTeam } from "@/hooks/use-team";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Mail, Send } from "lucide-react";

interface ProviderInvitationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ProviderInvitationDialog({ open, onOpenChange }: ProviderInvitationDialogProps) {
    const inviteProvider = useInviteProvider();
    const { data: teamData } = useTeam();
    const { user } = useAuth();

    const form = useForm({
        defaultValues: {
            email: "",
        },
    });

    const onSubmit = async (values: { email: string }) => {
        console.log("Submitting invitation for:", values.email);
        if (!user) {
            toast.error("Vous devez être connecté pour inviter un prestataire");
            return;
        }

        const teamId = teamData?.team_id;

        if (!teamId) {
            console.error("No team ID found for user:", user.id);
            toast.error("Impossible de trouver votre identifiant d'équipe. Veuillez rafraîchir la page.");
            return;
        }

        try {
            await inviteProvider.mutateAsync({
                email: values.email,
                teamId
            });
            form.reset();
            onOpenChange(false);
        } catch (error) {
            console.error("Invitation error:", error);
            // Error is handled by mutate mutation's onError (toast)
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-display font-bold flex items-center gap-2">
                        <Mail className="h-6 w-6 text-primary" /> Inviter un prestataire
                    </DialogTitle>
                    <DialogDescription className="text-sm">
                        Envoyez une invitation par email pour permettre à un nouveau collaborateur de rejoindre votre réseau et de compléter son profil (tarifs, SIRET, RIB).
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Adresse Email</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="exemple@prestataire.com"
                                            {...field}
                                            className="rounded-xl h-11"
                                            type="email"
                                            required
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => onOpenChange(false)}
                                className="rounded-xl h-11"
                            >
                                Annuler
                            </Button>
                            <Button
                                type="submit"
                                className="gradient-primary text-white rounded-xl h-11 px-6 shadow-md gap-2"
                                disabled={inviteProvider.isPending}
                            >
                                {inviteProvider.isPending ? "Envoi..." : (
                                    <>
                                        <Send className="h-4 w-4" /> Envoyer l'invitation
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
