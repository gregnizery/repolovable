import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CalendarClock,
  CreditCard,
  FileText,
  Package,
  Receipt,
  Settings,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import {
  MetricStrip,
  type MetricStripItem,
  SectionHeader,
  StatusPill,
  WorkbenchPanel,
} from "@/components/workbench/primitives";
import { useNotifications } from "@/hooks/use-notifications";
import {
  useClients,
  useDevisList,
  useFactures,
  useMateriel,
  useMissions,
  usePaiements,
  useProviders,
} from "@/hooks/use-data";
import { useTeam } from "@/hooks/use-team";
import { canAccess, useUserRole } from "@/hooks/use-user-role";
import { formatCompactCurrency, formatCount, formatCurrency } from "@/lib/formatters";

type SuiteModuleKey = "logistique" | "facturation" | "administration";

type ActionTile = {
  title: string;
  description: string;
  path: string;
  icon: LucideIcon;
  section: string;
};

const moduleDescriptors: Record<SuiteModuleKey, { title: string; description: string; subdomain: string }> = {
  logistique: {
    title: "Planify Logistique",
    description: "Le module d'exécution pour les missions, le parc, les transports et les arbitrages terrain.",
    subdomain: "logistique.planify.<domaine>",
  },
  facturation: {
    title: "Planify Facturation",
    description: "Le module de production financière pour les devis, factures, encaissements et achats.",
    subdomain: "facturation.planify.<domaine>",
  },
  administration: {
    title: "Planify Administration",
    description: "Le module de gouvernance pour les clients, prestataires, accès et réglages du workspace.",
    subdomain: "administration.planify.<domaine>",
  },
};

function SuiteActionGrid({ actions }: { actions: ActionTile[] }) {
  const navigate = useNavigate();
  const { data: roleData } = useUserRole();
  const role = roleData?.role;
  const visibleActions = actions.filter((action) => canAccess(role, action.section));

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {visibleActions.map((action) => (
        <button
          key={action.path}
          type="button"
          onClick={() => navigate(action.path)}
          className="rounded-2xl border border-border/80 bg-background p-4 text-left transition-colors hover:border-primary/30 hover:bg-card"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <action.icon className="h-5 w-5" />
            </div>
            <StatusPill label={action.title} tone="default" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-foreground">{action.title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{action.description}</p>
        </button>
      ))}
    </div>
  );
}

function ModuleFrame({
  moduleKey,
  eyebrow,
  actions,
  metrics,
  children,
}: {
  moduleKey: SuiteModuleKey;
  eyebrow: string;
  actions: ReactNode;
  metrics: MetricStripItem[];
  children: ReactNode;
}) {
  const descriptor = moduleDescriptors[moduleKey];

  return (
    <AppLayout>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <SectionHeader
          eyebrow={eyebrow}
          title={descriptor.title}
          description={descriptor.description}
          actions={actions}
        />

        <MetricStrip items={metrics} />

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
          {children}
          <WorkbenchPanel
            title="Découpage de suite"
            description="Le module vit dans la même app Firebase aujourd'hui et est prêt à basculer plus tard sur un sous-domaine dédié."
          >
            <div className="space-y-3">
              <div className="rounded-xl border border-border/80 bg-background p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">URL actuelle</p>
                <p className="mt-2 text-sm font-medium text-foreground">/{moduleKey}</p>
              </div>
              <div className="rounded-xl border border-border/80 bg-background p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Futur sous-domaine</p>
                <div className="mt-2">
                  <StatusPill label={descriptor.subdomain} tone="primary" className="max-w-full break-all normal-case tracking-normal" />
                </div>
              </div>
              <div className="rounded-xl border border-border/80 bg-background p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Principe</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Une seule base produit, un portail commun Planify, puis des entrées dédiées pour la logistique, la
                  facturation et l'administration.
                </p>
              </div>
            </div>
          </WorkbenchPanel>
        </div>
      </div>
    </AppLayout>
  );
}

