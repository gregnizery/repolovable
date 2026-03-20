import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { WorkspaceBackLink, WorkspaceHero, WorkspacePage } from "@/components/layout/Workspace";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClients, useMission, useCreateMission, useUpdateMission, useDevisList, useUpdateDevis } from "@/hooks/use-data";
import { ArrowLeft, Save, Calendar, MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { Skeleton } from "@/components/ui/skeleton";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";

const missionSchema = z.object({
  title: z.string().trim().min(3, "Le titre doit contenir au moins 3 caractères"),
  clientId: z.string().min(1, "Sélectionnez un client"),
  startDate: z.string().min(1, "Date de début requise"),
  endDate: z.string().optional(),
  location: z.string().trim().optional(),
  eventType: z.string().optional(),
  devisId: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
});

type MissionFormData = z.infer<typeof missionSchema>;
type FormErrors = Partial<Record<keyof MissionFormData, string>>;

const missionTypes = ["Mariage", "Corporate", "Festival", "Anniversaire", "Gala", "Soirée privée", "Concert", "Autre"];

export default function MissionForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { data: existing, isLoading: loadingExisting } = useMission(isEdit ? id : undefined);
  const { data: clients = [] } = useClients();
  const createMission = useCreateMission();
  const updateMission = useUpdateMission();
  const { data: devisList = [] } = useDevisList();
  const updateDevis = useUpdateDevis();

  const [form, setForm] = useState<MissionFormData>({
    title: "",
    clientId: "",
    startDate: "",
    endDate: "",
    location: "",
    eventType: "",
    devisId: "",
    description: "",
    notes: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (existing) {
      setForm({
        title: existing.title || "",
        clientId: existing.client_id || "",
        startDate: existing.start_date ? new Date(existing.start_date).toLocaleString("sv-SE").replace(" ", "T").substring(0, 16) : "",
        endDate: existing.end_date ? new Date(existing.end_date).toLocaleString("sv-SE").replace(" ", "T").substring(0, 16) : "",
        location: existing.location || "",
        eventType: existing.event_type || "",
        devisId: existing.devis && Array.isArray(existing.devis) && existing.devis.length > 0 ? existing.devis[0].id : "",
        description: existing.description || "",
        notes: existing.notes || "",
      });
    }
  }, [existing]);

  const updateField = (field: keyof MissionFormData, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const markTouched = (field: string) => {
    setTouched(prev => new Set(prev).add(field));
  };

  const selectedClient = clients.find(c => c.id === form.clientId);

  const initialDevisId = existing?.devis && Array.isArray(existing.devis) && existing.devis.length > 0 ? existing.devis[0].id : null;

  const availableDevis = devisList.filter(d =>
    (!form.clientId || d.client_id === form.clientId) &&
    (!d.mission_id || d.mission_id === id) &&
    d.status !== "brouillon" && d.status !== "refusé"
  );

  const selectedDevis = devisList.find(d => d.id === form.devisId);

  const handleSave = async () => {
    const result = missionSchema.safeParse(form);

    let isPastDate = false;
    if (!isEdit && form.startDate) {
      const selected = new Date(form.startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selected < today) {
        isPastDate = true;
      }
    }

    if (!result.success || isPastDate) {
      const fieldErrors: FormErrors = {};
      if (!result.success) {
        result.error.issues.forEach(issue => {
          const field = issue.path[0] as keyof MissionFormData;
          if (!fieldErrors[field]) fieldErrors[field] = issue.message;
        });
      }
      if (isPastDate) {
        fieldErrors.startDate = "Vous ne pouvez pas planifier une mission dans le passé.";
      }
      setErrors(fieldErrors);
      setTouched(new Set(Object.keys(fieldErrors)));
      return;
    }

    const payload = {
      title: form.title,
      client_id: form.clientId || null,
      start_date: form.startDate ? new Date(form.startDate).toISOString() : null,
      end_date: form.endDate ? new Date(form.endDate).toISOString() : null,
      location: form.location || null,
      event_type: form.eventType || null,
      description: form.description || null,
      notes: form.notes || null,
    };

    let missionId = id;
    if (isEdit && id) {
      await updateMission.mutateAsync({ id, ...payload });
    } else {
      const created = await createMission.mutateAsync(payload);
      missionId = created.id;
    }

    if (missionId) {
      if (form.devisId && form.devisId !== initialDevisId) {
        await updateDevis.mutateAsync({ id: form.devisId, mission_id: missionId });
      }
      if (initialDevisId && form.devisId !== initialDevisId) {
        await updateDevis.mutateAsync({ id: initialDevisId, mission_id: null });
      }
    }

    navigate("/missions");
  };

  const saving = createMission.isPending || updateMission.isPending || updateDevis.isPending;

  if (isEdit && loadingExisting) return <AppLayout><div className="space-y-4 max-w-5xl"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div></AppLayout>;

  return (
    <AppLayout>
      <WorkspacePage className="max-w-6xl">
        <WorkspaceBackLink to="/missions" label="Retour aux missions" />

        <WorkspaceHero
          eyebrow="Opérations"
          title={isEdit ? "Modifier la mission" : "Nouvelle mission"}
          description={isEdit ? "Ajustez le cadrage opérationnel, les dates, le devis lié et les informations terrain." : "Créez une mission structurée avec client, calendrier, lieu d’intervention et rattachement commercial."}
          actions={(
            <Button className="gap-2 rounded-2xl" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isEdit ? "Enregistrer" : "Créer la mission"}
            </Button>
          )}
          aside={(
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-[24px] border border-border/60 bg-background/80 p-4 shadow-inner">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Client</p>
                <p className="mt-2 text-lg font-display font-semibold text-foreground">{selectedClient?.name || "Non sélectionné"}</p>
                <p className="mt-1 text-sm text-muted-foreground">{selectedClient?.company || "Renseignez un client pour lier les devis."}</p>
              </div>
              <div className="rounded-[24px] border border-border/60 bg-background/80 p-4 shadow-inner">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Planning</p>
                <p className="mt-2 text-lg font-display font-semibold text-foreground">{form.startDate ? "Daté" : "À planifier"}</p>
                <p className="mt-1 text-sm text-muted-foreground">{form.startDate ? new Date(form.startDate).toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).replace(" à", " -") : "Aucune date de début définie."}</p>
              </div>
              <div className="rounded-[24px] border border-border/60 bg-background/80 p-4 shadow-inner">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Devis lié</p>
                <p className="mt-2 text-lg font-display font-semibold text-foreground">{selectedDevis?.number || "Aucun"}</p>
                <p className="mt-1 text-sm text-muted-foreground">{selectedDevis ? `${selectedDevis.total_ht.toLocaleString("fr-FR")}€ HT` : "Associez un devis si la mission en dépend."}</p>
              </div>
            </div>
          )}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-card border-border/50">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-display font-semibold">Informations générales</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Titre de la mission *</Label>
                    <Input placeholder="Ex: Mariage Dupont-Martin" value={form.title} onChange={e => updateField("title", e.target.value)} onBlur={() => markTouched("title")} className={cn("h-11 rounded-xl", errors.title && "border-destructive")} />
                    {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Client *</Label>
                    <select value={form.clientId} onChange={e => updateField("clientId", e.target.value)} className={cn("flex h-11 w-full rounded-xl border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", errors.clientId ? "border-destructive" : "border-input")}>
                      <option value="">Sélectionner un client...</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ""}</option>)}
                    </select>
                    {errors.clientId && <p className="text-xs text-destructive">{errors.clientId}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <select value={form.eventType} onChange={e => updateField("eventType", e.target.value)} className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm">
                      <option value="">Sélectionner un type...</option>
                      {missionTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">Devis associé</Label>
                    <select value={form.devisId} onChange={e => updateField("devisId", e.target.value)} disabled={!form.clientId && availableDevis.length === 0} className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground">
                      <option value="">Aucun devis lié</option>
                      {availableDevis.map(d => <option key={d.id} value={d.id}>{d.number} - {d.total_ht.toLocaleString('fr-FR')}€ HT</option>)}
                    </select>
                    {!form.clientId && <p className="text-[10px] text-muted-foreground">Sélectionnez d'abord un client pour voir ses devis.</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card border-border/50">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-display font-semibold flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /> Date & Lieu</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date de début *</Label>
                    <Input type="datetime-local" value={form.startDate} onChange={e => updateField("startDate", e.target.value)} onBlur={() => markTouched("startDate")} className={cn("h-11 rounded-xl", errors.startDate && "border-destructive")} />
                    {errors.startDate && <p className="text-xs text-destructive">{errors.startDate}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Date de fin</Label>
                    <Input type="datetime-local" value={form.endDate} onChange={e => updateField("endDate", e.target.value)} className="h-11 rounded-xl" />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Lieu</Label>
                    <AddressAutocomplete
                      value={form.location || ""}
                      onChange={val => updateField("location", val)}
                      className="h-11 rounded-xl"
                      placeholder="Ex: Château de Versailles"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card border-border/50">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-display font-semibold">Description & Notes</h3>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <textarea value={form.description} onChange={e => updateField("description", e.target.value)} placeholder="Détails de la mission..." rows={3} className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </div>
                <div className="space-y-2">
                  <Label>Notes internes</Label>
                  <textarea value={form.notes} onChange={e => updateField("notes", e.target.value)} placeholder="Notes internes..." rows={2} className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            {selectedClient && (
              <Card className="shadow-card border-border/50 animate-fade-in">
                <CardContent className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Client</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                      {selectedClient.name.split(" ").map(w => w[0]).join("")}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{selectedClient.name}</p>
                      {selectedClient.company && <p className="text-xs text-muted-foreground">{selectedClient.company}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="shadow-card border-border/50 sticky top-24">
              <CardContent className="p-5 space-y-3">
                <h3 className="font-display font-semibold">Récapitulatif</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Budget</span><span className="font-bold text-primary">{selectedDevis ? `${selectedDevis.total_ht.toLocaleString('fr-FR')}€ HT` : '0€'}</span></div>
                  {form.startDate && <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span className="font-medium">{new Date(form.startDate).toLocaleString("fr-FR", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }).replace(" à", " -")}</span></div>}
                  {form.location && <div className="flex justify-between"><span className="text-muted-foreground">Lieu</span><span className="font-medium text-right max-w-[150px] truncate">{form.location}</span></div>}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </WorkspacePage>
    </AppLayout>
  );
}
