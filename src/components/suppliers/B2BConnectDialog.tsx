import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useB2BInvitations, useCreateB2BInvitation, useAcceptB2BInvitation } from "@/hooks/use-data";
import { Copy, Link as LinkIcon, Loader2, QrCode } from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG as QRCode } from "qrcode.react";

interface B2BConnectDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function B2BConnectDialog({ open, onOpenChange }: B2BConnectDialogProps) {
    const [tokenInput, setTokenInput] = useState("");

    const { data: invitations, isLoading: isLoadingInvites } = useB2BInvitations();
    const createInvite = useCreateB2BInvitation();
    const acceptInvite = useAcceptB2BInvitation();

    const handleGenerate = () => {
        createInvite.mutate();
    };

    const handleAccept = () => {
        if (!tokenInput.trim()) {
            toast.error("Veuillez saisir un code");
            return;
        }
        acceptInvite.mutate(tokenInput.trim(), {
            onSuccess: () => {
                onOpenChange(false);
                setTokenInput("");
            }
        });
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Code copié dans le presse-papiers");
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <LinkIcon className="h-5 w-5 text-primary" />
                        Connexion Réseau Planify
                    </DialogTitle>
                    <DialogDescription>
                        Connectez-vous à un confrère pour faciliter la sous-location de matériel.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="receive" className="w-full mt-4">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="receive">Saisir un code</TabsTrigger>
                        <TabsTrigger value="share">Partager mon code</TabsTrigger>
                    </TabsList>

                    <TabsContent value="receive" className="space-y-4 py-4">
                        <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">
                                Saisissez le code fourni par votre partenaire pour l'ajouter à votre réseau.
                            </p>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="EX: ABCD-1234-WXYZ"
                                    value={tokenInput}
                                    onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                                    className="font-mono uppercase"
                                />
                            </div>
                        </div>
                        <Button
                            className="w-full shadow-md"
                            onClick={handleAccept}
                            disabled={acceptInvite.isPending || !tokenInput}
                        >
                            {acceptInvite.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LinkIcon className="h-4 w-4 mr-2" />}
                            Connecter
                        </Button>
                    </TabsContent>

                    <TabsContent value="share" className="space-y-4 py-4">
                        <p className="text-sm text-muted-foreground mb-4">
                            Générez un code sécurisé à usage unique pour inviter un partenaire.
                        </p>

                        {isLoadingInvites ? (
                            <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                        ) : (
                            <div className="space-y-4">
                                {invitations && invitations.filter(i => i.status === "pending").length > 0 ? (
                                    <div className="space-y-4">
                                        {invitations.filter(i => i.status === "pending").map(inv => (
                                            <div key={inv.id} className="p-4 bg-muted/50 rounded-xl border flex flex-col items-center gap-4">
                                                <div className="bg-background p-2 rounded-lg shell shadow-sm">
                                                    <QRCode value={inv.token} size={120} />
                                                </div>
                                                <div className="flex gap-2 w-full">
                                                    <Input value={inv.token} readOnly className="font-mono text-center bg-background" />
                                                    <Button variant="outline" size="icon" onClick={() => copyToClipboard(inv.token)}>
                                                        <Copy className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    Expire le {new Date(inv.expires_at).toLocaleDateString("fr-FR")}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center p-6 border border-dashed rounded-xl">
                                        <QrCode className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                                        <p className="text-sm text-muted-foreground mb-4">Aucun code actif.</p>
                                        <Button onClick={handleGenerate} disabled={createInvite.isPending}>
                                            {createInvite.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : "Générer un code"}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
