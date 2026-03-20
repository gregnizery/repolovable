import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
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
import { useUpdateProvider } from "@/hooks/use-data";
import { Tables } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Euro, Landmark, Building2, Upload, FileText, Loader2 } from "lucide-react";
import { CompanyAutocomplete } from "@/components/CompanyAutocomplete";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProviderFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    provider: Tables<"providers"> | null;
}

export function ProviderFormDialog({ open, onOpenChange, provider }: ProviderFormDialogProps) {
    const updateProviderMutation = useUpdateProvider();
    const [specialtyInput, setSpecialtyInput] = useState("");
    const [uploadingDoc, setUploadingDoc] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const form = useForm({
        defaultValues: {
            name: "",
            daily_rate: 0,
            hourly_rate: 0,
            specialties: [] as string[],
            email: "",
            phone: "",
            address: "",
            iban: "",
            bic: "",
            siret: "",
            tva_number: "",
            id_document_url: "",
        },
    });

    useEffect(() => {
        if (provider) {
            const contactInfo = provider.contact_info as { email?: string; phone?: string; address?: string } | null;
            const legalInfo = provider.legal_info as { iban?: string; bic?: string; siret?: string; tva_number?: string; id_document_url?: string } | null;
            form.reset({
                name: provider.name,
                daily_rate: provider.daily_rate || 0,
                hourly_rate: provider.hourly_rate || 0,
                specialties: provider.specialties || [],
                email: contactInfo?.email || "",
                phone: contactInfo?.phone || "",
                address: contactInfo?.address || "",
                iban: legalInfo?.iban || "",
                bic: legalInfo?.bic || "",
                siret: legalInfo?.siret || "",
                tva_number: legalInfo?.tva_number || "",
                id_document_url: legalInfo?.id_document_url || "",
            });
        } else {
            form.reset({
                name: "",
                daily_rate: 0,
                hourly_rate: 0,
                specialties: [],
                email: "",
                phone: "",
                address: "",
                iban: "",
                bic: "",
                siret: "",
                id_document_url: "",
            });
        }
    }, [provider, form, open]);

    const onSubmit = async (values: {
        name: string;
        daily_rate: number;
        hourly_rate: number;
        specialties: string[];
        email: string;
        phone: string;
        address: string;
        iban: string;
        bic: string;
        siret: string;
        tva_number: string;
        id_document_url: string;
    }) => {
        const { email, phone, address, iban, bic, siret, tva_number, id_document_url, ...rest } = values;
        const payload = {
            ...rest,
            contact_info: { email, phone, address },
            legal_info: { iban, bic, siret, tva_number, id_document_url },
        };

        if (provider) {
            await updateProviderMutation.mutateAsync({ id: provider.id, ...payload });
        }
        onOpenChange(false);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !provider) return;

        setUploadingDoc(true);
        try {
            const fileExt = file.name.split('.').pop();
            const filePath = `providers/${provider.id}/id_scan_${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars') // Using avatars bucket as it already exists and is likely public/accessible
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            form.setValue('id_document_url', publicUrl);
            toast.success("Document téléchargé avec succès");
        } catch (error: unknown) {
            toast.error("Erreur lors de l'envoi du document: " + error.message);
        } finally {
            setUploadingDoc(false);
        }
    };

    const addSpecialty = () => {
        if (specialtyInput.trim()) {
            const current = form.getValues("specialties");
            if (!current.includes(specialtyInput.trim())) {
                form.setValue("specialties", [...current, specialtyInput.trim()]);
            }
            setSpecialtyInput("");
        }
    };

    const removeSpecialty = (s: string) => {
        const current = form.getValues("specialties");
        form.setValue("specialties", current.filter(item => item !== s));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] overflow-y-auto max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-display font-bold">
                        Modifier le prestataire
                    </DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <Building2 className="h-4 w-4" /> Informations Générales
                            </h4>
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nom Complet / Nom de scène</FormLabel>
                                        <FormControl>
                                            <CompanyAutocomplete
                                                value={field.value}
                                                onChange={field.onChange}
                                                onCompanySelect={(c) => {
                                                    form.setValue("name", c.name);
                                                    form.setValue("siret", c.siret);
                                                    form.setValue("address", c.address);
                                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                    if ((c as any).vatNumber) {
                                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                        form.setValue("tva_number", (c as any).vatNumber);
                                                    }
                                                }}
                                                placeholder="Rechercher une société ou entrer un nom..."
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="daily_rate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Tarif Journalier (€)</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} className="rounded-xl h-11 pr-10" />
                                                    <Euro className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="hourly_rate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Tarif Horaire (€)</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} className="rounded-xl h-11 pr-10" />
                                                    <Euro className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="space-y-2">
                                <FormLabel>Spécialités</FormLabel>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Ex: Son, Lumière, DJ..."
                                        value={specialtyInput}
                                        onChange={e => setSpecialtyInput(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                addSpecialty();
                                            }
                                        }}
                                        className="rounded-xl h-11"
                                    />
                                    <Button type="button" onClick={addSpecialty} variant="outline" className="h-11 rounded-xl px-3">
                                        <Plus className="h-5 w-5" />
                                    </Button>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-2 min-h-[32px]">
                                    {form.watch("specialties").map(s => (
                                        <Badge key={s} variant="secondary" className="pl-3 pr-1 py-1 gap-1 flex items-center rounded-lg border-primary/20 bg-primary/5 text-primary">
                                            {s}
                                            <button type="button" onClick={() => removeSpecialty(s)} className="hover:bg-primary/20 rounded-full p-0.5 transition-colors">
                                                <X className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-border">
                            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <Landmark className="h-4 w-4" /> Coordonnées Bancaires (RIB)
                            </h4>
                            <div className="grid grid-cols-1 gap-4">
                                <FormField
                                    control={form.control}
                                    name="iban"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>IBAN</FormLabel>
                                            <FormControl>
                                                <Input placeholder="FR76 ..." {...field} className="rounded-xl h-11" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="bic"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>BIC / SWIFT</FormLabel>
                                            <FormControl>
                                                <Input placeholder="XXXX ..." {...field} className="rounded-xl h-11" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-border">
                            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <FileText className="h-4 w-4" /> Documents & Légal
                            </h4>
                            <FormField
                                control={form.control}
                                name="siret"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>N° SIRET</FormLabel>
                                        <FormControl>
                                            <Input placeholder="123 456 789 00001" {...field} className="rounded-xl h-11" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="tva_number"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>N° TVA Intracommunautaire</FormLabel>
                                        <FormControl>
                                            <Input placeholder="FR00 123 456 789" {...field} className="rounded-xl h-11" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="space-y-2">
                                <FormLabel>Pièce d'identité (Passeport / CNI)</FormLabel>
                                <div className="flex items-center gap-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="h-20 w-full border-dashed rounded-xl flex flex-col gap-2"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploadingDoc}
                                    >
                                        {uploadingDoc ? (
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                        ) : (
                                            <>
                                                <Upload className="h-5 w-5 text-muted-foreground" />
                                                <span className="text-xs text-muted-foreground">
                                                    {form.watch("id_document_url") ? "Remplacer le scan" : "Télécharger un scan"}
                                                </span>
                                            </>
                                        )}
                                    </Button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        onChange={handleFileUpload}
                                        accept=".pdf,image/*"
                                    />
                                    {form.watch("id_document_url") && (
                                        <a
                                            href={form.watch("id_document_url")}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-3 rounded-xl bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
                                        >
                                            <FileText className="h-6 w-6" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-border">
                            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Contact</h4>

                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input type="email" {...field} className="rounded-xl h-11" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Téléphone</FormLabel>
                                        <FormControl>
                                            <Input {...field} className="rounded-xl h-11" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="address"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Adresse</FormLabel>
                                        <FormControl>
                                            <Input {...field} className="rounded-xl h-11" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <DialogFooter className="pt-6">
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl h-11">
                                Annuler
                            </Button>
                            <Button type="submit" className="gradient-primary text-white rounded-xl h-11 px-8 shadow-md" disabled={updateProviderMutation.isPending || uploadingDoc}>
                                Sauvegarder les modifications
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
