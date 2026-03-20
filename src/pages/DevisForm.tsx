/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useClients, useDevis, useFacture, useCreateDevis, useUpdateDevis, useMissions, useMissionMateriel, useMissionAssignments, useDevisAttachments, useUploadDevisAttachment, useDeleteDevisAttachment, useProviders } from "@/hooks/use-data";
import { ArrowLeft, Plus, Trash2, Save, Send, Loader2, Package, MapPin, Image as ImageIcon, FileText, Download, UploadCloud, Paperclip, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Percent, Euro, User, Library } from "lucide-react";
import { useInvoiceItemTemplates } from "@/hooks/use-invoice-templates";
import { useTeam, useTeamMembers } from "@/hooks/use-team";
import { useAuth } from "@/hooks/use-auth";

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  discountType: "percent" | "amount";
  baseRentalPrice?: number;
  baseHourlyRate?: number;
  materielName?: string;
  providerId?: string | null;
}


export default function DevisForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const fromMission = searchParams.get("fromMission");
  const fromDevisId = searchParams.get("fromDevis");
  const fromFactureId = searchParams.get("fromFacture");
  const isEdit = Boolean(id);
  const { data: existing, isLoading: loadingExisting } = useDevis(isEdit ? id : undefined);
  const { data: sourceDevis } = useDevis(!isEdit ? (fromDevisId || undefined) : undefined);
  const { data: sourceFacture } = useFacture(!isEdit ? (fromFactureId || undefined) : undefined);
  const { data: clients = [] } = useClients();
  const { data: missions = [] } = useMissions();
  const createDevis = useCreateDevis();
  const updateDevis = useUpdateDevis();
  const { data: templates = [] } = useInvoiceItemTemplates();
  const { user } = useAuth();
  const teamId = user ? undefined : undefined;

  const { data: providers = [] } = useProviders();
  const { data: attachments = [] } = useDevisAttachments(id);
  const uploadAttachment = useUploadDevisAttachment();
  const deleteAttachment = useDeleteDevisAttachment();

  const { data: teamMembership } = useTeam();
  const { data: teamMembers = [] } = useTeamMembers(teamMembership?.team_id);

  const [clientId, setClientId] = useState("");
  const [missionId, setMissionId] = useState("");

  const { data: missionAssignments = [] } = useMissionAssignments(missionId || undefined);
  const [prestationHours, setPrestationHours] = useState<number>(8);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });
  const [notes, setNotes] = useState("");
  const [tvaEnabled, setTvaEnabled] = useState(true);
  const [tvaRate, setTvaRate] = useState<number>(0.20);
  const [items, setItems] = useState<LineItem[]>([
    { id: "item-0", description: "", quantity: 1, unitPrice: 0, discountAmount: 0, discountType: "percent", providerId: null }
  ]);
  const [globalDiscountAmount, setGlobalDiscountAmount] = useState<number>(0);
  const [globalDiscountType, setGlobalDiscountType] = useState<"percent" | "amount">("percent");

  // Fetch mission materiel when a mission is selected
  const { data: missionMaterielData } = useMissionMateriel(missionId || undefined);

  // Fetch company settings to get origin and price per km
  const { data: whiteLabel } = useQuery({
    queryKey: ["white-label-settings"],
    queryFn: async () => {

      const { data, error } = await (supabase as any)
        .from("white_label_settings")
        .select("company_address, price_per_km, is_tva_subject, tva_rates")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data || {};
    },
  });

  const [calculatingMileage, setCalculatingMileage] = useState(false);

  // Pre-select mission from URL param
  useEffect(() => {
    if (fromMission && !isEdit && !fromDevisId && !fromFactureId && missions.length > 0) {
      setMissionId(fromMission);
    }
  }, [fromMission, isEdit, fromDevisId, fromFactureId, missions]);

  // When mission changes, pre-fill client
  useEffect(() => {
    if (missionId) {

      const mission = missions.find((m: any) => m.id === missionId);
      if (mission?.client_id) {
        setClientId(mission.client_id);
      }
    }
  }, [missionId, missions]);

  useEffect(() => {
    if (existing) {

      setClientId(existing.client_id || "");
      setMissionId(existing.mission_id || "");
      setDate(existing.date);
      setValidUntil(existing.valid_until || "");
      setNotes(existing.notes || "");
      const isActuallySubject = Number(existing.tva_rate) > 0;
      setTvaEnabled(isActuallySubject);
      setTvaRate(isActuallySubject ? Number(existing.tva_rate) : 0.20);
      setGlobalDiscountAmount(Number(existing.discount_amount) || 0);

      setGlobalDiscountType((existing.discount_type as any) || "percent");
      const existingItems = existing.devis_items || [];
      if (existingItems.length > 0) {
        setItems(existingItems.sort((a, b) => a.sort_order - b.sort_order).map((item, i) => ({
          id: `item-${i}`,
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unit_price),
          discountAmount: Number(item.discount_amount) || 0,

          discountType: (item.discount_type as any) || "percent",
          providerId: item.provider_id || null,
        })));
      }
    } else if (sourceDevis) {
      setClientId(sourceDevis.client_id || "");
      setMissionId("");
      const isActuallySubject = Number(sourceDevis.tva_rate) > 0;
      setTvaEnabled(isActuallySubject);
      setTvaRate(isActuallySubject ? Number(sourceDevis.tva_rate) : 0.20);
      setNotes(sourceDevis.notes || "");
      setGlobalDiscountAmount(Number(sourceDevis.discount_amount) || 0);

      setGlobalDiscountType((sourceDevis.discount_type as any) || "percent");
      const sourceItems = sourceDevis.devis_items || [];
      if (sourceItems.length > 0) {
        setItems(sourceItems.sort((a, b) => a.sort_order - b.sort_order).map((item, i) => ({
          id: `item-${i}`,
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unit_price),
          discountAmount: Number(item.discount_amount) || 0,

          discountType: (item.discount_type as any) || "percent",
          providerId: item.provider_id || null,
        })));
      }
    } else if (sourceFacture) {
      setClientId(sourceFacture.client_id || "");
      setMissionId("");
      const isActuallySubject = Number(sourceFacture.tva_rate) > 0;
      setTvaEnabled(isActuallySubject);
      setTvaRate(isActuallySubject ? Number(sourceFacture.tva_rate) : 0.20);
      setNotes(sourceFacture.notes || "");
      setGlobalDiscountAmount(Number(sourceFacture.discount_amount) || 0);

      setGlobalDiscountType((sourceFacture.discount_type as any) || "percent");
      const sourceItems = sourceFacture.facture_items || [];
      if (sourceItems.length > 0) {
        setItems(sourceItems.sort((a, b) => a.sort_order - b.sort_order).map((item, i) => ({
          id: `item-${i}`,
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unit_price),
          discountAmount: Number(item.discount_amount) || 0,

          discountType: (item.discount_type as any) || "percent",

          providerId: (item as any).provider_id || null,
        })));
      }
    } else if (whiteLabel) {
      if (whiteLabel.is_tva_subject === false) {
        setTvaEnabled(false);
      }
      if (Array.isArray(whiteLabel.tva_rates) && whiteLabel.tva_rates.length > 0) {
        // Use the highest/last rate by default
        setTvaRate(Number(whiteLabel.tva_rates[whiteLabel.tva_rates.length - 1]) / 100);
      }
    }
  }, [existing, sourceDevis, sourceFacture, whiteLabel]);

  // Recalculate imported items when hours change
  useEffect(() => {
    setItems(prev => {
      const hasImported = prev.some(i => i.baseRentalPrice !== undefined || i.baseHourlyRate !== undefined);
      if (!hasImported) return prev;
      return prev.map(item => {
        if (item.baseRentalPrice !== undefined) {
          return {
            ...item,
            description: `${item.materielName || "Matériel"} (location ${prestationHours}h)`,
            unitPrice: item.baseRentalPrice * prestationHours,
          };
        }
        if (item.baseHourlyRate !== undefined) {
          return {
            ...item,
            description: `Prestation : ${item.materielName || "Prestataire"} (${prestationHours}h)`,
            quantity: prestationHours,
            unitPrice: item.baseHourlyRate,
          };
        }
        return item;
      });
    });
  }, [prestationHours]);

  const handleImportMateriel = () => {
    if (!missionMaterielData || missionMaterielData.length === 0) {
      toast.error("Aucun matériel assigné à cette mission");
      return;
    }

    const newItems: LineItem[] = missionMaterielData.map((mm: any, i: number) => {
      const rentalPrice = mm.materiel?.rental_price || 0;
      const name = mm.materiel?.name || "Matériel";
      return {
        id: `import-${Date.now()}-${i}`,
        description: `${name} (location ${prestationHours}h)`,
        quantity: mm.quantity,
        unitPrice: rentalPrice * prestationHours,
        discountAmount: 0,
        discountType: "percent",
        baseRentalPrice: rentalPrice,
        materielName: name,
        providerId: null,
      };
    });
    setItems(prev => {
      const filtered = prev.filter(i => i.description || i.unitPrice > 0);
      return [...filtered, ...newItems];
    });
    toast.success(`${newItems.length} ligne(s) importée(s)`);
  };

  const handleImportPrestataires = () => {
    if (!missionAssignments || missionAssignments.length === 0) {
      toast.error("Aucun membre assigné à cette mission");
      return;
    }

    const newItems: LineItem[] = missionAssignments
      .map((assignment: any, i: number) => {
        const member = teamMembers.find(m => m.user_id === assignment.user_id);
        if (!member) return null;

        const hourlyRate = member.hourly_rate || (member.daily_rate ? member.daily_rate / 8 : 0);
        const name = `${member.first_name || ""} ${member.last_name || ""}`.trim() || "Prestataire";

        if (hourlyRate <= 0) return null;

        // Try to match with providers to prefill the dropdown
        const matchedProvider = providers.find((p: any) => p.user_id === member.user_id);

        return {
          id: `import-prest-${Date.now()}-${i}`,
          description: `Prestation : ${name} (${prestationHours}h)`,
          quantity: prestationHours,
          unitPrice: hourlyRate,
          discountAmount: 0,
          discountType: "percent" as const,
          baseHourlyRate: hourlyRate,
          materielName: name,
          providerId: matchedProvider ? matchedProvider.id : null,
        };
      })
      .filter(Boolean) as LineItem[];

    if (newItems.length === 0) {
      toast.warning("Les membres assignés n'ont pas de tarif horaire ou journalier configuré.");
      return;
    }

    setItems(prev => {
      const filtered = prev.filter(i => i.description || i.unitPrice > 0);
      return [...filtered, ...newItems];
    });
    toast.success(`${newItems.length} ligne(s) importée(s)`);
  };

  const handleCalculateMileage = async () => {
    if (!selectedMission || !selectedMission.location) {
      toast.error("La mission sélectionnée ne possède pas d'adresse.");
      return;
    }

    const origin = (whiteLabel as any)?.company_address;

    const pricePerKm = (whiteLabel as any)?.price_per_km || 0.60;

    if (!origin) {
      toast.error("Veuillez configurer l'adresse de votre siège dans les paramètres de l'entreprise.");
      return;
    }

    setCalculatingMileage(true);
    try {
      const { data, error } = await supabase.functions.invoke("calculate-distance", {
        body: { origin, destination: selectedMission.location },
      });

      if (error) {
        let actualError = error.message;
        if (error.context && typeof error.context.json === 'function') {
          const errData = await error.context.json().catch(() => null);
          if (errData && errData.error) {
            actualError = errData.error;
          }
        }
        throw new Error(actualError || "Erreur lors de l'appel à la fonction de distance.");
      }

      if (!data.success) throw new Error(data.error);

      // Defaulting to round trip (aller-retour)
      const exactDistance = Number(data.distance_km);
      const totalKm = exactDistance * 2;
      const roundedTotalKm = Math.ceil(totalKm);

      setItems(prev => {
        const filtered = prev.filter(i => i.description || i.unitPrice > 0);
        return [
          ...filtered,
          {
            id: `ik-${Date.now()}`,
            description: `Indemnités kilométriques (Aller-retour vers ${selectedMission.location})`,
            quantity: roundedTotalKm,
            unitPrice: pricePerKm,
            discountAmount: 0,
            discountType: "percent",
            providerId: null,
          },
        ];
      });
      toast.success(`Trajet calculé : ${data.distance_text} estimé à ${data.duration_text} (Aller simple)`);
    } catch (err: unknown) {
      toast.error(err.message || "Erreur lors du calcul du trajet.");
    } finally {
      setCalculatingMileage(false);
    }
  };

  const addItem = () => setItems(prev => [...prev, { id: `item-${Date.now()}`, description: "", quantity: 1, unitPrice: 0, discountAmount: 0, discountType: "percent", providerId: null }]);

  const addTemplateLine = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;
    setItems(prev => [...prev, {
      id: `item-${Date.now()}`,
      description: template.name + (template.description ? `\n${template.description}` : ""),
      quantity: 1,
      unitPrice: Number(template.default_price),
      discountAmount: 0,
      discountType: "percent",
      providerId: null
    }]);
  };

  const removeItem = (itemId: string) => { if (items.length > 1) setItems(prev => prev.filter(i => i.id !== itemId)); };

  const updateItem = (itemId: string, field: keyof LineItem, value: any) => setItems(prev => prev.map(i => i.id === itemId ? { ...i, [field]: value } : i));

  const totals = useMemo(() => {
    const rawTotalHT = items.reduce((sum, item) => {
      const lineBase = item.quantity * item.unitPrice;
      const lineDiscount = item.discountType === "percent"
        ? lineBase * (item.discountAmount / 100)
        : item.discountAmount;
      return sum + (lineBase - lineDiscount);
    }, 0);

    const globalDiscount = globalDiscountType === "percent"
      ? rawTotalHT * (globalDiscountAmount / 100)
      : globalDiscountAmount;

    const totalHT = Math.max(0, rawTotalHT - globalDiscount);
    const rate = tvaEnabled ? tvaRate : 0;
    return { totalHT, tva: totalHT * rate, totalTTC: totalHT * (1 + rate), rawTotalHT, globalDiscount };
  }, [items, tvaEnabled, tvaRate, globalDiscountAmount, globalDiscountType]);

  const selectedClient = clients.find(c => c.id === clientId);

  const selectedMission = missions.find((m: any) => m.id === missionId);

  const handleSave = async (asDraft: boolean) => {
    // Before creating or updating, if linked to a mission, cancel existing active devis for this mission
    if (!isEdit && missionId) {
      try {
        const { data: oldDevis, error: fetchError } = await supabase
          .from("devis")
          .select("id")
          .eq("mission_id", missionId)
          .neq("status", "annulé")
          .neq("status", "refusé");

        if (!fetchError && oldDevis && oldDevis.length > 0) {
          const { error: updateError } = await supabase
            .from("devis")
            .update({ status: "annulé" })
            .in("id", oldDevis.map(d => d.id));

          if (!updateError) {
            toast.info(`${oldDevis.length} devis obsolète(s) ont été automatiquement annulés pour cette mission.`);
          }
        }
      } catch (err) {
        console.error("Erreur lors de l'annulation des anciens devis:", err);
      }
    }

    const number = isEdit && existing ? existing.number : `DEV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    const basePayload = {
      number,
      client_id: clientId || null,
      mission_id: missionId || null,
      date,
      valid_until: validUntil || null,
      notes: notes || null,
      total_ht: totals.totalHT,
      total_ttc: totals.totalTTC,
      tva_rate: tvaEnabled ? tvaRate : 0,
      discount_amount: globalDiscountAmount,
      discount_type: globalDiscountType,
      status: asDraft ? "brouillon" : "envoyé",
      items: items.map(i => ({
        description: i.description,
        quantity: i.quantity,
        unit_price: i.unitPrice,
        discount_amount: i.discountAmount,
        discount_type: i.discountType,
        provider_id: i.providerId || null,
      })),
    };

    if (isEdit && id) {
      await updateDevis.mutateAsync({ id, ...basePayload });
    } else {
      await createDevis.mutateAsync(basePayload);
    }

    navigate("/finance/devis");
  };

  const saving = createDevis.isPending || updateDevis.isPending;

  if (isEdit && loadingExisting) return <AppLayout><div className="space-y-4 max-w-5xl"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl">
        <button onClick={() => navigate("/finance/devis")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Retour aux devis
        </button>

        <div>
          <h1 className="text-2xl font-display font-bold">{isEdit ? `Modifier ${existing?.number}` : "Nouveau devis"}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {sourceDevis
              ? `Dupliquer le devis ${sourceDevis.number}`
              : sourceFacture
                ? `Importer depuis la facture ${sourceFacture.number}`
                : isEdit
                  ? "Modifiez les informations du devis"
                  : "Créez un nouveau devis"}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-card border-border/50">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-display font-semibold">Informations générales</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Mission (optionnel)</Label>
                    <select value={missionId} onChange={e => setMissionId(e.target.value)} className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm">
                      <option value="">Aucune mission liée</option>
                      {missions.map((m: any) => <option key={m.id} value={m.id}>{m.title}{m.clients?.name ? ` — ${m.clients.name}` : ""}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Client</Label>
                    <select value={clientId} onChange={e => setClientId(e.target.value)} className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm">
                      <option value="">Sélectionner un client...</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ""}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date du devis</Label>
                    <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-11 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>Valide jusqu'au</Label>
                    <Input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className="h-11 rounded-xl" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Heures de prestation + Import matériel */}
            {missionId && (
              <Card className="shadow-card border-border/50 animate-fade-in">
                <CardContent className="p-6 space-y-4">
                  <h3 className="font-display font-semibold flex items-center gap-2">
                    <Package className="h-4 w-4 text-warning" /> Import matériel mission
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                    <div className="space-y-2">
                      <Label>Heures de prestation</Label>
                      <Input
                        type="number"
                        min={1}
                        value={prestationHours}
                        onChange={e => setPrestationHours(Math.max(1, parseInt(e.target.value) || 1))}
                        className="h-11 rounded-xl"
                        placeholder="Ex: 8"
                      />
                      <p className="text-xs text-muted-foreground">Prix unitaire = tarif horaire × heures</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        variant="outline"
                        className="gap-2 rounded-xl h-11 flex-1"
                        onClick={handleImportMateriel}
                        disabled={!missionMaterielData || missionMaterielData.length === 0}
                      >
                        <Package className="h-4 w-4" />
                        Matériel
                      </Button>
                      <Button
                        variant="outline"
                        className="gap-2 rounded-xl h-11 flex-1"
                        onClick={handleImportPrestataires}
                        disabled={!missionAssignments || missionAssignments.length === 0}
                      >
                        <User className="h-4 w-4" />
                        Prestataires
                      </Button>
                    </div>
                  </div>

                  {selectedMission?.location && (
                    <div className="pt-4 mt-4 border-t border-border/50">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium flex items-center gap-1.5"><MapPin className="h-4 w-4 text-primary" /> Distance vers la mission</p>
                          <p className="text-xs text-muted-foreground mt-1">Lieu : {selectedMission.location}</p>
                        </div>
                        <Button
                          variant="secondary"
                          className="gap-2 rounded-xl"
                          onClick={handleCalculateMileage}
                          disabled={calculatingMileage}
                        >
                          {calculatingMileage ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                          Calculer l'indemnité kilométrique
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card className="shadow-card border-border/50">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-semibold">Lignes du devis</h3>
                  <div className="flex items-center gap-2">
                    {templates.length > 0 && (
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            addTemplateLine(e.target.value);
                            e.target.value = "";
                          }
                        }}
                        className="h-9 w-48 rounded-xl border border-input bg-background px-3 py-1 text-sm text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option value="">Insérer un modèle...</option>
                        {templates.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    )}
                    <Button variant="outline" size="sm" className="gap-1.5 rounded-xl" onClick={addItem}><Plus className="h-3.5 w-3.5" /> Ajouter</Button>
                  </div>
                </div>
                <div className="hidden sm:grid grid-cols-[1fr_100px_120px_120px_120px_40px] gap-4 px-3 mb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  <span>Désignation</span><span className="text-center">Qté</span><span className="text-right">Prix HT</span><span className="text-right">Remise</span><span className="text-right">Total HT</span><span />
                </div>
                <div className="space-y-4">
                  {items.map((item, index) => {
                    const lineBase = item.quantity * item.unitPrice;
                    const lineDiscount = item.discountType === "percent"
                      ? lineBase * (item.discountAmount / 100)
                      : item.discountAmount;
                    const lineTotal = lineBase - lineDiscount;
                    const isImported = item.baseRentalPrice !== undefined;
                    return (
                      <div key={item.id} className={cn(
                        "group relative flex flex-col gap-3 p-4 rounded-2xl border transition-all duration-200",
                        isImported
                          ? "border-primary/20 bg-primary/5 shadow-sm"
                          : "border-border/40 bg-card hover:border-border/80 hover:shadow-md"
                      )}>
                        {/* Primary Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_100px_120px_120px_120px_40px] gap-4 items-start">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-[10px] font-bold text-muted-foreground/60 uppercase">Ligne {index + 1}</span>
                              {isImported && (
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                                  <Package className="h-3 w-3 text-primary" />
                                  <span className="text-[9px] font-bold text-primary uppercase">Importé · {item.baseRentalPrice?.toFixed(2)}€/h</span>
                                </div>
                              )}
                            </div>
                            <Textarea
                              placeholder="Description de la prestation ou de l'article..."
                              value={item.description}
                              onChange={e => updateItem(item.id, "description", e.target.value)}
                              className="min-h-[60px] rounded-xl text-sm resize-none bg-background/50 border-none focus-visible:ring-1"
                            />
                          </div>

                          <div className="flex flex-col gap-2 sm:pt-6">
                            <Input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={e => updateItem(item.id, "quantity", Math.max(1, parseInt(e.target.value) || 1))}
                              className="h-10 rounded-xl text-sm text-center font-medium bg-background/50"
                            />
                          </div>

                          <div className="flex flex-col gap-2 sm:pt-6">
                            <div className="relative">
                              <Input
                                type="number"
                                min={0}
                                step={0.01}
                                value={item.unitPrice}
                                onChange={e => updateItem(item.id, "unitPrice", Math.max(0, parseFloat(e.target.value) || 0))}
                                className={cn("h-10 rounded-xl text-sm text-right pr-7 font-medium bg-background/50", isImported && "text-primary")}
                                readOnly={isImported}
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">€</span>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 sm:pt-6">
                            <div className="relative flex flex-col gap-1">
                              <div className="relative">
                                <Input
                                  type="number"
                                  min={0}
                                  step={item.discountType === "percent" ? 1 : 0.01}
                                  value={item.discountAmount}
                                  onChange={e => updateItem(item.id, "discountAmount", Math.max(0, parseFloat(e.target.value) || 0))}
                                  className="h-10 rounded-xl text-sm text-right pr-7 bg-background/50"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                                  {item.discountType === "percent" ? "%" : "€"}
                                </span>
                              </div>
                              <ToggleGroup
                                type="single"
                                size="sm"
                                value={item.discountType}
                                onValueChange={(val) => val && updateItem(item.id, "discountType", val)}
                                className="justify-end scale-75 origin-right -mt-1"
                              >
                                <ToggleGroupItem value="percent" className="h-6 w-6 p-0 rounded-md" aria-label="Pourcentage">
                                  <Percent className="h-3 w-3" />
                                </ToggleGroupItem>
                                <ToggleGroupItem value="amount" className="h-6 w-6 p-0 rounded-md" aria-label="Montant fixe">
                                  <Euro className="h-3 w-3" />
                                </ToggleGroupItem>
                              </ToggleGroup>
                            </div>
                          </div>

                          <div className="flex items-center justify-end h-10 sm:pt-6">
                            <span className="text-sm font-bold text-foreground">{lineTotal.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€</span>
                          </div>

                          <div className="flex items-center justify-center h-10 sm:pt-6 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => removeItem(item.id)}
                              disabled={items.length <= 1}
                              className={cn(
                                "p-2 rounded-xl transition-all",
                                items.length > 1 ? "hover:bg-destructive/10 text-muted-foreground hover:text-destructive" : "text-muted-foreground/20 cursor-not-allowed"
                              )}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Secondary Interactive Area (Provider Selection) */}
                        <div className="flex items-center gap-4 pt-2 mt-2 border-t border-border/40">
                          <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider min-w-[70px]">
                            <User className="h-3 w-3 text-primary/60" /> Prestataire
                          </div>
                          <select
                            value={item.providerId || ""}
                            onChange={e => {
                              const pId = e.target.value || null;
                              updateItem(item.id, "providerId", pId);
                              if (pId) {

                                const provider = providers.find((m: any) => m.id === pId);
                                if (provider) {
                                  const rate = Number(provider.daily_rate) || Number(provider.hourly_rate) || 0;
                                  if (rate > 0) {
                                    updateItem(item.id, "unitPrice", rate);
                                    toast.info(`Prix importé : ${rate}€`);
                                  }
                                }
                              }
                            }}
                            className="bg-transparent border-none text-xs font-medium text-muted-foreground focus:ring-0 cursor-pointer hover:text-primary transition-colors pr-8"
                          >
                            <option value="">Aucun prestataire de l'équipe</option>
                            {providers.map((m: any) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center gap-4 mt-6">
                  <Button
                    onClick={addItem}
                    className="flex-1 py-6 border-2 border-dashed border-border rounded-2xl text-sm font-semibold hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all shadow-none"
                    variant="ghost"
                  >
                    <Plus className="h-4 w-4 mr-2" /> Ajouter une ligne manuelle
                  </Button>
                  {templates.length > 0 && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="h-12 px-6 rounded-2xl gap-2 font-semibold">
                          <Library className="h-4 w-4" />
                          Modèles
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-2 rounded-2xl" align="end">
                        <div className="space-y-1">
                          {templates.map(t => (
                            <button
                              key={t.id}
                              className="w-full text-left p-2 hover:bg-muted rounded-xl transition-colors"
                              onClick={() => {
                                const newItem = {
                                  id: crypto.randomUUID(),
                                  description: t.description || t.name,
                                  quantity: 1,
                                  unitPrice: Number(t.default_price) || 0,
                                  discountAmount: 0,
                                  discountType: "percent" as const,
                                  providerId: null,
                                };
                                setItems([...items, newItem]);
                              }}
                            >
                              <p className="text-sm font-bold">{t.name}</p>
                              {t.default_price && <p className="text-[10px] text-muted-foreground">{t.default_price}€ HT</p>}
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card border-border/50 overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_350px] divide-x divide-border/40">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-2 border-b pb-3 mb-4">
                    <FileText className="h-4 w-4 text-primary" />
                    <h3 className="font-display font-semibold">Notes & conditions</h3>
                  </div>
                  <Textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Précisez ici vos conditions de règlement, délais ou notes spécifiques..."
                    className="min-h-[180px] rounded-2xl border-none bg-muted/20 focus-visible:ring-1 resize-none text-sm p-4"
                  />
                </CardContent>

                <CardContent className="p-6 bg-muted/5">
                  <div className="flex items-center justify-between gap-2 border-b pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <Paperclip className="h-4 w-4 text-primary" />
                      <h3 className="font-display font-semibold text-sm">Photos jointes</h3>
                    </div>
                    {isEdit && id && (
                      <label className="cursor-pointer">
                        <Input
                          type="file"
                          multiple
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const files = e.target.files;
                            if (files) {
                              Array.from(files).forEach(file => uploadAttachment.mutate({ devisId: id, file }));
                            }
                          }}
                          disabled={uploadAttachment.isPending}
                        />
                        <Button variant="ghost" size="sm" className="h-8 px-2 rounded-lg text-xs gap-1.5" asChild>
                          <span>
                            {uploadAttachment.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                            Ajouter
                          </span>
                        </Button>
                      </label>
                    )}
                  </div>

                  {!isEdit ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center bg-muted/10 rounded-2xl border border-dashed border-border/60">
                      <UploadCloud className="h-8 w-8 text-muted-foreground/30 mb-3" />
                      <p className="text-[11px] text-muted-foreground px-4 italic">Enregistrez le devis pour ajouter des photos.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {attachments.length === 0 && !uploadAttachment.isPending && (
                        <div className="text-center py-10 text-muted-foreground/40 bg-muted/10 rounded-2xl border border-dashed">
                          <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-20" />
                          <p className="text-[11px] italic">Aucune photo.</p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        {attachments.map((file: any) => (
                          <div key={file.id} className="group relative aspect-square rounded-xl overflow-hidden border border-border/40 bg-background shadow-sm hover:shadow-md transition-all">
                            <img
                              src={file.file_url}
                              alt={file.file_name}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                              <Button
                                variant="secondary"
                                size="icon"
                                className="h-7 w-7 rounded-md"
                                asChild
                              >
                                <a href={file.file_url} target="_blank" rel="noreferrer">
                                  <Download className="h-3.5 w-3.5" />
                                </a>
                              </Button>
                              <Button
                                variant="destructive"
                                size="icon"
                                className="h-7 w-7 rounded-md"
                                onClick={() => deleteAttachment.mutate({ id: file.id, devisId: id as string, fileUrl: file.file_url })}
                                disabled={deleteAttachment.isPending}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        {uploadAttachment.isPending && (
                          <div className="aspect-square rounded-xl border border-dashed flex items-center justify-center bg-muted/20">
                            <Loader2 className="h-5 w-5 animate-spin text-primary/40" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            {selectedMission && (
              <Card className="shadow-card border-border/50 animate-fade-in">
                <CardContent className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Mission liée</p>
                  <p className="font-semibold text-sm">{selectedMission.title}</p>
                  {selectedMission.clients?.name && <p className="text-xs text-muted-foreground">{selectedMission.clients.name}</p>}
                  <Button variant="ghost" size="sm" className="mt-2 w-full rounded-xl text-xs" onClick={() => navigate(`/missions/${missionId}`)}>Voir la mission</Button>
                </CardContent>
              </Card>
            )}
            {selectedClient && (
              <Card className="shadow-card border-border/50 animate-fade-in">
                <CardContent className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Client sélectionné</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">{selectedClient.name.split(" ").map(w => w[0]).join("")}</div>
                    <div><p className="font-semibold text-sm">{selectedClient.name}</p>{selectedClient.company && <p className="text-xs text-muted-foreground">{selectedClient.company}</p>}</div>
                  </div>
                </CardContent>
              </Card>
            )}
            <Card className="shadow-card border-border/50 sticky top-24">
              <CardContent className="p-5 space-y-4">
                <h3 className="font-display font-semibold">Récapitulatif</h3>
                <div className="flex items-center justify-between mb-1">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Appliquer la TVA</Label>
                    {tvaEnabled && (whiteLabel?.tva_rates as any[])?.length > 1 ? (
                      <select
                        value={tvaRate * 100}
                        onChange={e => setTvaRate(parseFloat(e.target.value) / 100)}
                        className="block w-full mt-1 text-xs border-none bg-transparent p-0 focus:ring-0 text-primary font-bold"
                      >
                        {(whiteLabel.tva_rates as any[]).map(r => (
                          <option key={r} value={r}>{r}%</option>
                        ))}
                      </select>
                    ) : (
                      tvaEnabled && <p className="text-[10px] text-primary font-bold">Taux : {tvaRate * 100}%</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setTvaEnabled(v => !v)}
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                      tvaEnabled ? "bg-primary" : "bg-muted"
                    )}
                  >
                    <span className={cn(
                      "pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform",
                      tvaEnabled ? "translate-x-5" : "translate-x-0"
                    )} />
                  </button>
                </div>
                <div className="space-y-4 pt-2 border-t border-border">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Remise sur le total</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type="number"
                          min={0}
                          step={globalDiscountType === "percent" ? 1 : 0.01}
                          value={globalDiscountAmount}
                          onChange={e => setGlobalDiscountAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="h-9 rounded-lg text-sm text-right pr-7"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          {globalDiscountType === "percent" ? "%" : "€"}
                        </span>
                      </div>
                      <ToggleGroup
                        type="single"
                        size="sm"
                        value={globalDiscountType}

                        onValueChange={(val) => val && setGlobalDiscountType(val as any)}
                        className="border rounded-lg p-0.5"
                      >
                        <ToggleGroupItem value="percent" className="h-8 w-8 p-0" aria-label="Pourcentage">
                          <Percent className="h-4 w-4" />
                        </ToggleGroupItem>
                        <ToggleGroupItem value="amount" className="h-8 w-8 p-0" aria-label="Montant fixe">
                          <Euro className="h-4 w-4" />
                        </ToggleGroupItem>
                      </ToggleGroup>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm pt-2">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Total HT (lignes)</span>
                      <span>{totals.rawTotalHT.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€</span>
                    </div>
                    {totals.globalDiscount > 0 && (
                      <div className="flex justify-between text-destructive italic">
                        <span>Remise globale</span>
                        <span>-{totals.globalDiscount.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€</span>
                      </div>
                    )}
                    <div className="flex justify-between font-medium pt-1">
                      <span>Total Net HT</span>
                      <span>{totals.totalHT.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€</span>
                    </div>
                    {tvaEnabled && (
                      <div className="flex justify-between text-muted-foreground font-medium">
                        <span>TVA ({tvaRate * 100}%)</span>
                        <span>{totals.tva.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-3 border-t border-border">
                      <span className="font-semibold text-base">{tvaEnabled ? "Total TTC" : "Total"}</span>
                      <span className="font-bold text-lg text-primary">{totals.totalTTC.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€</span>
                    </div>
                  </div>
                </div>
                <div className="pt-2 space-y-2">
                  <Button className="w-full gradient-primary text-white gap-2 rounded-xl hover:opacity-90" onClick={() => handleSave(false)} disabled={saving}><Send className="h-4 w-4" /> Enregistrer & Envoyer</Button>
                  <Button variant="outline" className="w-full gap-2 rounded-xl" onClick={() => handleSave(true)} disabled={saving}><Save className="h-4 w-4" /> Brouillon</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout >
  );
}
