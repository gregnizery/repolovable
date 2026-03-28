import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  Car,
  ClipboardCheck,
  CreditCard,
  FileText,
  LayoutDashboard,
  MapPin,
  Package,
  QrCode,
  Receipt,
  Settings,
  ShieldAlert,
  ShoppingCart,
  Users,
  Wallet,
} from "lucide-react";

export interface NavigationItem {
  title: string;
  path: string;
  icon: LucideIcon;
  section: string | null;
}

export interface NavigationGroup {
  label: string;
  items: NavigationItem[];
}

export const navGroups: NavigationGroup[] = [
  {
    label: "Pilotage",
    items: [
      { title: "Tableau de bord", path: "/dashboard", icon: LayoutDashboard, section: "dashboard" },
      { title: "Calendrier", path: "/calendrier", icon: Calendar, section: "missions" },
    ],
  },
  {
    label: "Relation",
    items: [
      { title: "Clients", path: "/clients", icon: Users, section: "clients" },
      { title: "Prestataires", path: "/prestataires", icon: Users, section: "parametres" },
    ],
  },
  {
    label: "Flux",
    items: [
      { title: "Missions", path: "/missions", icon: Calendar, section: "missions" },
      { title: "Devis", path: "/finance/devis", icon: FileText, section: "finance" },
      { title: "Factures", path: "/finance/factures", icon: Receipt, section: "finance" },
      { title: "Paiements", path: "/finance/paiements", icon: CreditCard, section: "finance" },
      { title: "Achats", path: "/finance/achats", icon: ShoppingCart, section: "finance" },
      { title: "Dépenses", path: "/finance/depenses", icon: Wallet, section: "finance" },
    ],
  },
  {
    label: "Parc",
    items: [
      { title: "Matériel", path: "/materiel", icon: Package, section: "materiel" },
      { title: "Check-in/out", path: "/materiel/checkouts", icon: ClipboardCheck, section: "materiel" },
      { title: "Scanner QR", path: "/materiel/scan", icon: QrCode, section: "materiel" },
      { title: "Stockage", path: "/materiel/stockage", icon: MapPin, section: "materiel" },
      { title: "Véhicules", path: "/vehicules", icon: Car, section: "materiel" },
      { title: "Réseau B2B", path: "/suppliers", icon: Users, section: "materiel" },
    ],
  },
  {
    label: "Administration",
    items: [
      { title: "Paramètres", path: "/parametres", icon: Settings, section: "parametres" },
      { title: "SuperAdmin", path: "/superadmin", icon: ShieldAlert, section: "superadmin" },
    ],
  },
];

export const shellQuickAccess: NavigationItem[] = [
  { title: "Accueil", path: "/dashboard", icon: LayoutDashboard, section: "dashboard" },
  { title: "Missions", path: "/missions", icon: Calendar, section: "missions" },
  { title: "Finance", path: "/finance/devis", icon: FileText, section: "finance" },
  { title: "Parc", path: "/materiel", icon: Package, section: "materiel" },
];

export function getPageMeta(pathname: string) {
  if (pathname.startsWith("/missions")) {
    return {
      title: pathname.includes("/nouveau") ? "Nouvelle mission" : "Missions",
      description: "Planification, affectations et lecture terrain.",
    };
  }

  if (pathname.startsWith("/finance")) {
    return {
      title: "Finance",
      description: "Devis, factures et encaissements.",
    };
  }

  if (pathname.startsWith("/materiel") || pathname.startsWith("/vehicules") || pathname.startsWith("/suppliers")) {
    return {
      title: "Parc",
      description: "Disponibilité, stock et opérations logistiques.",
    };
  }

  if (pathname.startsWith("/clients")) {
    return {
      title: "Clients",
      description: "Suivi de compte et relation commerciale.",
    };
  }

  if (pathname.startsWith("/calendrier")) {
    return {
      title: "Calendrier",
      description: "Vue planning et charge opérationnelle.",
    };
  }

  if (pathname.startsWith("/notifications")) {
    return {
      title: "Notifications",
      description: "Alertes, validations et événements récents.",
    };
  }

  if (pathname.startsWith("/parametres") || pathname.startsWith("/prestataires")) {
    return {
      title: "Paramètres",
      description: "Equipe, accès et réglages d'exploitation.",
    };
  }

  return {
    title: "Tableau de bord",
    description: "Priorités du jour, tensions et prochaines actions.",
  };
}
