import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { WorkspaceHero, WorkspaceKpiCard, WorkspaceKpiGrid, WorkspacePage } from "@/components/layout/Workspace";
import { Button } from "@/components/ui/button";
import { useClients, useMissions, useDevisList, useFactures, usePaiements, useMateriel, usePendingProofs } from "@/hooks/use-data";
import { Users, FileText, Receipt, DollarSign, Package, CalendarClock, Scan, CheckSquare, ClipboardList, Settings, ArrowRight } from "lucide-react";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { RevenueChart } from "@/components/charts/RevenueChart";
import { MissionStatusChart } from "@/components/charts/MissionStatusChart";
import { useUserRole } from "@/hooks/use-user-role";
import { DailyPriorities } from "@/components/dashboard/DailyPriorities";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { NotificationsSection } from "@/components/dashboard/NotificationsSection";
import { MaterielStatus } from "@/components/dashboard/MaterielStatus";
import { UpcomingMissionsList } from "@/components/dashboard/UpcomingMissionsList";

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: roleData } = useUserRole();
  const role = roleData?.role || "prestataire";
  const isAdmin = role === "admin";
  const isManager = role === "manager";

  const { data: clients = [] } = useClients(isAdmin || isManager);
  const { data: missions = [] } = useMissions();
  const { data: devisList = [] } = useDevisList(isAdmin || isManager);
  const { data: factures = [] } = useFactures(isAdmin || isManager);
  const { data: paiements = [] } = usePaiements(isAdmin || isManager);
  const { data: materiel = [] } = useMateriel(role !== "prestataire");
  const { data: pendingProofs = [] } = usePendingProofs(isAdmin || isManager);

  useRealtimeSync("materiel", [["materiel"]]);
  useRealtimeSync("missions", [["missions"]]);
  useRealtimeSync("devis", [["devis"]]);
  useRealtimeSync("factures", [["factures"]]);
  useRealtimeSync("paiements", [["paiements"]]);
  useRealtimeSync("clients", [["clients"]]);
  useRealtimeSync("payment_proofs", [["payment_proofs", "pending"]]);

  const totalRevenue = paiements.reduce((s, p) => s + Number(p.amount), 0);
  const pendingDevis = devisList.filter(d => d.status === "envoyé");
  const unpaidFactures = factures.filter(f => f.status === "en_retard" || f.status === "envoyée");
  const upcomingMissions = missions.filter(m => m.status === "planifiée");
  const overdueFactures = factures.filter(f => f.status === "en_retard");
  const draftDevis = devisList.filter(d => d.status === "brouillon");

  const nextMissionDate = [...upcomingMissions]
    .filter(m => m.start_date)
    .sort((a, b) => new Date(a.start_date!).getTime() - new Date(b.start_date!).getTime())[0];

  const totalEquipment = materiel.length;
  const availableEquipment = materiel.filter(m => m.status === "disponible").length;
  const totalValue = materiel.reduce((s, m) => s + (Number(m.purchase_price) || 0) * m.quantity, 0);
  const lowStock = materiel.filter(m => m.quantity <= 1 && m.status !== "hors_service");
  const inMission = materiel.filter(m => m.status === "en_mission").length;
  const inMaintenance = materiel.filter(m => m.status === "maintenance").length;
  const pendingCash = paiements.filter(p => p.method === "espèces" && p.validation_status === "pending");
  const recentSignedDevis = devisList
    .filter(d => d.status === "signé")
    .sort((a, b) => new Date(b.signed_at || b.date).getTime() - new Date(a.signed_at || a.date).getTime())
    .slice(0, 5);

  const dashboardConfig = (() => {
    if (role === "admin") {
      return {
        eyebrow: "Pilotage",
        title: "Cockpit Premium",
        description: "Vue d’ensemble des tensions commerciales, des relances finance et des prochaines missions pour piloter l’activité sans changer de contexte.",
        primaryAction: { label: "Nouvelle mission", onClick: () => navigate("/missions/nouveau") },
        secondaryAction: { label: "Nouveau devis", onClick: () => navigate("/finance/devis/nouveau") },
        tertiaryAction: { label: "Ajouter un client", onClick: () => navigate("/clients/nouveau") },
        metrics: [
          { label: "Cash encaissé", value: `${(totalRevenue / 1000).toFixed(0)}K€`, detail: `${paiements.length} paiement(s)`, icon: DollarSign, tone: "bg-primary/12 text-primary" },
          { label: "Clients actifs", value: clients.length, detail: "Relation en cours", icon: Users, tone: "bg-info/12 text-info" },
          { label: "Devis à signer", value: pendingDevis.length, detail: `${pendingDevis.reduce((s, d) => s + Number(d.total_ttc), 0).toLocaleString("fr-FR")}€`, icon: FileText, tone: "bg-warning/12 text-warning" },
          { label: "Factures à relancer", value: unpaidFactures.length, detail: `${unpaidFactures.reduce((s, f) => s + Number(f.total_ttc), 0).toLocaleString("fr-FR")}€`, icon: Receipt, tone: "bg-destructive/12 text-destructive" },
        ],
        priorities: [
          { title: "Factures en retard", value: overdueFactures.length, detail: overdueFactures.length > 0 ? "Relance à enclencher aujourd’hui" : "Aucune urgence de recouvrement", tone: overdueFactures.length > 0 ? "text-destructive" : "text-success" },
          { title: "Brouillons à finaliser", value: draftDevis.length, detail: draftDevis.length > 0 ? "Transformer les brouillons en signatures" : "Aucun devis en attente", tone: "text-warning" },
          { title: "Prochaine mission", value: nextMissionDate?.start_date ? new Date(nextMissionDate.start_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "--", detail: nextMissionDate ? nextMissionDate.title : "Aucune mission planifiée", tone: "text-info" },
        ],
        actions: [
          { label: "Nouvelle mission", href: "/missions/nouveau", icon: CalendarClock },
          { label: "Nouveau devis", href: "/finance/devis/nouveau", icon: FileText },
          { label: "Ajouter un client", href: "/clients/nouveau", icon: Users },
          { label: "Ajouter du matériel", href: "/materiel/nouveau", icon: Package },
        ],
        showNotifications: true,
        showMateriel: true,
        showRevenue: true,
        showMissionChart: true,
      };
    }

    if (role === "manager") {
      return {
        eyebrow: "Opérations",
        title: "Poste de Commande",
        description: "Coordonnez planning, disponibilité matériel et chantiers commerciaux avec un cockpit dense, pensé pour l’orchestration quotidienne.",
        primaryAction: { label: "Nouvelle mission", onClick: () => navigate("/missions/nouveau") },
        secondaryAction: { label: "Nouveau client", onClick: () => navigate("/clients/nouveau") },
        tertiaryAction: { label: "Voir le parc", onClick: () => navigate("/materiel") },
        metrics: [
          { label: "Missions planifiées", value: upcomingMissions.length, detail: "Agenda en préparation", icon: CalendarClock, tone: "bg-primary/12 text-primary" },
          { label: "Clients actifs", value: clients.length, detail: "Base opérationnelle", icon: Users, tone: "bg-info/12 text-info" },
          { label: "Matériel disponible", value: availableEquipment, detail: `/ ${totalEquipment}`, icon: Package, tone: "bg-warning/12 text-warning" },
          { label: "Devis en attente", value: pendingDevis.length, detail: "À transformer", icon: FileText, tone: "bg-info/12 text-info" },
        ],
        priorities: [
          { title: "Prochaine mission", value: nextMissionDate?.start_date ? new Date(nextMissionDate.start_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "--", detail: nextMissionDate ? nextMissionDate.title : "Aucune mission planifiée", tone: "text-primary" },
          { title: "Alertes stock", value: lowStock.length, detail: lowStock.length > 0 ? "Réassort ou sous-location à prévoir" : "Stock stable", tone: lowStock.length > 0 ? "text-warning" : "text-success" },
          { title: "Brouillons à finir", value: draftDevis.length, detail: "Synchroniser commerce et terrain", tone: "text-info" },
        ],
        actions: [
          { label: "Nouvelle mission", href: "/missions/nouveau", icon: CalendarClock },
          { label: "Nouveau client", href: "/clients/nouveau", icon: Users },
          { label: "Inventaire matériel", href: "/materiel", icon: Package },
        ],
        showNotifications: false,
        showMateriel: true,
        showRevenue: false,
        showMissionChart: true,
      };
    }

    if (role === "technicien") {
      return {
        eyebrow: "Terrain",
        title: "Console Logistique",
        description: "Accédez en un coup d’œil au prochain départ, au matériel mobilisé et aux actions terrain sans surcharger l’interface.",
        primaryAction: { label: "Scanner matériel", onClick: () => navigate("/materiel/scan") },
        secondaryAction: { label: "Voir les mouvements", onClick: () => navigate("/materiel/mouvements") },
        tertiaryAction: { label: "Mon planning", onClick: () => navigate("/missions") },
        metrics: [
          { label: "Missions à venir", value: upcomingMissions.length, detail: "Planning personnel", icon: CalendarClock, tone: "bg-primary/12 text-primary" },
          { label: "Matériel dispo", value: availableEquipment, detail: "Prêt au départ", icon: Package, tone: "bg-success/12 text-success" },
          { label: "En maintenance", value: inMaintenance, detail: "À vérifier", icon: Package, tone: "bg-destructive/12 text-destructive" },
          { label: "Flux logistique", value: "Actif", detail: "Scan + sorties stock", icon: ClipboardList, tone: "bg-info/12 text-info" },
        ],
        priorities: [
          { title: "Prochaine mission", value: nextMissionDate?.start_date ? new Date(nextMissionDate.start_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "--", detail: nextMissionDate ? `${nextMissionDate.title} · ${nextMissionDate.location || ""}` : "Aucune mission à venir", tone: "text-primary" },
          { title: "Maintenance", value: inMaintenance, detail: "Contrôles à effectuer", tone: inMaintenance > 0 ? "text-warning" : "text-success" },
          { title: "Stock bas", value: lowStock.length, detail: lowStock.length > 0 ? "Signaler au manager" : "Pas d’alerte bloquante", tone: lowStock.length > 0 ? "text-destructive" : "text-success" },
        ],
        actions: [
          { label: "Scanner matériel", href: "/materiel/scan", icon: Scan },
          { label: "Parc matériel", href: "/materiel", icon: Package },
          { label: "Mouvements batch", href: "/materiel/mouvements", icon: ClipboardList },
        ],
        showNotifications: false,
        showMateriel: true,
        showRevenue: false,
        showMissionChart: false,
      };
    }

    return {
      eyebrow: "Prestataire",
      title: "Espace Mission",
      description: "Retrouvez vos assignations, les prochaines échéances et les accès utiles dans une interface recentrée sur l’exécution.",
      primaryAction: { label: "Voir mes missions", onClick: () => navigate("/missions") },
      secondaryAction: { label: "Mon profil", onClick: () => navigate("/parametres") },
      tertiaryAction: { label: "Mon planning", onClick: () => navigate("/missions") },
      metrics: [
        { label: "Missions à venir", value: upcomingMissions.length, detail: "Planning affecté", icon: CalendarClock, tone: "bg-primary/12 text-primary" },
        { label: "Missions terminées", value: missions.filter(m => m.status === "terminée").length, detail: "Historique validé", icon: CheckSquare, tone: "bg-success/12 text-success" },
        { label: "Paiements", value: "À jour", detail: "Suivi administratif", icon: DollarSign, tone: "bg-info/12 text-info" },
        { label: "Profil", value: "Complet", detail: "Informations à jour", icon: Settings, tone: "bg-primary/12 text-primary" },
      ],
      priorities: [
        { title: "Prochaine mission", value: nextMissionDate?.start_date ? new Date(nextMissionDate.start_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "--", detail: nextMissionDate ? nextMissionDate.title : "Aucune mission à venir", tone: "text-primary" },
        { title: "Statut", value: "Assigné", detail: "En attente de démarrage", tone: "text-info" },
        { title: "Documents", value: "0", detail: "Aucune pièce manquante", tone: "text-success" },
      ],
      actions: [
        { label: "Consulter mon planning", href: "/missions", icon: CalendarClock },
        { label: "Détails de mission", href: "/missions", icon: FileText },
        { label: "Mon profil prestataire", href: "/parametres", icon: Settings },
      ],
      showNotifications: false,
      showMateriel: false,
      showRevenue: false,
      showMissionChart: false,
    };
  })();

  const cockpitAside = (
    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
      <div className="rounded-[24px] border border-border/60 bg-background/80 p-4 shadow-inner">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Prochaine étape
        </p>
        <p className="mt-2 text-lg font-display font-semibold text-foreground">
          {nextMissionDate ? nextMissionDate.title : "Aucune mission imminente"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {nextMissionDate?.start_date
            ? new Date(nextMissionDate.start_date).toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).replace(" à", " -")
            : "Le cockpit vous indiquera ici la prochaine action opérationnelle."}
        </p>
      </div>
      <div className="rounded-[24px] border border-border/60 bg-background/80 p-4 shadow-inner">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Tension finance
        </p>
        <p className="mt-2 text-2xl font-display font-bold text-destructive">
          {unpaidFactures.length}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          facture(s) à surveiller, dont {overdueFactures.length} en retard.
        </p>
      </div>
      <div className="rounded-[24px] border border-border/60 bg-background/80 p-4 shadow-inner">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Flux parc
        </p>
        <p className="mt-2 text-2xl font-display font-bold text-foreground">
          {availableEquipment}/{totalEquipment || 0}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          équipements disponibles, {lowStock.length} alerte(s) faible stock.
        </p>
      </div>
    </div>
  );

  return (
    <AppLayout>
      <WorkspacePage>
        <WorkspaceHero
          eyebrow={dashboardConfig.eyebrow}
          title={dashboardConfig.title}
          description={dashboardConfig.description}
          actions={(
            <>
              <Button className="gap-2 rounded-2xl" onClick={dashboardConfig.primaryAction.onClick}>
                <CalendarClock className="h-4 w-4" />
                {dashboardConfig.primaryAction.label}
              </Button>
              <Button variant="outline" className="gap-2 rounded-2xl" onClick={dashboardConfig.secondaryAction.onClick}>
                <FileText className="h-4 w-4" />
                {dashboardConfig.secondaryAction.label}
              </Button>
              <Button variant="ghost" className="gap-2 rounded-2xl text-muted-foreground" onClick={dashboardConfig.tertiaryAction.onClick}>
                {dashboardConfig.tertiaryAction.label}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          )}
          aside={cockpitAside}
        />

        <WorkspaceKpiGrid>
          {dashboardConfig.metrics.map((metric) => (
            <WorkspaceKpiCard
              key={metric.label}
              label={metric.label}
              value={metric.value}
              detail={metric.detail}
              icon={metric.icon}
              toneClassName={metric.tone}
            />
          ))}
        </WorkspaceKpiGrid>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <DailyPriorities priorities={dashboardConfig.priorities} />
              <QuickActions actions={dashboardConfig.actions} />
            </div>

            {dashboardConfig.showNotifications && (
              <NotificationsSection pendingProofs={pendingProofs} pendingCash={pendingCash} recentSignedDevis={recentSignedDevis} />
            )}

            {dashboardConfig.showMateriel && (
              <MaterielStatus
                totalEquipment={totalEquipment}
                availableEquipment={availableEquipment}
                inMission={inMission}
                totalValue={role === "technicien" ? 0 : totalValue}
                lowStock={lowStock}
                inMaintenance={inMaintenance}
              />
            )}

            <UpcomingMissionsList missions={upcomingMissions} />
          </div>

          <div className="space-y-4">
            {dashboardConfig.showRevenue && <RevenueChart paiements={paiements} />}
            {dashboardConfig.showMissionChart && <MissionStatusChart missions={missions} />}
          </div>
        </div>
      </WorkspacePage>
    </AppLayout>
  );
}