function LogistiqueHub() {
  const navigate = useNavigate();
  const { data: roleData } = useUserRole();
  const canSeeMateriel = canAccess(roleData?.role, "materiel");
  const { data: missions = [] } = useMissions();
  const { data: materiel = [] } = useMateriel(canSeeMateriel);

  const plannedMissions = missions.filter((mission) => mission.status === "planifiée").length;
  const availableEquipment = materiel.filter((item) => item.status === "disponible").length;
  const blockedEquipment = materiel.filter((item) => item.status === "maintenance" || item.status === "hors_service").length;

  return (
    <ModuleFrame
      moduleKey="logistique"
      eyebrow="Suite Planify / Logistique"
      actions={
        <>
          <Button variant="outline" onClick={() => navigate("/calendrier")}>
            Calendrier
          </Button>
          <Button onClick={() => navigate("/missions")}>Ouvrir les flux terrain</Button>
        </>
      }
      metrics={[
        {
          label: "Missions planifiées",
          value: formatCount(plannedMissions),
          detail: "opérations actuellement en préparation",
          icon: CalendarClock,
          tone: "info",
        },
        {
          label: "Parc disponible",
          value: formatCount(availableEquipment),
          detail: `${formatCount(blockedEquipment)} élément(s) bloqué(s)`,
          icon: Package,
          tone: "success",
        },
        {
          label: "Vue calendrier",
          value: "Centralisée",
          detail: "lecture commune des créneaux, affectations et tensions",
          icon: Truck,
          tone: "default",
        },
      ]}
    >
      <WorkbenchPanel
        title="Entrées du module"
        description="Les points d'accès qui structurent aujourd'hui la partie Planify Logistique."
      >
        <SuiteActionGrid
          actions={[
            {
              title: "Missions",
              description: "Piloter les opérations, les statuts, les équipes et la séquence client.",
              path: "/missions",
              icon: CalendarClock,
              section: "missions",
            },
            {
              title: "Calendrier",
              description: "Lire la charge et les collisions avant arbitrage terrain.",
              path: "/calendrier",
              icon: Truck,
              section: "missions",
            },
            {
              title: "Parc matériel",
              description: "Suivre la disponibilité, les checkouts et les mouvements logistiques.",
              path: "/materiel",
              icon: Package,
              section: "materiel",
            },
            {
              title: "Véhicules",
              description: "Coordonner la flotte et les capacités de transport dans le même flux.",
              path: "/vehicules",
              icon: Truck,
              section: "materiel",
            },
          ]}
        />
      </WorkbenchPanel>
    </ModuleFrame>
  );
}

function FacturationHub() {
  const navigate = useNavigate();
  const { data: devis = [] } = useDevisList();
  const { data: factures = [] } = useFactures();
  const { data: paiements = [] } = usePaiements();

  const devisToSend = devis.filter((item) => item.status === "envoyé").length;
  const lateInvoices = factures.filter((item) => item.status === "en_retard" || item.status === "envoyée");
  const collectedAmount = paiements.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const lateAmount = lateInvoices.reduce((sum, item) => sum + Number(item.total_ttc || 0), 0);

  return (
    <ModuleFrame
      moduleKey="facturation"
      eyebrow="Suite Planify / Facturation"
      actions={
        <>
          <Button variant="outline" onClick={() => navigate("/finance/paiements")}>
            Paiements
          </Button>
          <Button onClick={() => navigate("/finance/devis")}>Ouvrir les flux financiers</Button>
        </>
      }
      metrics={[
        {
          label: "Devis envoyés",
          value: formatCount(devisToSend),
          detail: "dossiers en attente de validation client",
          icon: FileText,
          tone: "warning",
        },
        {
          label: "Factures à relancer",
          value: formatCompactCurrency(lateAmount),
          detail: `${formatCount(lateInvoices.length)} facture(s) à suivre`,
          icon: Receipt,
          tone: "destructive",
        },
        {
          label: "Encaissements",
          value: formatCompactCurrency(collectedAmount),
          detail: `${formatCount(paiements.length)} règlement(s) saisis`,
          icon: CreditCard,
          tone: "success",
        },
      ]}
    >
      <WorkbenchPanel
        title="Entrées du module"
        description="Le module Planify Facturation condense les flux financiers qui doivent rester actionnables au quotidien."
      >
        <SuiteActionGrid
          actions={[
            {
              title: "Devis",
              description: "Préparer, envoyer et suivre les validations commerciales sans perte de contexte mission.",
              path: "/finance/devis",
              icon: FileText,
              section: "finance",
            },
            {
              title: "Factures",
              description: "Suivre l'émission, les retards et les documents comptables associés.",
              path: "/finance/factures",
              icon: Receipt,
              section: "finance",
            },
            {
              title: "Paiements",
              description: "Contrôler les encaissements, les justificatifs et la validation manuelle.",
              path: "/finance/paiements",
              icon: CreditCard,
              section: "finance",
            },
            {
              title: "Achats & dépenses",
              description: "Rapprocher les achats et dépenses avec la trésorerie opérationnelle.",
              path: "/finance/achats",
              icon: Wallet,
              section: "finance",
            },
          ]}
        />
      </WorkbenchPanel>
    </ModuleFrame>
  );
}

