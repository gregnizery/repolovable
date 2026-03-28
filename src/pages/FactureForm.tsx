/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useClients, useFacture, useDevis, useCreateFacture, useUpdateFacture, useProviders, useMissions, useMissionAssignments } from "@/hooks/use-data";
import { ArrowLeft, Plus, Trash2, Save, Send, Loader2, Percent, Euro, Package, Lock, Ban, User, Library, FileText } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useInvoiceItemTemplates } from "@/hooks/use-invoice-templates";
import { useTeam, useTeamMembers } from "@/hooks/use-team";
import { getAssignableProviders, normalizeAssignedProviderId } from "@/lib/provider-assignment";

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  discountType: "percent" | "amount";
  providerId?: string | null;
  baseHourlyRate?: number;
  materielName?: string;
}


export default function FactureForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const fromDevisId = searchParams.get("fromDevis");
  const fromFactureId = searchParams.get("fromFacture");
  const isEdit = Boolean(id);
  const { data: existing, isLoading: loadingExisting } = useFacture(isEdit ? id : undefined);
  const { data: sourceDevis } = useDevis(!isEdit ? (fromDevisId || undefined) : undefined);
  const { data: sourceFacture } = useFacture(!isEdit ? (fromFactureId || undefined) : undefined);
  const { data: clients = [] } = useClients();
  const { data: missions = [] } = useMissions();
  const createFacture = useCreateFacture();
  const updateFacture = useUpdateFacture();

  const typeParam = searchParams.get("type") || (existing?.type as string) || "invoice";
  const parentFactureId = (searchParams.get("fromFacture") && searchParams.get("type") === "credit_note")
    ? searchParams.get("fromFacture")
    : (existing?.parent_facture_id || null);

  const isReadOnly = useMemo(() => {
    if (!existing) return false;

    return (existing as any).devis?.status === "accepté";
  }, [existing]);

  const { data: templates = [] } = useInvoiceItemTemplates();

  const { data: teamMembership } = useTeam();
  const { data: teamMembers = [] } = useTeamMembers(teamMembership?.team_id);

  const { data: providers = [] } = useProviders();
  const assignableProviders = useMemo(() => getAssignableProviders(providers), [providers]);
  const { data: whiteLabel } = useQuery({
    queryKey: ["white-label-settings", teamMembership?.team_id],
    queryFn: async () => {
      if (!teamMembership?.team_id) return {};

      const { data, error } = await (supabase as any)
        .from("white_label_settings")
        .select("is_tva_subject, tva_rates")
        .eq("team_id", teamMembership.team_id)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data || {};
    },
    enabled: !!teamMembership?.team_id,
  });

  const [clientId, setClientId] = useState("");
  const [missionId, setMissionId] = useState("");
  const [prestationHours, setPrestationHours] = useState<number>(8);
  const { data: missionAssignments = [] } = useMissionAssignments(missionId || undefined);

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(() => {
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

  useEffect(() => {
    if (existing) {
      setClientId(existing.client_id || "");
      setDate(existing.date);
      setDueDate(existing.due_date || "");
      setNotes(existing.notes || "");
      const isActuallySubject = Number(existing.tva_rate) > 0;
      setTvaEnabled(isActuallySubject);
      setTvaRate(isActuallySubject ? Number(existing.tva_rate) : 0.20);
      setGlobalDiscountAmount(Number(existing.discount_amount) || 0);

      setGlobalDiscountType((existing.discount_type as any) || "percent");
      const existingItems = existing.facture_items || [];
      if (existingItems.length > 0) {
        setItems(existingItems.sort((a, b) => a.sort_order - b.sort_order).map((item, i) => ({
          id: `item-${i}`,
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unit_price),
          discountAmount: Number(item.discount_amount) || 0,

          discountType: (item.discount_type as any) || "percent",

          providerId: normalizeAssignedProviderId((item as any).provider_id || null, providers),
        })));
      }
    } else if (sourceDevis) {
      setClientId(sourceDevis.client_id || "");
      if ((sourceDevis as any).missions?.id) {
        setMissionId((sourceDevis as any).missions.id);
      }
      const isActuallySubject = Number(sourceDevis.tva_rate) > 0;
      setTvaEnabled(isActuallySubject);
      setTvaRate(isActuallySubject ? Number(sourceDevis.tva_rate) : 0.20);
      setNotes(sourceDevis.notes || "");
      setGlobalDiscountAmount(Number(sourceDevis.discount_amount) || 0);

      setGlobalDiscountType((sourceDevis.discount_type as any) || "percent");
      const devisItems = sourceDevis.devis_items || [];
      if (devisItems.length > 0) {
        setItems(devisItems.sort((a, b) => a.sort_order - b.sort_order).map((item, i) => ({
          id: `item-${i}`,
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unit_price),
          discountAmount: Number(item.discount_amount) || 0,

          discountType: (item.discount_type as any) || "percent",
          providerId: normalizeAssignedProviderId(item.provider_id || null, providers),
        })));
      }
    } else if (sourceFacture) {
      setClientId(sourceFacture.client_id || "");
      const isActuallySubject = Number(sourceFacture.tva_rate) > 0;
      setTvaEnabled(isActuallySubject);
      setTvaRate(isActuallySubject ? Number(sourceFacture.tva_rate) : 0.20);
      setNotes(sourceFacture.notes || "");
      setGlobalDiscountAmount(Number(sourceFacture.discount_amount) || 0);

      setGlobalDiscountType((sourceFacture.discount_type as any) || "percent");
      const factureItems = sourceFacture.facture_items || [];
      if (factureItems.length > 0) {
        const isCreditNote = typeParam === "credit_note";
        setItems(factureItems.sort((a, b) => a.sort_order - b.sort_order).map((item, i) => ({
          id: `item-${i}`,
          description: item.description,
          quantity: isCreditNote ? -Number(item.quantity) : Number(item.quantity),
          unitPrice: Number(item.unit_price),
          discountAmount: Number(item.discount_amount) || 0,

          discountType: (item.discount_type as any) || "percent",

          providerId: normalizeAssignedProviderId((item as any).provider_id || null, providers),
        })));
      }
    } else if (whiteLabel) {
      if (whiteLabel.is_tva_subject === false) {
        setTvaEnabled(false);
      }
      if (Array.isArray(whiteLabel.tva_rates) && whiteLabel.tva_rates.length > 0) {
        setTvaRate(Number(whiteLabel.tva_rates[whiteLabel.tva_rates.length - 1]) / 100);
      }
    }
  }, [existing, sourceDevis, sourceFacture, whiteLabel, providers]);

  useEffect(() => {
    setItems(prev => {
      const hasImported = prev.some(i => i.baseHourlyRate !== undefined);
      if (!hasImported) return prev;
      return prev.map(item => {
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
          providerId: matchedProvider?.user_id || null,
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
    toast.success(`${newItems.length} ligne(s) ajoutée(s)`);
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

    const totalHT = rawTotalHT - globalDiscount;
    const rate = tvaEnabled ? tvaRate : 0;
    return { totalHT, tva: totalHT * rate, totalTTC: totalHT * (1 + rate), rawTotalHT, globalDiscount };
  }, [items, tvaEnabled, tvaRate, globalDiscountAmount, globalDiscountType]);

  const selectedClient = clients.find(c => c.id === clientId);

  const handleSave = async (asDraft: boolean) => {
    if (isReadOnly) {
      toast.error("Cette facture ne peut pas être modifiée car elle est issue d'un devis validé.");
      return;
    }
    const number = isEdit && existing ? existing.number : (typeParam === "credit_note" ? `AV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}` : `FAC-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`);
    const payload = {
      number,
      client_id: clientId || null,
      devis_id: fromFactureId ? null : (fromDevisId || (existing?.devis_id || null)),
      mission_id: missionId || null,
      date,
      due_date: dueDate || null,
      notes: notes || null,
      total_ht: totals.totalHT,
      total_ttc: totals.totalTTC,
      tva_rate: tvaEnabled ? tvaRate : 0,
      type: typeParam,
      parent_facture_id: parentFactureId,
      discount_amount: globalDiscountAmount,
      discount_type: globalDiscountType,
      status: asDraft ? "brouillon" : "envoyée",
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
      await updateFacture.mutateAsync({ id, ...payload });
    } else {
      await createFacture.mutateAsync(payload);
    }
    navigate("/finance/factures");
  };

  const saving = createFacture.isPending || updateFacture.isPending;

  if (isEdit && loadingExisting) return <AppLayout><div className="space-y-4 max-w-5xl"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl">
        <button onClick={() => navigate("/finance/factures")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Retour aux factures
        </button>

        <div>
          <h1 className="text-2xl font-display font-bold">
            {typeParam === "credit_note" ? "Nouvel avoir" : (isEdit ? `Modifier ${existing?.number}` : "Nouvelle facture")}
          </h1>
          {isReadOnly && (
            <div className="flex items-center gap-2 text-warning mt-2 p-3 bg-warning/10 rounded-xl border border-warning/20">
              <Lock className="h-4 w-4" />
              <p className="text-sm font-medium">Cette facture est en lecture seule car elle est issue d'un devis validé.</p>
            </div>
          )}
          <p className="text-muted-foreground text-sm mt-1">
            {typeParam === "credit_note"
              ? `Création d'un avoir pour la facture ${sourceFacture?.number}`
              : (sourceDevis
                ? `Depuis le devis ${sourceDevis.number}`
                : sourceFacture
                  ? `Dupliquer la facture ${sourceFacture.number}`
                  : isEdit
                    ? "Modifiez la facture"
                    : "Créez une nouvelle facture")}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-card border-border/50">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-display font-semibold">Informations générales</h3>
                {sourceDevis && <div className="text-xs px-3 py-2 rounded-lg bg-primary/10 text-primary font-medium">Pré-rempli depuis le devis {sourceDevis.number}</div>}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Mission (optionnel pour import)</Label>
                    <select disabled={isReadOnly} value={missionId} onChange={e => setMissionId(e.target.value)} className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm disabled:opacity-70 disabled:bg-muted">
                      <option value="">Sélectionner une mission...</option>
                      {missions.map((m: any) => <option key={m.id} value={m.id}>{m.title}{m.clients?.name ? ` — ${m.clients.name}` : ""}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Client</Label>
                    <select disabled={isReadOnly} value={clientId} onChange={e => setClientId(e.target.value)} className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm disabled:opacity-70 disabled:bg-muted">
                      <option value="">Sélectionner un client...</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ""}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2"><Label>Date</Label><Input disabled={isReadOnly} type="date" value={date} onChange={e => setDate(e.target.value)} className="h-11 rounded-xl" /></div>
                  <div className="space-y-2"><Label>Échéance</Label><Input disabled={isReadOnly} type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="h-11 rounded-xl" /></div>
                </div>
              </CardContent>
            </Card>

            {missionId && (
              <Card className="shadow-card border-border/50 animate-fade-in">
                <CardContent className="p-6 space-y-4">
                  <h3 className="font-display font-semibold flex items-center gap-2">
                    <User className="h-4 w-4 text-warning" /> Import prestataires mission
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
                        disabled={isReadOnly}
                      />
                      <p className="text-xs text-muted-foreground">Prix unitaire = tarif horaire × heures</p>
                    </div>
                    <Button
                      variant="outline"
                      className="gap-2 rounded-xl h-11"
                      onClick={handleImportPrestataires}
                      disabled={isReadOnly || !missionAssignments || missionAssignments.length === 0}
                    >
                      <User className="h-4 w-4" />
                      Importer prestataires ({missionAssignments?.length || 0})
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="shadow-card border-border/50">
              <CardContent className="p-6 space-y-4">
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
                    return (
                      <div key={item.id} className={cn(
                        "group relative flex flex-col gap-3 p-4 rounded-2xl border transition-all duration-200 bg-card hover:border-border/80 hover:shadow-md",
                        isReadOnly ? "opacity-90 grayscale-[0.2]" : "border-border/40"
                      )}>
                        {/* Primary Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_100px_120px_120px_120px_40px] gap-4 items-start">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-[10px] font-bold text-muted-foreground/60 uppercase">Ligne {index + 1}</span>
                            </div>
                            <Textarea
                              placeholder="Description de la prestation..."
                              value={item.description}
                              onChange={e => updateItem(item.id, "description", e.target.value)}
                              className="min-h-[60px] rounded-xl text-sm resize-none bg-background/50 border-none focus-visible:ring-1"
                              disabled={isReadOnly}
                            />
                          </div>

                          <div className="flex flex-col gap-2 sm:pt-6">
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={e => updateItem(item.id, "quantity", parseFloat(e.target.value) || 0)}
                              className={cn(
                                "h-10 rounded-xl text-sm text-center font-medium bg-background/50",
                                item.quantity < 0 && "text-destructive"
                              )}
                              disabled={isReadOnly}
                            />
                          </div>

                          <div className="flex flex-col gap-2 sm:pt-6">
                            <div className="relative">
                              <Input
                                type="number"
                                step={0.01}
                                value={item.unitPrice}
                                onChange={e => updateItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)}
                                className={cn(
                                  "h-10 rounded-xl text-sm text-right pr-7 font-medium bg-background/50",
                                  item.unitPrice < 0 && "text-destructive"
                                )}
                                disabled={isReadOnly}
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">€</span>
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
                                  disabled={isReadOnly}
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
                                disabled={isReadOnly}
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
                            <span className={cn("text-sm font-bold", lineTotal < 0 ? "text-destructive" : "text-foreground")}>
                              {lineTotal.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€
                            </span>
                          </div>

                          <div className="flex items-center justify-center h-10 sm:pt-6 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => removeItem(item.id)}
                              disabled={isReadOnly || items.length <= 1}
                              className={cn(
                                "p-2 rounded-xl transition-all",
                                !isReadOnly && items.length > 1 ? "hover:bg-destructive/10 text-muted-foreground hover:text-destructive" : "text-muted-foreground/20 cursor-not-allowed"
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
                            disabled={isReadOnly}
                            onChange={e => {
                              const pId = e.target.value || null;
                              updateItem(item.id, "providerId", pId);
                              if (pId) {

                                const provider = assignableProviders.find((m) => m.user_id === pId);
                                if (provider) {
                                  const rate = Number(provider.daily_rate) || Number(provider.hourly_rate) || 0;
                                  if (rate > 0) {
                                    updateItem(item.id, "unitPrice", rate);
                                    toast.info(`Prix importé : ${rate}€`);
                                  }
                                }
                              }
                            }}
                            className="bg-transparent border-none text-xs font-medium text-muted-foreground focus:ring-0 cursor-pointer hover:text-primary transition-colors pr-8 disabled:cursor-not-allowed"
                          >
                            <option value="">Aucun prestataire assignable dans l'équipe</option>
                            {assignableProviders.map((m) => (
                              <option key={m.id} value={m.user_id}>
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
                    disabled={isReadOnly}
                    onClick={addItem}
                    className="flex-1 py-6 border-2 border-dashed border-border rounded-2xl text-sm font-semibold hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all shadow-none disabled:opacity-50"
                    variant="ghost"
                  >
                    <Plus className="h-4 w-4 mr-2" /> Ajouter une ligne manuelle
                  </Button>
                  {templates.length > 0 && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button disabled={isReadOnly} variant="outline" className="h-12 px-6 rounded-2xl gap-2 font-semibold disabled:opacity-50">
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
                                  providerId: null
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

            <Card className="shadow-card border-border/50">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2 border-b pb-3 mb-4">
                  <FileText className="h-4 w-4 text-primary" />
                  <h3 className="font-display font-semibold">Notes & conditions</h3>
                </div>
                <Textarea
                  disabled={isReadOnly}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Précisez ici vos conditions de règlement, RIB ou notes spécifiques..."
                  className="min-h-[120px] rounded-2xl border-none bg-muted/20 focus-visible:ring-1 resize-none text-sm p-4"
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            {selectedClient && (
              <Card className="shadow-card border-border/50 animate-fade-in">
                <CardContent className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Client</p>
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
                  <Button className="w-full gradient-primary text-white gap-2 rounded-xl hover:opacity-90" onClick={() => handleSave(false)} disabled={saving || isReadOnly}><Send className="h-4 w-4" /> Enregistrer & Envoyer</Button>
                  <Button variant="outline" className="w-full gap-2 rounded-xl" onClick={() => handleSave(true)} disabled={saving || isReadOnly}><Save className="h-4 w-4" /> Enregistrer en brouillon</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
