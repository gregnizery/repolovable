/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Users, Shield, Save, Loader2, Lock, Camera, Upload, X, Send, Trash2, UserPlus, Crown, Mail, Landmark, Calendar, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTeam, useTeamMembers, useTeamInvitations, useInviteTeamMember, useRemoveTeamMember, useUpdateMemberRole, useCancelInvitation, useUpdateTeamSettings, type TeamMember } from "@/hooks/use-team";
import { useUserRole } from "@/hooks/use-user-role";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { InvoiceItemTemplatesManager } from "@/components/finance/InvoiceItemTemplatesManager";
import { CompanyAutocomplete } from "@/components/CompanyAutocomplete";
import { useSubscription } from "@/hooks/use-subscription";
import { useAuditLogs, type AuditLog } from "@/hooks/use-audit-logs";
import { ClipboardList } from "lucide-react";

export default function Settings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: roleData } = useUserRole();
  const { limits, plan } = useSubscription();
  const { data: team } = useTeam();
  const updateTeamSettings = useUpdateTeamSettings();
  const canSeeTeam = roleData?.role === "admin" || roleData?.role === "manager" || roleData?.isOwner;

  // Form state for entreprise tab
  const [companyName, setCompanyName] = useState("");
  const [siret, setSiret] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [iban, setIban] = useState("");
  const [bic, setBic] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [brandPrimaryColor, setBrandPrimaryColor] = useState("#4247D0");
  const [brandSecondaryColor, setBrandSecondaryColor] = useState("#6366F1");
  const [legalMentions, setLegalMentions] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyLat, setCompanyLat] = useState<number | null>(null);
  const [companyLng, setCompanyLng] = useState<number | null>(null);
  const [pricePerKm, setPricePerKm] = useState<number>(0.60);
  const [isTvaSubject, setIsTvaSubject] = useState(true);
  const [tvaRates, setTvaRates] = useState<string>("0, 5.5, 10, 20");
  const [cgvText, setCgvText] = useState("");
  const [dailyRate, setDailyRate] = useState<number>(0);
  const [hourlyRate, setHourlyRate] = useState<number>(0);
  const [tvaIntra, setTvaIntra] = useState("");
  const [legalForm, setLegalForm] = useState("");
  const [capitalSocial, setCapitalSocial] = useState("");
  const [rcsNumber, setRcsNumber] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);


  const { data: whiteLabel } = useQuery({
    queryKey: ["white-label-settings"],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await (supabase as any)
        .from("white_label_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (profile) {
      setCompanyName(profile.company_name ?? "");
      setSiret(profile.siret ?? "");
      setPhone(profile.phone ?? "");
      setAddress(profile.address ?? "");
      setFirstName(profile.first_name ?? "");
      setLastName(profile.last_name ?? "");

      setIban((profile as any).iban ?? "");

      setBic((profile as any).bic ?? "");

      setBrandPrimaryColor((whiteLabel as any)?.primary_color ?? "#4247D0");

      setBrandSecondaryColor((whiteLabel as any)?.secondary_color ?? "#6366F1");

      setLegalMentions((whiteLabel as any)?.legal_mentions ?? "");

      setCompanyAddress((whiteLabel as any)?.company_address ?? "");

      setCompanyLat((whiteLabel as any)?.company_lat ?? null);

      setCompanyLng((whiteLabel as any)?.company_lng ?? null);

      setPricePerKm((whiteLabel as any)?.price_per_km ?? 0.60);

      setIsTvaSubject((whiteLabel as any)?.is_tva_subject ?? true);

      const rates = (whiteLabel as any)?.tva_rates;
      setTvaRates(Array.isArray(rates) ? rates.join(", ") : "0, 5.5, 10, 20");

      setCgvText((whiteLabel as any)?.cgv_text ?? "");

      setDailyRate(Number((profile as any).daily_rate) || 0);

      setHourlyRate(Number((profile as any).hourly_rate) || 0);

      setTvaIntra((whiteLabel as any)?.tva_intra ?? "");

      setLegalForm((whiteLabel as any)?.legal_form ?? "");

      setCapitalSocial((whiteLabel as any)?.capital_social ?? "");

      setRcsNumber((whiteLabel as any)?.rcs_number ?? "");
    }
    if (user) {
      setEmail(user.email ?? "");
    }
  }, [profile, user, whiteLabel]);



  const saveBrandingMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Non connecté");
      const { data: teamMember } = await supabase.from("team_members").select("team_id").eq("user_id", user.id).limit(1).maybeSingle();
      if (!teamMember?.team_id) throw new Error("Aucune équipe");
      const payload = {
        team_id: teamMember.team_id,
        primary_color: brandPrimaryColor,
        secondary_color: brandSecondaryColor,
        legal_mentions: legalMentions || null,
        company_address: companyAddress || null,
        company_lat: companyLat,
        company_lng: companyLng,
        price_per_km: pricePerKm,

        logo_url: (profile as any)?.company_logo_url || null,
        is_tva_subject: isTvaSubject,
        tva_rates: tvaRates.split(",").map(r => parseFloat(r.trim())).filter(r => !isNaN(r)),
        cgv_text: cgvText || null,
        iban: iban || null,
        bic: bic || null,
        tva_intra: tvaIntra || null,
        legal_form: legalForm || null,
        capital_social: capitalSocial || null,
        rcs_number: rcsNumber || null,
        updated_by: user.id,

      } as any;

      const { error } = await (supabase as any).from("white_label_settings").upsert(payload, { onConflict: "team_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["white-label-settings"] });
      toast.success("Paramétrage marque blanche enregistré");
    },

    onError: (e: any) => toast.error(e.message || "Erreur marque blanche"),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Non connecté");
      const payload = {
        company_name: companyName || null,
        siret: siret || null,
        phone: phone || null,
        address: address || null,
        first_name: firstName || null,
        last_name: lastName || null,
        iban: iban || null,
        bic: bic || null,
        daily_rate: dailyRate,
        hourly_rate: hourlyRate,
        user_id: user.id,

      } as any;

      if (profile) {
        const { error } = await supabase
          .from("profiles")
          .update(payload)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("profiles")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      toast.success("Profil enregistré avec succès");
    },
    onError: () => {
      toast.error("Erreur lors de l'enregistrement");
    },
  });

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="text-2xl font-display font-bold">Paramètres</h1>
          <p className="text-muted-foreground text-sm mt-1">Configuration de votre espace</p>
        </div>

        <Tabs defaultValue={canSeeTeam ? "entreprise" : "utilisateurs"}>
          <TabsList className="bg-muted/50 rounded-xl">
            {canSeeTeam && <TabsTrigger value="entreprise" className="rounded-lg gap-1.5"><Building2 className="h-3.5 w-3.5" /> Entreprise</TabsTrigger>}
            <TabsTrigger value="utilisateurs" className="rounded-lg gap-1.5"><Users className="h-3.5 w-3.5" /> Mon compte</TabsTrigger>
            {canSeeTeam && <TabsTrigger value="finances" className="rounded-lg gap-1.5"><Landmark className="h-3.5 w-3.5" /> Finances</TabsTrigger>}
            {canSeeTeam && <TabsTrigger value="equipe" className="rounded-lg gap-1.5"><Shield className="h-3.5 w-3.5" /> Équipe</TabsTrigger>}
            {canSeeTeam && <TabsTrigger value="audit" className="rounded-lg gap-1.5"><ClipboardList className="h-3.5 w-3.5" /> Historique</TabsTrigger>}
          </TabsList>

          {canSeeTeam && (
            <TabsContent value="entreprise" className="mt-6">
              <Card className="shadow-card border-border/50">
                <CardContent className="p-6 space-y-6">
                  <h3 className="font-display font-semibold">Informations entreprise</h3>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <>
                      {/* Company Logo */}
                      <div className="space-y-2">
                        <Label>Logo de l'entreprise</Label>
                        <div className="flex items-center gap-4">
                          <div className="relative group">
                            {profile?.company_logo_url ? (
                              <div className="relative w-20 h-20 rounded-xl border border-border overflow-hidden bg-muted/30">
                                <img
                                  src={profile.company_logo_url}
                                  alt="Logo entreprise"
                                  className="w-full h-full object-contain p-1"
                                />
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!user) return;
                                    try {
                                      await supabase.storage.from("avatars").remove([`${user.id}/logo`]);
                                      await supabase.from("profiles").update({ company_logo_url: null }).eq("user_id", user.id);
                                      queryClient.invalidateQueries({ queryKey: ["profile"] });
                                      toast.success("Logo supprimé");
                                    } catch {
                                      toast.error("Erreur lors de la suppression");
                                    }
                                  }}
                                  className="absolute top-1 right-1 p-0.5 rounded-full bg-destructive/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => logoInputRef.current?.click()}
                                className="w-20 h-20 rounded-xl border-2 border-dashed border-border hover:border-primary/50 bg-muted/30 flex flex-col items-center justify-center gap-1 transition-colors"
                              >
                                {uploadingLogo ? (
                                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                ) : (
                                  <>
                                    <Upload className="h-5 w-5 text-muted-foreground" />
                                    <span className="text-[10px] text-muted-foreground">Logo</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                          {profile?.company_logo_url && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="rounded-xl"
                              onClick={() => logoInputRef.current?.click()}
                            >
                              {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : "Changer"}
                            </Button>
                          )}
                          <input
                            ref={logoInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file || !user) return;
                              setUploadingLogo(true);
                              try {
                                const ext = file.name.split(".").pop();
                                const path = `${user.id}/logo.${ext}`;
                                const { error: uploadError } = await supabase.storage
                                  .from("avatars")
                                  .upload(path, file, { upsert: true });
                                if (uploadError) throw uploadError;
                                const { data: urlData } = supabase.storage
                                  .from("avatars")
                                  .getPublicUrl(path);
                                const logoUrl = `${urlData.publicUrl}?t=${Date.now()}`;
                                const { error: updateError } = await supabase
                                  .from("profiles")

                                  .update({ company_logo_url: logoUrl } as any)
                                  .eq("user_id", user.id);
                                if (updateError) throw updateError;
                                queryClient.invalidateQueries({ queryKey: ["profile"] });
                                toast.success("Logo mis à jour");
                              } catch (err: unknown) {
                                toast.error(err.message || "Erreur lors de l'upload");
                              } finally {
                                setUploadingLogo(false);
                                e.target.value = "";
                              }
                            }}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Nom de l'entreprise</Label>
                          <CompanyAutocomplete
                            value={companyName}
                            onChange={setCompanyName}
                            onCompanySelect={(c) => {
                              setSiret(c.siret);
                              setAddress(c.address);
                              setTvaIntra(c.vatNumber);
                            }}
                            className="rounded-xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>SIRET</Label>
                          <Input value={siret} onChange={e => setSiret(e.target.value)} placeholder="123 456 789 00012" className="rounded-xl" />
                        </div>
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input value={email} disabled className="rounded-xl bg-muted/50" />
                        </div>
                        <div className="space-y-2">
                          <Label>Téléphone</Label>
                          <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="01 23 45 67 89" className="rounded-xl" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Adresse</Label>
                          <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="12 rue de la Paix, 75002 Paris" className="rounded-xl" />
                        </div>
                      </div>
                      <h4 className="font-display font-semibold text-sm pt-2">Coordonnées bancaires</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>IBAN</Label>
                          <Input value={iban} onChange={e => setIban(e.target.value)} placeholder="FR76 1234 5678 9012 3456 7890 123" className="rounded-xl" />
                        </div>
                        <div className="space-y-2">
                          <Label>BIC / SWIFT</Label>
                          <Input value={bic} onChange={e => setBic(e.target.value)} placeholder="BNPAFRPP" className="rounded-xl" />
                        </div>
                      </div>
                      <Button
                        onClick={() => saveMutation.mutate()}
                        disabled={saveMutation.isPending}
                        className="gradient-primary text-white rounded-xl hover:opacity-90 gap-1.5"
                      >
                        {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Enregistrer
                      </Button>

                      <div className="flex items-center justify-between pt-4 pb-2 border-b border-border/50">
                        <h4 className="font-display font-semibold text-sm">Marque blanche & Préférences Entreprise</h4>
                        {!limits.hasWhiteLabel && <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1"><Lock className="h-2 w-2" /> PLAN PRO</span>}
                      </div>

                      <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4", !limits.hasWhiteLabel && "opacity-50 pointer-events-none")}>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Siège social (Calcul Indemnités Kilométriques)</Label>
                          <AddressAutocomplete
                            value={companyAddress}
                            onChange={setCompanyAddress}
                            onPlaceSelect={(place) => {
                              setCompanyLat(place.lat);
                              setCompanyLng(place.lng);
                            }}
                            className="rounded-xl"
                            placeholder="Rechercher l'adresse de votre siège..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Tarif au kilomètre (€)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={pricePerKm}
                            onChange={e => setPricePerKm(parseFloat(e.target.value) || 0)}
                            className="rounded-xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Couleur primaire</Label>
                          <Input type="color" value={brandPrimaryColor} onChange={e => setBrandPrimaryColor(e.target.value)} className="rounded-xl h-10" />
                        </div>
                        <div className="space-y-2">
                          <Label>Couleur secondaire</Label>
                          <Input type="color" value={brandSecondaryColor} onChange={e => setBrandSecondaryColor(e.target.value)} className="rounded-xl h-10" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Mentions légales (bas de page court)</Label>
                          <Input value={legalMentions} onChange={e => setLegalMentions(e.target.value)} placeholder="Vos mentions légales" className="rounded-xl" />
                        </div>
                      </div>

                      <h4 className="font-display font-semibold text-sm pt-4">Configuration financière & TVA</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                          <div className="space-y-0.5">
                            <Label>Assujetti à la TVA</Label>
                            <p className="text-xs text-muted-foreground">Active le calcul de la TVA sur les documents</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsTvaSubject(!isTvaSubject)}
                            className={cn(
                              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                              isTvaSubject ? "bg-primary" : "bg-muted"
                            )}
                          >
                            <span className={cn(
                              "pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform",
                              isTvaSubject ? "translate-x-5" : "translate-x-0"
                            )} />
                          </button>
                        </div>
                        <div className="space-y-2">
                          <Label>Taux de TVA disponibles (séparés par virgule)</Label>
                          <Input value={tvaRates} onChange={e => setTvaRates(e.target.value)} placeholder="0, 5.5, 10, 20" className="rounded-xl" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Conditions Générales de Vente (CGV)</Label>
                          <Textarea
                            value={cgvText}
                            onChange={e => setCgvText(e.target.value)}
                            placeholder="Vos conditions générales de vente qui apparaîtront sur les documents..."
                            className="rounded-xl min-h-[120px] resize-none"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 pb-1">
                        <h4 className="font-display font-semibold text-sm flex items-center gap-2">
                          <Shield className="h-4 w-4 text-primary" /> Conformité e-facturation 2026
                        </h4>
                        {!limits.hasFacturX && <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1"><Lock className="h-2 w-2" /> PLAN PRO</span>}
                      </div>
                      <p className="text-xs text-muted-foreground">Ces informations sont obligatoires pour la réforme de la facturation électronique 2026.</p>
                      <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4", !limits.hasFacturX && "opacity-50 pointer-events-none")}>
                        <div className="space-y-2">
                          <Label>N° de TVA Intracommunautaire</Label>
                          <Input value={tvaIntra} onChange={e => setTvaIntra(e.target.value)} placeholder="FR 12 345678901" className="rounded-xl" />
                        </div>
                        <div className="space-y-2">
                          <Label>Forme juridique</Label>
                          <Input value={legalForm} onChange={e => setLegalForm(e.target.value)} placeholder="SAS, SARL, EURL..." className="rounded-xl" />
                        </div>
                        <div className="space-y-2">
                          <Label>Capital social (€)</Label>
                          <Input value={capitalSocial} onChange={e => setCapitalSocial(e.target.value)} placeholder="1000" className="rounded-xl" />
                        </div>
                        <div className="space-y-2">
                          <Label>N° RCS et Ville</Label>
                          <Input value={rcsNumber} onChange={e => setRcsNumber(e.target.value)} placeholder="890 123 456 RCS Paris" className="rounded-xl" />
                        </div>
                      </div>

                      <Button
                        onClick={() => saveBrandingMutation.mutate()}
                        disabled={saveBrandingMutation.isPending || (!limits.hasWhiteLabel && !limits.hasFacturX)}
                        variant="outline"
                        className="rounded-xl gap-1.5"
                      >
                        {saveBrandingMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Enregistrer marque blanche
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* ---- MON COMPTE ---- */}
          <TabsContent value="utilisateurs" className="mt-6 space-y-4">
            <Card className="shadow-card border-border/50">
              <CardContent className="p-6 space-y-6">
                <h3 className="font-display font-semibold">Mon profil</h3>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <Card className="shadow-card border-border/50">
                      <CardHeader>
                        <CardTitle className="text-lg font-display flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-primary" /> Synchronisation Calendrier
                        </CardTitle>
                        <CardDescription>Abonnez-vous à vos missions depuis Google Calendar, Apple Calendar ou Outlook.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="p-4 rounded-xl bg-muted/30 border border-border/50 flex flex-col gap-3">
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Utilisez ce lien secret pour synchroniser vos missions planifiées sur votre téléphone ou autre application de calendrier.
                            <span className="text-warning font-medium"> Ne partagez pas ce lien.</span>
                          </p>
                          <div className="flex gap-2">
                            <Input
                              readOnly
                              value={profile?.calendar_token ? `https://usixljyrqcaaapksjyff.functions.supabase.co/get-calendar-feed?token=${profile.calendar_token}` : "Chargement..."}
                              className="font-mono text-[10px] bg-background"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!profile?.calendar_token}
                              onClick={() => {
                                const url = `https://usixljyrqcaaapksjyff.functions.supabase.co/get-calendar-feed?token=${profile?.calendar_token}`;
                                navigator.clipboard.writeText(url);
                                toast.success("Lien copié !");
                              }}
                            >
                              Copier
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <Info className="h-3.5 w-3.5" /> Les missions annulées ne sont pas incluses dans le flux.
                        </div>
                      </CardContent>
                    </Card>

                    <div className="flex justify-end gap-3 pt-4">
                      <div className="relative group">
                        {profile?.avatar_url ? (
                          <img
                            src={profile.avatar_url}
                            alt="Avatar"
                            className="w-14 h-14 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center text-lg font-bold text-white">
                            {(firstName?.[0] ?? user?.email?.[0] ?? "U").toUpperCase()}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          {uploadingAvatar ? (
                            <Loader2 className="h-5 w-5 animate-spin text-white" />
                          ) : (
                            <Camera className="h-5 w-5 text-white" />
                          )}
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file || !user) return;
                            setUploadingAvatar(true);
                            try {
                              const ext = file.name.split(".").pop();
                              const path = `${user.id}/avatar.${ext}`;
                              const { error: uploadError } = await supabase.storage
                                .from("avatars")
                                .upload(path, file, { upsert: true });
                              if (uploadError) throw uploadError;
                              const { data: urlData } = supabase.storage
                                .from("avatars")
                                .getPublicUrl(path);
                              const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
                              const { error: updateError } = await supabase
                                .from("profiles")
                                .update({ avatar_url: avatarUrl })
                                .eq("user_id", user.id);
                              if (updateError) throw updateError;
                              queryClient.invalidateQueries({ queryKey: ["profile"] });
                              toast.success("Photo de profil mise à jour");
                            } catch (err: unknown) {
                              toast.error(err.message || "Erreur lors de l'upload");
                            } finally {
                              setUploadingAvatar(false);
                              e.target.value = "";
                            }
                          }}
                        />
                      </div>
                      <div>
                        <p className="font-semibold text-lg">{[firstName, lastName].filter(Boolean).join(" ") || "Non renseigné"}</p>
                        <p className="text-sm text-muted-foreground">{user?.email}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Prénom</Label>
                        <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Prénom" className="rounded-xl" />
                      </div>
                      <div className="space-y-2">
                        <Label>Nom</Label>
                        <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Nom" className="rounded-xl" />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input value={email} disabled className="rounded-xl bg-muted/50" />
                      </div>
                      <div className="space-y-2">
                        <Label>Téléphone</Label>
                        <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="06 12 34 56 78" className="rounded-xl" />
                      </div>
                      <div className="space-y-2">
                        <Label>Taux journalier (€)</Label>
                        <Input type="number" value={dailyRate} onChange={e => setDailyRate(Number(e.target.value))} className="rounded-xl" />
                      </div>
                      <div className="space-y-2">
                        <Label>Taux horaire (€)</Label>
                        <Input type="number" value={hourlyRate} onChange={e => setHourlyRate(Number(e.target.value))} className="rounded-xl" />
                      </div>
                    </div>
                    <Button
                      onClick={() => saveMutation.mutate()}
                      disabled={saveMutation.isPending}
                      className="gradient-primary text-white rounded-xl hover:opacity-90 gap-1.5"
                    >
                      {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Enregistrer
                    </Button>

                  </>
                )}
              </CardContent>
            </Card>

            {/* Password change */}
            <Card className="shadow-card border-border/50">
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-display font-semibold">Changer le mot de passe</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Nouveau mot de passe</Label>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Confirmer le nouveau mot de passe</Label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="rounded-xl"
                    />
                  </div>
                </div>
                <Button
                  onClick={async () => {
                    if (!newPassword) {
                      toast.error("Veuillez saisir un nouveau mot de passe");
                      return;
                    }
                    if (newPassword.length < 6) {
                      toast.error("Le mot de passe doit contenir au moins 6 caractères");
                      return;
                    }
                    if (newPassword !== confirmPassword) {
                      toast.error("Les mots de passe ne correspondent pas");
                      return;
                    }
                    const { error } = await supabase.auth.updateUser({ password: newPassword });
                    if (error) {
                      toast.error(error.message);
                    } else {
                      toast.success("Mot de passe mis à jour avec succès");
                      setNewPassword("");
                      setConfirmPassword("");
                    }
                  }}
                  className="gradient-primary text-white rounded-xl hover:opacity-90 gap-1.5"
                >
                  <Lock className="h-4 w-4" />
                  Mettre à jour le mot de passe
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {canSeeTeam && (
            <TabsContent value="finances" className="mt-6 space-y-6">
              <Card className="shadow-card border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between p-4 rounded-xl border border-primary/20 bg-primary/5 mb-6">
                    <div className="space-y-1">
                      <h4 className="font-display font-semibold flex items-center gap-2">
                        <Send className="h-4 w-4 text-primary" /> Relances Automatiques
                      </h4>
                      <p className="text-sm text-muted-foreground">Relance automatiquement les clients pour les factures impayées (J+7, J+15).</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {

                        const teamId = (team?.teams as any)?.id;
                        if (teamId) {
                          updateTeamSettings.mutate({
                            teamId,

                            settings: { auto_reminder_enabled: !(team?.teams as any)?.auto_reminder_enabled }
                          });
                        }
                      }}
                      className={cn(
                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",

                        (team?.teams as any)?.auto_reminder_enabled ? "bg-primary" : "bg-muted"
                      )}
                    >
                      <span className={cn(
                        "pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform",

                        (team?.teams as any)?.auto_reminder_enabled ? "translate-x-5" : "translate-x-0"
                      )} />
                    </button>
                  </div>
                  <InvoiceItemTemplatesManager />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* ---- ÉQUIPE ---- */}
          {canSeeTeam && (
            <TabsContent value="equipe" className="mt-6">
              <TeamManagement />
            </TabsContent>
          )}

          {canSeeTeam && (
            <TabsContent value="audit" className="mt-6">
              <AuditLogsTab />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AppLayout>
  );
}