function AdministrationHub() {
  const navigate = useNavigate();
  const { data: roleData } = useUserRole();
  const canSeeClients = canAccess(roleData?.role, "clients");
  const { data: clients = [] } = useClients(canSeeClients);
  const { data: providers = [] } = useProviders();
  const { data: notifications = [] } = useNotifications();
  const { data: teamMembership } = useTeam();

  const unreadCount = notifications.filter((item) => !item.read_at).length;
  const activeTeamName = teamMembership?.teams?.name || "Workspace actif";

  return (
    <ModuleFrame
      moduleKey="administration"
      eyebrow="Suite Planify / Administration"
      actions={
        <>
          <Button variant="outline" onClick={() => navigate("/notifications")}>
            Notifications
          </Button>
          <Button onClick={() => navigate("/parametres")}>Ouvrir la gouvernance</Button>
        </>
      }
      metrics={[
        {
          label: "Clients actifs",
          value: formatCount(clients.length),
          detail: "base relation commerciale du workspace",
          icon: Users,
          tone: "default",
        },
        {
          label: "Prestataires",
          value: formatCount(providers.length),
          detail: "profils disponibles ou en onboarding",
          icon: Users,
          tone: "info",
        },
        {
          label: "Alertes internes",
          value: formatCount(unreadCount),
          detail: activeTeamName,
          icon: Bell,
          tone: "warning",
        },
      ]}
    >
      <WorkbenchPanel
        title="Entrées du module"
        description="Le module Planify Administration centralise la relation, les accès et la configuration d'exploitation."
      >
        <SuiteActionGrid
          actions={[
            {
              title: "Clients",
              description: "Gérer les comptes, les fiches et l'entrée commerciale dans la suite.",
              path: "/clients",
              icon: Users,
              section: "clients",
            },
            {
              title: "Prestataires",
              description: "Suivre les profils externes, l'onboarding et les affectations disponibles.",
              path: "/prestataires",
              icon: Users,
              section: "parametres",
            },
            {
              title: "Paramètres",
              description: "Piloter les réglages d'équipe, de documents et de gouvernance interne.",
              path: "/parametres",
              icon: Settings,
              section: "parametres",
            },
            {
              title: "Notifications",
              description: "Conserver une vue claire sur les validations et événements à traiter.",
              path: "/notifications",
              icon: Bell,
              section: "dashboard",
            },
          ]}
        />
      </WorkbenchPanel>
    </ModuleFrame>
  );
}

export default function SuiteModulePage({ moduleKey }: { moduleKey: SuiteModuleKey }) {
  if (moduleKey === "logistique") return <LogistiqueHub />;
  if (moduleKey === "facturation") return <FacturationHub />;
  return <AdministrationHub />;
}
