import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { WorkspaceBackLink, WorkspaceHero, WorkspacePage, WorkspacePanel } from "@/components/layout/Workspace";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClient, useCreateClient, useUpdateClient } from "@/hooks/use-data";
import { ArrowLeft, Save, UserPlus, Building2, User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { Skeleton } from "@/components/ui/skeleton";
import { CompanyAutocomplete } from "@/components/CompanyAutocomplete";

const clientSchema = z.object({
  name: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères").max(100, "100 caractères max"),
  email: z.string().trim().email("Email invalide").max(255, "255 caractères max").or(z.literal("")),
  phone: z.string().trim().max(20, "20 caractères max").optional().default(""),
  company: z.string().trim().max(100, "100 caractères max").optional().default(""),
  address: z.string().trim().max(300, "300 caractères max").optional().default(""),
  vat_number: z.string().trim().max(20, "20 caractères max").optional().default(""),
  notes: z.string().trim().optional().default(""),
});

type ClientFormData = z.infer<typeof clientSchema>;
type FormErrors = Partial<Record<keyof ClientFormData, string>>;

export default function ClientForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { data: existing, isLoading: loadingExisting } = useClient(isEdit ? id : undefined);
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();

  const [form, setForm] = useState<ClientFormData>({
    name: "",
    email: "",
    phone: "",
    company: "",
    address: "",
    vat_number: "",
    notes: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [hasType, setHasType] = useState<"particulier" | "entreprise">("particulier");

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name || "",
        email: existing.email || "",
        phone: existing.phone || "",
        company: existing.company || "",
        address: existing.address || "",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vat_number: (existing as any).vat_number || "",
        notes: existing.notes || "",
      });
      setHasType(existing.company ? "entreprise" : "particulier");
    }
  }, [existing]);

  const updateField = (field: keyof ClientFormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (touched.has(field)) {
      const result = clientSchema.shape[field].safeParse(value);
      setErrors(prev => ({ ...prev, [field]: result.success ? undefined : result.error.issues[0]?.message }));
    }
  };

  const markTouched = (field: string) => {
    setTouched(prev => new Set(prev).add(field));
    const result = clientSchema.shape[field as keyof ClientFormData].safeParse(form[field as keyof ClientFormData]);
    if (!result.success) {
      setErrors(prev => ({ ...prev, [field]: result.error.issues[0]?.message }));
    }
  };

  const handleSave = async () => {
    const result = clientSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: FormErrors = {};
      result.error.issues.forEach(issue => {
        const field = issue.path[0] as keyof ClientFormData;
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      setTouched(new Set(Object.keys(fieldErrors)));
      return;
    }

    const payload = {
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      company: hasType === "entreprise" ? form.company || null : null,
      address: form.address || null,
      vat_number: hasType === "entreprise" ? form.vat_number || null : null,
      notes: form.notes || null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    if (isEdit && id) {
      await updateClient.mutateAsync({ id, ...payload });
    } else {
      await createClient.mutateAsync(payload);
    }
    navigate("/clients");
  };

  const saving = createClient.isPending || updateClient.isPending;

  if (isEdit && loadingExisting) return <AppLayout><div className="space-y-4 max-w-3xl"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div></AppLayout>;

  return (
    <AppLayout>
      <WorkspacePage className="max-w-6xl">
        <WorkspaceBackLink to="/clients" label="Retour aux clients" />

        <WorkspaceHero
          eyebrow="Relation"
          title={isEdit ? `Modifier ${existing?.name || ""}` : "Nouveau client"}
          description={isEdit ? "Mettez à jour les informations relationnelles, commerciales et administratives du client." : "Créez une fiche client structurée avec le bon type de compte, les coordonnées et les informations de facturation."}
          actions={(
            <Button className="gap-2 rounded-2xl" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? <Save className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
              {isEdit ? "Enregistrer" : "Créer le client"}
            </Button>
          )}
          aside={(
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-[24px] border border-border/60 bg-background/80 p-4 shadow-inner">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Type de compte</p>
                <p className="mt-2 text-lg font-display font-semibold text-foreground">{hasType === "entreprise" ? "Entreprise" : "Particulier"}</p>
                <p className="mt-1 text-sm text-muted-foreground">Le formulaire adapte les champs administratifs.</p>
              </div>
              <div className="rounded-[24px] border border-border/60 bg-background/80 p-4 shadow-inner">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Validation</p>
                <p className="mt-2 text-2xl font-display font-bold text-primary">{Object.values(errors).filter(Boolean).length}</p>
                <p className="mt-1 text-sm text-muted-foreground">champ(s) nécessitant une correction.</p>
              </div>
              <div className="rounded-[24px] border border-border/60 bg-background/80 p-4 shadow-inner">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">État</p>
                <p className="mt-2 text-lg font-display font-semibold text-foreground">{isEdit ? "Modification" : "Création"}</p>
                <p className="mt-1 text-sm text-muted-foreground">Le client sera disponible dans la collection après enregistrement.</p>
              </div>
            </div>
          )}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <Card className="shadow-card border-border/50">
          <CardContent className="p-6 space-y-4">
            <h3 className="font-display font-semibold">Type de client</h3>
            <div className="grid grid-cols-2 gap-3">
              {([
                { value: "particulier" as const, label: "Particulier", icon: User, desc: "Personne physique" },
                { value: "entreprise" as const, label: "Entreprise", icon: Building2, desc: "Société / Association" },
              ]).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setHasType(opt.value)}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left",
                    hasType === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                  )}
                >
                  <div className={cn("p-2 rounded-lg", hasType === opt.value ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                    <opt.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
            </Card>

            <Card className="shadow-card border-border/50">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-display font-semibold">Informations de contact</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nom complet *</Label>
                    <Input placeholder="Jean Dupont" value={form.name} onChange={e => updateField("name", e.target.value)} onBlur={() => markTouched("name")} className={cn("h-11 rounded-xl", errors.name && "border-destructive")} />
                    {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" placeholder="jean@example.com" value={form.email} onChange={e => updateField("email", e.target.value)} onBlur={() => markTouched("email")} className={cn("h-11 rounded-xl", errors.email && "border-destructive")} />
                    {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Téléphone</Label>
                    <Input placeholder="06 12 34 56 78" value={form.phone} onChange={e => updateField("phone", e.target.value)} className="h-11 rounded-xl" />
                  </div>
                  {hasType === "entreprise" && (
                    <div className="space-y-2">
                      <Label>Entreprise</Label>
                      <CompanyAutocomplete
                        value={form.company}
                        onChange={v => updateField("company", v)}
                        onCompanySelect={(c) => {
                          if (!form.name) updateField("name", c.name);
                          if (!form.address) updateField("address", c.address);
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          if ((c as any).vatNumber) updateField("vat_number", (c as any).vatNumber);
                        }}
                        className="h-11 rounded-xl"
                      />
                    </div>
                  )}
                  {hasType === "entreprise" && (
                    <div className="space-y-2">
                      <Label>N° TVA Intra (optionnel)</Label>
                      <Input
                        placeholder="FR00 123 456 789"
                        value={form.vat_number}
                        onChange={e => updateField("vat_number", e.target.value)}
                        className="h-11 rounded-xl"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <WorkspacePanel title="Récapitulatif" description="Contrôles rapides avant validation." className="lg:sticky lg:top-24">
              <div className="space-y-4">
                <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Nom</p>
                  <p className="mt-1 font-medium text-foreground">{form.name || "Non renseigné"}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Contact</p>
                  <p className="mt-1 text-sm text-foreground">{form.email || "Aucun email"}</p>
                  <p className="text-sm text-muted-foreground">{form.phone || "Aucun téléphone"}</p>
                </div>
                {hasType === "entreprise" && (
                  <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Entreprise</p>
                    <p className="mt-1 font-medium text-foreground">{form.company || "Non renseignée"}</p>
                    <p className="text-sm text-muted-foreground">{form.vat_number || "TVA non renseignée"}</p>
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1 rounded-2xl" onClick={() => navigate("/clients")}>Annuler</Button>
                  <Button className="flex-1 gap-2 rounded-2xl" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? <Save className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                    {isEdit ? "Enregistrer" : "Créer"}
                  </Button>
                </div>
              </div>
            </WorkspacePanel>
          </div>
        </div>

      </WorkspacePage>
    </AppLayout>
  );
}