const roleLabels: Record<string, { label: string; class: string }> = {
  admin: { label: "Admin", class: "bg-primary/10 text-primary" },
  manager: { label: "Manager", class: "bg-info/10 text-info" },
  technicien: { label: "Technicien", class: "bg-success/10 text-success" },
  prestataire: { label: "Prestataire", class: "bg-warning/10 text-warning" },
};

function TeamManagement() {
  const { user } = useAuth();
  const { data: team, isLoading: teamLoading } = useTeam();
  const updateTeamSettings = useUpdateTeamSettings();

  const teamId = (team?.teams as any)?.id as string | undefined;

  const isOwner = (team?.teams as any)?.owner_id === user?.id;
  const isAdmin = team?.role === "admin";
  const canManage = isOwner || isAdmin;

  const { data: members = [], isLoading: membersLoading } = useTeamMembers(teamId);
  const { data: invitations = [] } = useTeamInvitations(teamId);
  const inviteMutation = useInviteTeamMember();
  const removeMutation = useRemoveTeamMember();
  const updateRoleMutation = useUpdateMemberRole();
  const cancelInviteMutation = useCancelInvitation();

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("technicien");

  const handleInvite = () => {
    if (!inviteEmail || !teamId) return;
    inviteMutation.mutate(
      { email: inviteEmail, role: inviteRole, teamId },
      { onSuccess: () => { setInviteEmail(""); setInviteRole("technicien"); } }
    );
  };

  if (teamLoading || membersLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getMemberName = (member: TeamMember) => {
    const name = `${member.first_name || ""} ${member.last_name || ""}`.trim();
    return name || null;
  };

  const getMemberInitial = (member: TeamMember) => {
    if (member.first_name) return member.first_name[0].toUpperCase();
    if (member.email) return member.email[0].toUpperCase();
    return "?";
  };

  return (
    <div className="space-y-4">
      {/* Invite form */}
      {canManage && (
        <Card className="shadow-card border-border/50">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" />
              <h3 className="font-display font-semibold">Inviter un membre</h3>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                type="email"
                placeholder="email@exemple.fr"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                className="rounded-xl flex-1"
                onKeyDown={e => e.key === "Enter" && handleInvite()}
              />
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="w-full sm:w-40 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="technicien">Technicien</SelectItem>
                  <SelectItem value="prestataire">Prestataire</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleInvite}
                disabled={!inviteEmail || inviteMutation.isPending}
                className="gradient-primary text-white rounded-xl hover:opacity-90 gap-1.5"
              >
                {inviteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Inviter
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team members */}
      <Card className="shadow-card border-border/50">
        <CardContent className="p-6 space-y-1">
          <h3 className="font-display font-semibold text-sm flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-muted-foreground" /> Membres actifs ({members.length})
          </h3>

          {members.map((member) => {
            const isCurrentUser = member.user_id === user?.id;

            const isMemberOwner = (team?.teams as any)?.owner_id === member.user_id;
            const name = getMemberName(member);

            return (
              <div key={member.id} className="flex items-center justify-between gap-3 py-3 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-3 min-w-0">
                  {member.avatar_url ? (
                    <img src={member.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                      {getMemberInitial(member)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium flex items-center gap-2 flex-wrap">
                      {name || member.email || "Utilisateur"}
                      <Badge
                        variant="secondary"
                        className={cn("text-[10px] px-1.5 py-0 h-4 uppercase tracking-wider font-bold border-none", roleLabels[member.role]?.class || "bg-muted")}
                      >
                        {roleLabels[member.role]?.label || member.role}
                      </Badge>
                      {isMemberOwner && <Crown className="h-3.5 w-3.5 text-warning shrink-0" />}
                      {isCurrentUser && <span className="text-xs text-muted-foreground">(vous)</span>}
                    </p>
                    {name && member.email && (
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {canManage && !isCurrentUser && !isMemberOwner ? (
                    <Select
                      value={member.role}
                      onValueChange={(val) => updateRoleMutation.mutate({ memberId: member.id, role: val })}
                    >
                      <SelectTrigger className="w-32 h-8 rounded-lg text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="technicien">Technicien</SelectItem>
                        <SelectItem value="prestataire">Prestataire</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium", roleLabels[member.role]?.class || "bg-muted")}>
                      {roleLabels[member.role]?.label || member.role}
                    </span>
                  )}

                  {canManage && !isCurrentUser && !isMemberOwner && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive h-8 w-8 p-0"
                      onClick={() => {
                        if (window.confirm(`Retirer ${name || member.email || "ce membre"} de l'équipe ?`)) {
                          removeMutation.mutate(member.id);
                        }
                      }}
                      disabled={removeMutation.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}

          {members.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Aucun membre dans l'équipe.</p>
          )}
        </CardContent>
      </Card>

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <Card className="shadow-card border-border/50">
          <CardContent className="p-6 space-y-1">
            <h3 className="font-display font-semibold text-sm flex items-center gap-2 mb-3">
              <Mail className="h-4 w-4 text-warning" /> Invitations en attente ({invitations.length})
            </h3>

            {invitations.map((inv: any) => (
              <div key={inv.id} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-warning/10 flex items-center justify-center text-sm font-bold text-warning">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{inv.email}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full", roleLabels[inv.role]?.class || "bg-muted")}>
                        {roleLabels[inv.role]?.label || inv.role}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Expire le {new Date(inv.expires_at).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                  </div>
                </div>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive h-8 w-8 p-0"
                    onClick={() => cancelInviteMutation.mutate(inv.id)}
                    disabled={cancelInviteMutation.isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Role descriptions */}
      <Card className="shadow-card border-border/50">
        <CardContent className="p-6">
          <h3 className="font-display font-semibold text-sm mb-3">Rôles & permissions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(roleLabels).map(([key, cfg]) => (
              <div key={key} className="rounded-xl border border-border p-3">
                <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", cfg.class)}>{cfg.label}</span>
                <p className="text-xs text-muted-foreground mt-2">
                  {key === "admin" && "Accès complet : gestion de l'équipe, clients, missions, finances et matériel."}
                  {key === "manager" && "Gestion des clients, missions et finances. Ne peut pas gérer l'équipe."}
                  {key === "technicien" && "Accès au matériel et aux missions assignées. Lecture seule sur les finances."}
                  {key === "prestataire" && "Consultation des missions assignées et du matériel nécessaire."}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AuditLogsTab() {
  const { data: logs = [], isLoading } = useAuditLogs();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getActionBadge = (action: string) => {
    switch (action) {
      case "INSERT": return <span className="px-2 py-0.5 rounded-full bg-success/10 text-success text-[10px] font-bold">CRÉATION</span>;
      case "UPDATE": return <span className="px-2 py-0.5 rounded-full bg-info/10 text-info text-[10px] font-bold">MODIFICATION</span>;
      case "DELETE": return <span className="px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-[10px] font-bold">SUPPRESSION</span>;
      default: return <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-bold">{action}</span>;
    }
  };

  const getTableName = (name: string) => {
    const names: Record<string, string> = {
      teams: "Équipe",
      profiles: "Profil",
      team_members: "Membre",
      paiements: "Paiement",
      clients: "Client",
    };
    return names[name] || name;
  };

  return (
    <Card className="shadow-card border-border/50">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold">Historique d'audit</h3>
            <p className="text-xs text-muted-foreground">{logs.length} derniers événements</p>
          </div>

          <div className="relative overflow-x-auto rounded-xl border border-border/50">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-muted/30 text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Utilisateur</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Table</th>
                  <th className="px-4 py-3">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground italic">Aucun événement enregistré</td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/5 transition-colors group">
                      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString("fr-FR", { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full gradient-primary flex items-center justify-center text-[10px] font-bold text-white uppercase">
                            {log.profiles ? `${log.profiles.first_name?.[0] || ""}${log.profiles.last_name?.[0] || ""}` : "?"}
                          </div>
                          <span className="font-medium">
                            {log.profiles ? `${log.profiles.first_name || ""} ${log.profiles.last_name || ""}` : "Système"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">{getActionBadge(log.action)}</td>
                      <td className="px-4 py-3 text-xs font-medium">{getTableName(log.table_name)}</td>
                      <td className="px-4 py-3 max-w-[200px] truncate group-hover:whitespace-normal transition-all">
                        <span className="text-muted-foreground text-xs italic">
                          ID: {log.record_id?.slice(0, 8)}...
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
