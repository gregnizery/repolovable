import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { useUpdateProvider } from "@/hooks/use-data";
import { useAuth } from "@/hooks/use-auth";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Camera, X, Plus, Euro, Building2, CreditCard, ShieldCheck,
  Upload, FileText, Loader2, Check, User, Mail, Phone, MapPin
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface ProviderProfileFormProps {
  provider: Tables<"providers">;
  isOwnProfile?: boolean;
}

type DocumentType = "insurance" | "id" | "rib" | "urssaf";

const DOC_LABELS: Record<DocumentType, string> = {
  insurance: "Attestation RC Pro / Assurance",
  id: "CNI / Passeport",
  rib: "RIB",
  urssaf: "Attestation URSSAF",
};

export function ProviderProfileForm({ provider, isOwnProfile = false }: ProviderProfileFormProps) {
  const { user } = useAuth();
  const updateMutation = useUpdateProvider();
  const [specialtyInput, setSpecialtyInput] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [docUploading, setDocUploading] = useState<DocumentType | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const form = useForm({
    defaultValues: {
      name: provider.name || "",
      bio: (provider as any).bio || "",
      daily_rate: provider.daily_rate || 0,
      hourly_rate: provider.hourly_rate || 0,
      specialties: provider.specialties || [],
      email: (provider.contact_info as any)?.email || "",
      phone: (provider.contact_info as any)?.phone || "",
      address: (provider.contact_info as any)?.address || "",
      siret: (provider.legal_info as any)?.siret || "",
      tva_number: (provider.legal_info as any)?.tva_number || "",
      structure: (provider.legal_info as any)?.structure || "",
      iban: (provider.legal_info as any)?.iban || "",
      bic: (provider.legal_info as any)?.bic || "",
      insurance_expiry: (provider as any).insurance_expiry || "",
      notes: provider.notes || "",
    },
  });

  const photoUrl = (provider as any).photo_url;
  const insuranceDocUrl = (provider as any).insurance_document_url;
  const idDocUrl = (provider as any).id_document_url;
  const ribDocUrl = (provider as any).rib_document_url;
  const urssafDocUrl = (provider as any).urssaf_document_url;

  const uploadFile = async (file: File, path: string) => {
    const { data, error } = await supabase.storage
      .from("provider-documents")
      .upload(path, file, { upsert: true });
    if (error) throw error;
    const { data: urlData } = supabase.storage
      .from("provider-documents")
      .getPublicUrl(data.path);
    return urlData.publicUrl;
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image");
      return;
    }
    setPhotoUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${provider.id}/photo.${ext}`;
      const url = await uploadFile(file, path);
      await updateMutation.mutateAsync({ id: provider.id, photo_url: url } as any);
      toast.success("Photo de profil mise à jour");
    } catch (err: any) {
      toast.error("Erreur upload: " + err.message);
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleDocUpload = async (type: DocumentType, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocUploading(type);
    try {
      const ext = file.name.split(".").pop();
      const path = `${provider.id}/docs/${type}.${ext}`;
      const url = await uploadFile(file, path);
      const fieldMap: Record<DocumentType, string> = {
        insurance: "insurance_document_url",
        id: "id_document_url",
        rib: "rib_document_url",
        urssaf: "urssaf_document_url",
      };
      await updateMutation.mutateAsync({ id: provider.id, [fieldMap[type]]: url } as any);
      toast.success(`${DOC_LABELS[type]} uploadé`);
    } catch (err: any) {
      toast.error("Erreur upload: " + err.message);
    } finally {
      setDocUploading(null);
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
    form.setValue("specialties", current.filter((item) => item !== s));
  };

  const onSubmit = async (values: any) => {
    const { email, phone, address, siret, tva_number, structure, iban, bic, insurance_expiry, ...rest } = values;
    const payload: any = {
      ...rest,
      contact_info: { email, phone, address },
      legal_info: { siret, tva_number, structure, iban, bic },
      insurance_expiry: insurance_expiry || null,
    };
    await updateMutation.mutateAsync({ id: provider.id, ...payload });
  };

  const docUrls: Record<DocumentType, string | null> = {
    insurance: insuranceDocUrl,
    id: idDocUrl,
    rib: ribDocUrl,
    urssaf: urssafDocUrl,
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Photo + Identity */}
      <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Avatar */}
            <div className="relative group">
              <div className="h-28 w-28 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-4xl font-bold overflow-hidden border-2 border-border/50">
                {photoUrl ? (
                  <img src={photoUrl} alt={provider.name} className="h-full w-full object-cover" />
                ) : (
                  provider.name.charAt(0).toUpperCase()
                )}
              </div>
              {isOwnProfile && (
                <>
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    {photoUploading ? (
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                    ) : (
                      <Camera className="h-6 w-6 text-white" />
                    )}
                  </button>
                  <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </>
              )}
            </div>

            <div className="flex-1 space-y-4 w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nom complet / Nom de scène</Label>
                  <Input {...form.register("name")} className="rounded-xl h-11" placeholder="Jean Tech / DJ Funky" disabled={!isOwnProfile} />
                </div>
                <div className="space-y-2">
                  <Label>Bio / Présentation</Label>
                  <Textarea {...form.register("bio")} className="rounded-xl resize-none" rows={2} placeholder="Présentez-vous en quelques mots..." disabled={!isOwnProfile} />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="tarifs" className="w-full">
        <TabsList className="bg-muted/50 p-1 rounded-xl w-full grid grid-cols-4">
          <TabsTrigger value="tarifs" className="rounded-lg text-xs">Tarifs</TabsTrigger>
          <TabsTrigger value="contact" className="rounded-lg text-xs">Contact</TabsTrigger>
          <TabsTrigger value="legal" className="rounded-lg text-xs">Légal</TabsTrigger>
          <TabsTrigger value="docs" className="rounded-lg text-xs">Documents</TabsTrigger>
        </TabsList>

        {/* Tarifs & Spécialités */}
        <TabsContent value="tarifs" className="mt-4 space-y-4">
          <Card className="border-border/50 rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><Euro className="h-4 w-4 text-primary" /> Tarification & Spécialités</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Taux Journalier (€ HT)</Label>
                  <div className="relative">
                    <Input type="number" {...form.register("daily_rate", { valueAsNumber: true })} className="rounded-xl h-11 pr-10" disabled={!isOwnProfile} />
                    <Euro className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Taux Horaire (€ HT)</Label>
                  <div className="relative">
                    <Input type="number" {...form.register("hourly_rate", { valueAsNumber: true })} className="rounded-xl h-11 pr-10" disabled={!isOwnProfile} />
                    <Euro className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Spécialités</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: Son, Lumière, DJ..."
                    value={specialtyInput}
                    onChange={(e) => setSpecialtyInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSpecialty(); } }}
                    className="rounded-xl h-11"
                    disabled={!isOwnProfile}
                  />
                  {isOwnProfile && (
                    <Button type="button" onClick={addSpecialty} variant="outline" className="h-11 rounded-xl px-3">
                      <Plus className="h-5 w-5" />
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mt-2 min-h-[32px]">
                  {form.watch("specialties").map((s) => (
                    <Badge key={s} variant="secondary" className="pl-3 pr-1 py-1 gap-1 flex items-center rounded-lg border-primary/20 bg-primary/5 text-primary">
                      {s}
                      {isOwnProfile && (
                        <button type="button" onClick={() => removeSpecialty(s)} className="hover:bg-primary/20 rounded-full p-0.5 transition-colors">
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes internes</Label>
                <Textarea {...form.register("notes")} className="rounded-xl resize-none" rows={2} placeholder="Notes, disponibilités particulières..." disabled={!isOwnProfile} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact */}
        <TabsContent value="contact" className="mt-4 space-y-4">
          <Card className="border-border/50 rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4 text-primary" /> Coordonnées</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> Email</Label>
                <Input type="email" {...form.register("email")} className="rounded-xl h-11" disabled={!isOwnProfile} />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> Téléphone</Label>
                <Input {...form.register("phone")} className="rounded-xl h-11" disabled={!isOwnProfile} />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> Adresse</Label>
                <Input {...form.register("address")} className="rounded-xl h-11" disabled={!isOwnProfile} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Legal */}
        <TabsContent value="legal" className="mt-4 space-y-4">
          <Card className="border-border/50 rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /> Informations Légales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>SIRET</Label>
                  <Input {...form.register("siret")} className="rounded-xl h-11 font-mono" placeholder="123 456 789 00012" disabled={!isOwnProfile} />
                </div>
                <div className="space-y-2">
                  <Label>N° TVA Intracommunautaire</Label>
                  <Input {...form.register("tva_number")} className="rounded-xl h-11 font-mono" placeholder="FR 12 123456789" disabled={!isOwnProfile} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Structure Juridique</Label>
                <Input {...form.register("structure")} className="rounded-xl h-11" placeholder="Auto-entrepreneur, SARL, SAS..." disabled={!isOwnProfile} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" /> Coordonnées Bancaires</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>IBAN</Label>
                <Input {...form.register("iban")} className="rounded-xl h-11 font-mono" placeholder="FR76 ..." disabled={!isOwnProfile} />
              </div>
              <div className="space-y-2">
                <Label>BIC / SWIFT</Label>
                <Input {...form.register("bic")} className="rounded-xl h-11 font-mono" placeholder="XXXXXX" disabled={!isOwnProfile} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Assurance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Date d'expiration assurance RC Pro</Label>
                <Input type="date" {...form.register("insurance_expiry")} className="rounded-xl h-11" disabled={!isOwnProfile} />
              </div>
              {(provider as any).insurance_expiry && (
                <div className="flex items-center gap-2 text-sm">
                  {new Date((provider as any).insurance_expiry) > new Date() ? (
                    <Badge className="bg-success/10 text-success border-success/20">
                      <ShieldCheck className="h-3 w-3 mr-1" /> Assurance à jour
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      Assurance expirée
                    </Badge>
                  )}
                  <span className="text-muted-foreground">
                    Expire le {format(new Date((provider as any).insurance_expiry), "dd/MM/yyyy")}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents */}
        <TabsContent value="docs" className="mt-4 space-y-4">
          <Card className="border-border/50 rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(Object.keys(DOC_LABELS) as DocumentType[]).map((type) => {
                const url = docUrls[type];
                return (
                  <div key={type} className="flex items-center justify-between p-4 bg-muted/20 border border-border/50 rounded-2xl group hover:bg-muted/30 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-background border rounded-xl flex items-center justify-center">
                        {url ? (
                          <Check className="h-5 w-5 text-success" />
                        ) : (
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <span className="text-sm font-medium">{DOC_LABELS[type]}</span>
                        {url && (
                          <p className="text-xs text-success">Document fourni</p>
                        )}
                        {!url && (
                          <p className="text-xs text-muted-foreground">Non fourni</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {url && (
                        <Button type="button" variant="ghost" size="sm" asChild>
                          <a href={url} target="_blank" rel="noopener noreferrer">Voir</a>
                        </Button>
                      )}
                      {isOwnProfile && (
                        <label>
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.jpg,.jpeg,.png,.webp"
                            onChange={(e) => handleDocUpload(type, e)}
                          />
                          <Button type="button" variant="outline" size="sm" className="rounded-lg gap-1 cursor-pointer" asChild>
                            <span>
                              {docUploading === type ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Upload className="h-3 w-3" />
                              )}
                              {url ? "Remplacer" : "Uploader"}
                            </span>
                          </Button>
                        </label>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {isOwnProfile && (
        <div className="flex justify-end gap-3 pt-2">
          <Button type="submit" className="gradient-primary text-white rounded-xl h-11 px-8 shadow-md" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Enregistrement..." : "Sauvegarder mon profil"}
          </Button>
        </div>
      )}
    </form>
  );
}
