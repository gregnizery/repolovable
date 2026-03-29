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
  Rows3,
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
    label: "Suite Planify",
    items: [
      { title: "Planify", path: "/dashboard", icon: LayoutDashboard, section: "dashboard" },
      { title: "Planify Logistique", path: "/logistique", icon: Package, section: "missions" },
      { title: "Planify Facturation", path: "/facturation", icon: Receipt, section: "finance" },
      { title: "Planify Administration", path: "/administration", icon: Rows3, section: "parametres" },
    ],
  },
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
  { title: "Planify", path: "/dashboard", icon: LayoutDashboard, section: "dashboard" },
  { title: "Logistique", path: "/logistique", icon: Package, section: "missions" },
  { title: "Facturation", path: "/facturation", icon: Receipt, section: "finance" },
  { title: "Admin", path: "/administration", icon: Rows3, section: "parametres" },
];

export function getPageMeta(pathname: string) {
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    return {
      title: "Planify",
      description: "Portail commun de la suite logistique, facturation et administration.",
    };
  }

  if (pathname.startsWith("/logistique")) {
    return {
      title: "Planify Logistique",
      description: "Missions, calendrier, parc, transports et opérations terrain.",
    };
  }

  if (pathname.startsWith("/facturation")) {
    return {
      title: "Planify Facturation",
      description: "Devis, factures, paiements et flux financiers d'exploitation.",
    };
  }

  if (pathname.startsWith("/administration")) {
    return {
      title: "Planify Administration",
      description: "Clients, prestataires, accès et gouvernance du workspace.",
    };
  }

  if (pathname.startsWith("/missions")) {
    return {
      title: pathname.includes("/nouveau") ? "Planify Logistique" : "Planify Logistique",
      description: "Planification, affectations et lecture terrain.",
    };
  }

  if (pathname.startsWith("/finance")) {
    return {
      title: "Planify Facturation",
      description: "Devis, factures et encaissements.",
    };
  }

  if (pathname.startsWith("/materiel") || pathname.startsWith("/vehicules") || pathname.startsWith("/suppliers")) {
    return {
      title: "Planify Logistique",
      description: "Disponibilité, stock et opérations logistiques.",
    };
  }

  if (pathname.startsWith("/clients")) {
    return {
      title: "Planify Administration",
      description: "Suivi de compte et relation commerciale.",
    };
  }

  if (pathname.startsWith("/calendrier")) {
    return {
      title: "Planify Logistique",
      description: "Vue planning et charge opérationnelle.",
    };
  }

  if (pathname.startsWith("/notifications")) {
    return {
      title: "Planify Administration",
      description: "Alertes, validations et événements récents.",
    };
  }

  if (pathname.startsWith("/parametres") || pathname.startsWith("/prestataires")) {
    return {
      title: "Planify Administration",
      description: "Equipe, accès et réglages d'exploitation.",
    };
  }

  return {
    title: "Planify",
    description: "Portail commun de la suite logistique, facturation et administration.",
  };
}
