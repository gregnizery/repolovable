// ============================================
// PLANIFY — Complete Mock Data
// ============================================

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  type: "particulier" | "entreprise";
  status: "actif" | "prospect" | "inactif";
  createdAt: string;
  totalRevenue: number;
  missionsCount: number;
}

export interface Mission {
  id: string;
  title: string;
  clientId: string;
  clientName: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  status: "planifiée" | "en_cours" | "terminée" | "annulée";
  type: string;
  team: string[];
  equipment: string[];
  amount: number;
}

export interface Devis {
  id: string;
  number: string;
  clientId: string;
  clientName: string;
  date: string;
  validUntil: string;
  status: "brouillon" | "envoyé" | "signé" | "refusé" | "expiré";
  totalHT: number;
  totalTTC: number;
  items: { description: string; quantity: number; unitPrice: number }[];
}

export interface Facture {
  id: string;
  number: string;
  clientId: string;
  clientName: string;
  devisId?: string;
  date: string;
  dueDate: string;
  status: "brouillon" | "envoyée" | "payée" | "en_retard" | "annulée";
  totalHT: number;
  totalTTC: number;
  paidAmount: number;
  items: { description: string; quantity: number; unitPrice: number }[];
}

export interface Paiement {
  id: string;
  factureId: string;
  factureNumber: string;
  clientName: string;
  date: string;
  amount: number;
  method: "virement" | "carte" | "espèces" | "chèque" | "stripe";
}

export interface Equipment {
  id: string;
  name: string;
  category: string;
  serialNumber: string;
  status: "disponible" | "en_mission" | "maintenance" | "hors_service";
  location: string;
  dailyRate: number;
  lastCheck: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "dj" | "technician";
  avatar: string;
  status: "actif" | "inactif";
  createdAt: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  createdAt: string;
}

export interface Activity {
  id: string;
  action: string;
  user: string;
  target: string;
  timestamp: string;
  type: "devis" | "facture" | "mission" | "client" | "paiement";
}

// ---- CLIENTS ----
export const mockClients: Client[] = [
  { id: "c1", name: "Marie Dupont", email: "marie@eventpro.fr", phone: "06 12 34 56 78", company: "EventPro", type: "entreprise", status: "actif", createdAt: "2025-01-15", totalRevenue: 45200, missionsCount: 12 },
  { id: "c2", name: "Jean Martin", email: "jean@soirees-chic.com", phone: "06 98 76 54 32", company: "Soirées Chic", type: "entreprise", status: "actif", createdAt: "2025-02-20", totalRevenue: 28500, missionsCount: 8 },
  { id: "c3", name: "Sophie Laurent", email: "sophie.laurent@gmail.com", phone: "07 11 22 33 44", company: "", type: "particulier", status: "prospect", createdAt: "2025-11-05", totalRevenue: 0, missionsCount: 0 },
  { id: "c4", name: "Pierre Moreau", email: "pierre@fetes-corp.fr", phone: "06 55 44 33 22", company: "Fêtes Corp", type: "entreprise", status: "actif", createdAt: "2024-09-12", totalRevenue: 67800, missionsCount: 22 },
  { id: "c5", name: "Camille Roux", email: "camille.roux@outlook.com", phone: "07 66 55 44 33", company: "", type: "particulier", status: "actif", createdAt: "2025-06-18", totalRevenue: 3200, missionsCount: 2 },
  { id: "c6", name: "Luc Bernard", email: "luc@bernard-events.fr", phone: "06 77 88 99 00", company: "Bernard Events", type: "entreprise", status: "inactif", createdAt: "2024-03-10", totalRevenue: 15600, missionsCount: 5 },
];

// ---- MISSIONS ----
export const mockMissions: Mission[] = [
  { id: "m1", title: "Mariage Dupont-Martin", clientId: "c1", clientName: "Marie Dupont", date: "2026-03-15", startTime: "18:00", endTime: "04:00", location: "Château de Versailles", status: "planifiée", type: "Mariage", team: ["DJ Max", "Tech Lucas"], equipment: ["Pioneer DDJ-1000", "JBL EON 615 x4", "Éclairage LED x8"], amount: 4500 },
  { id: "m2", title: "Soirée Corporate Q1", clientId: "c2", clientName: "Jean Martin", date: "2026-02-28", startTime: "20:00", endTime: "02:00", location: "Pavillon Royal, Paris", status: "planifiée", type: "Corporate", team: ["DJ Sophie"], equipment: ["Denon SC6000 x2", "QSC K12.2 x2"], amount: 2800 },
  { id: "m3", title: "Festival été Moreau", clientId: "c4", clientName: "Pierre Moreau", date: "2026-07-12", startTime: "14:00", endTime: "23:00", location: "Parc des Expos, Lyon", status: "planifiée", type: "Festival", team: ["DJ Max", "DJ Sophie", "Tech Lucas", "Tech Emma"], equipment: ["Pioneer CDJ-3000 x4", "DJM-A9", "JBL VTX x8", "Éclairage Scène complète"], amount: 12000 },
  { id: "m4", title: "Anniversaire Roux", clientId: "c5", clientName: "Camille Roux", date: "2026-02-10", startTime: "20:00", endTime: "01:00", location: "Salle des Fêtes, Nantes", status: "terminée", type: "Anniversaire", team: ["DJ Max"], equipment: ["Pioneer DDJ-1000", "JBL EON 615 x2"], amount: 1600 },
  { id: "m5", title: "Gala de charité", clientId: "c4", clientName: "Pierre Moreau", date: "2026-04-05", startTime: "19:00", endTime: "01:00", location: "Grand Hôtel, Bordeaux", status: "planifiée", type: "Gala", team: ["DJ Sophie", "Tech Emma"], equipment: ["Denon SC6000 x2", "QSC K12.2 x4", "Micro HF x2"], amount: 5200 },
];

// ---- DEVIS ----
export const mockDevis: Devis[] = [
  { id: "d1", number: "DEV-2026-001", clientId: "c1", clientName: "Marie Dupont", date: "2026-01-10", validUntil: "2026-02-10", status: "signé", totalHT: 3750, totalTTC: 4500, items: [{ description: "Prestation DJ Mariage (10h)", quantity: 1, unitPrice: 2500 }, { description: "Sonorisation complète", quantity: 1, unitPrice: 800 }, { description: "Éclairage ambiance", quantity: 1, unitPrice: 450 }] },
  { id: "d2", number: "DEV-2026-002", clientId: "c2", clientName: "Jean Martin", date: "2026-01-20", validUntil: "2026-02-20", status: "envoyé", totalHT: 2333, totalTTC: 2800, items: [{ description: "Prestation DJ Corporate (6h)", quantity: 1, unitPrice: 1800 }, { description: "Sonorisation premium", quantity: 1, unitPrice: 533 }] },
  { id: "d3", number: "DEV-2026-003", clientId: "c4", clientName: "Pierre Moreau", date: "2026-02-01", validUntil: "2026-03-01", status: "brouillon", totalHT: 10000, totalTTC: 12000, items: [{ description: "Prestation Festival (9h)", quantity: 1, unitPrice: 5000 }, { description: "Sono Festival complète", quantity: 1, unitPrice: 3000 }, { description: "Éclairage scène", quantity: 1, unitPrice: 2000 }] },
  { id: "d4", number: "DEV-2026-004", clientId: "c3", clientName: "Sophie Laurent", date: "2026-02-05", validUntil: "2026-03-05", status: "envoyé", totalHT: 1250, totalTTC: 1500, items: [{ description: "Prestation DJ Anniversaire (5h)", quantity: 1, unitPrice: 1000 }, { description: "Sonorisation basique", quantity: 1, unitPrice: 250 }] },
  { id: "d5", number: "DEV-2026-005", clientId: "c4", clientName: "Pierre Moreau", date: "2026-02-08", validUntil: "2026-03-08", status: "signé", totalHT: 4333, totalTTC: 5200, items: [{ description: "Prestation DJ Gala (6h)", quantity: 1, unitPrice: 2500 }, { description: "Sonorisation premium", quantity: 1, unitPrice: 1200 }, { description: "Micro HF", quantity: 2, unitPrice: 316.5 }] },
];

// ---- FACTURES ----
export const mockFactures: Facture[] = [
  { id: "f1", number: "FAC-2026-001", clientId: "c1", clientName: "Marie Dupont", devisId: "d1", date: "2026-01-15", dueDate: "2026-02-15", status: "payée", totalHT: 3750, totalTTC: 4500, paidAmount: 4500, items: [{ description: "Prestation DJ Mariage (10h)", quantity: 1, unitPrice: 2500 }, { description: "Sonorisation complète", quantity: 1, unitPrice: 800 }, { description: "Éclairage ambiance", quantity: 1, unitPrice: 450 }] },
  { id: "f2", number: "FAC-2026-002", clientId: "c5", clientName: "Camille Roux", date: "2026-02-11", dueDate: "2026-03-11", status: "envoyée", totalHT: 1333, totalTTC: 1600, paidAmount: 0, items: [{ description: "Prestation DJ Anniversaire (5h)", quantity: 1, unitPrice: 1083 }, { description: "Sonorisation basique", quantity: 1, unitPrice: 250 }] },
  { id: "f3", number: "FAC-2025-018", clientId: "c4", clientName: "Pierre Moreau", date: "2025-12-15", dueDate: "2026-01-15", status: "en_retard", totalHT: 2500, totalTTC: 3000, paidAmount: 0, items: [{ description: "Prestation DJ Gala (6h)", quantity: 1, unitPrice: 1800 }, { description: "Sonorisation", quantity: 1, unitPrice: 700 }] },
  { id: "f4", number: "FAC-2026-003", clientId: "c2", clientName: "Jean Martin", date: "2026-02-12", dueDate: "2026-03-12", status: "brouillon", totalHT: 2333, totalTTC: 2800, paidAmount: 0, items: [{ description: "Prestation DJ Corporate (6h)", quantity: 1, unitPrice: 1800 }, { description: "Sonorisation premium", quantity: 1, unitPrice: 533 }] },
];

// ---- PAIEMENTS ----
export const mockPaiements: Paiement[] = [
  { id: "p1", factureId: "f1", factureNumber: "FAC-2026-001", clientName: "Marie Dupont", date: "2026-02-10", amount: 4500, method: "virement" },
  { id: "p2", factureId: "f1", factureNumber: "FAC-2026-001", clientName: "Marie Dupont", date: "2026-01-20", amount: 2250, method: "stripe" },
];

// ---- MATÉRIEL ----
export const mockEquipment: Equipment[] = [
  { id: "e1", name: "Pioneer DDJ-1000", category: "Contrôleur DJ", serialNumber: "PDJ-001-2024", status: "disponible", location: "Entrepôt principal", dailyRate: 80, lastCheck: "2026-01-20" },
  { id: "e2", name: "Pioneer CDJ-3000", category: "Platine", serialNumber: "CDJ-001-2024", status: "en_mission", location: "Mission m3", dailyRate: 120, lastCheck: "2026-01-15" },
  { id: "e3", name: "JBL EON 615", category: "Enceinte", serialNumber: "JBL-001-2024", status: "disponible", location: "Entrepôt principal", dailyRate: 45, lastCheck: "2026-02-01" },
  { id: "e4", name: "QSC K12.2", category: "Enceinte", serialNumber: "QSC-001-2024", status: "disponible", location: "Entrepôt principal", dailyRate: 55, lastCheck: "2026-01-28" },
  { id: "e5", name: "Denon SC6000", category: "Platine", serialNumber: "DEN-001-2024", status: "maintenance", location: "Atelier", dailyRate: 100, lastCheck: "2026-01-10" },
  { id: "e6", name: "DJM-A9", category: "Table de mixage", serialNumber: "DJM-001-2024", status: "disponible", location: "Entrepôt principal", dailyRate: 150, lastCheck: "2026-02-05" },
  { id: "e7", name: "JBL VTX A8", category: "Line Array", serialNumber: "VTX-001-2024", status: "en_mission", location: "Mission m3", dailyRate: 200, lastCheck: "2026-01-22" },
  { id: "e8", name: "Shure QLXD24", category: "Micro HF", serialNumber: "SHR-001-2024", status: "disponible", location: "Entrepôt principal", dailyRate: 35, lastCheck: "2026-01-30" },
  { id: "e9", name: "ADJ Mega Hex Par", category: "Éclairage", serialNumber: "ADJ-001-2024", status: "disponible", location: "Entrepôt principal", dailyRate: 15, lastCheck: "2026-02-02" },
  { id: "e10", name: "Chauvet Intimidator", category: "Éclairage", serialNumber: "CHV-001-2024", status: "hors_service", location: "Atelier", dailyRate: 25, lastCheck: "2025-12-15" },
];

// ---- USERS ----
export const mockUsers: User[] = [
  { id: "u1", name: "Grégoire Nizery", email: "greg@planify.fr", role: "admin", avatar: "GN", status: "actif", createdAt: "2024-01-01" },
  { id: "u2", name: "Max Dubois", email: "max@planify.fr", role: "dj", avatar: "MD", status: "actif", createdAt: "2024-03-15" },
  { id: "u3", name: "Sophie Petit", email: "sophie@planify.fr", role: "dj", avatar: "SP", status: "actif", createdAt: "2024-06-01" },
  { id: "u4", name: "Lucas Bernard", email: "lucas@planify.fr", role: "technician", avatar: "LB", status: "actif", createdAt: "2024-09-01" },
  { id: "u5", name: "Emma Martin", email: "emma@planify.fr", role: "technician", avatar: "EM", status: "actif", createdAt: "2025-01-15" },
  { id: "u6", name: "Thomas Girard", email: "thomas@planify.fr", role: "manager", avatar: "TG", status: "inactif", createdAt: "2024-02-01" },
];

// ---- NOTIFICATIONS ----
export const mockNotifications: Notification[] = [
  { id: "n1", title: "Devis signé", message: "Marie Dupont a signé le devis DEV-2026-001", type: "success", read: false, createdAt: "2026-02-14T10:30:00" },
  { id: "n2", title: "Facture en retard", message: "La facture FAC-2025-018 de Pierre Moreau est en retard de 30 jours", type: "warning", read: false, createdAt: "2026-02-14T09:00:00" },
  { id: "n3", title: "Nouveau client", message: "Sophie Laurent a été ajoutée comme prospect", type: "info", read: true, createdAt: "2026-02-13T16:45:00" },
  { id: "n4", title: "Mission terminée", message: "Anniversaire Roux terminé avec succès", type: "success", read: true, createdAt: "2026-02-11T01:30:00" },
  { id: "n5", title: "Matériel en maintenance", message: "Denon SC6000 envoyé en maintenance", type: "warning", read: true, createdAt: "2026-02-10T14:00:00" },
];

// ---- ACTIVITY ----
export const mockActivities: Activity[] = [
  { id: "a1", action: "a signé", user: "Marie Dupont", target: "DEV-2026-001", timestamp: "2026-02-14T10:30:00", type: "devis" },
  { id: "a2", action: "a créé", user: "Grégoire", target: "DEV-2026-005", timestamp: "2026-02-08T15:20:00", type: "devis" },
  { id: "a3", action: "a envoyé", user: "Grégoire", target: "FAC-2026-002", timestamp: "2026-02-11T11:00:00", type: "facture" },
  { id: "a4", action: "a payé", user: "Marie Dupont", target: "FAC-2026-001", timestamp: "2026-02-10T09:15:00", type: "paiement" },
  { id: "a5", action: "a ajouté", user: "Grégoire", target: "Sophie Laurent", timestamp: "2026-02-13T16:45:00", type: "client" },
  { id: "a6", action: "a planifié", user: "Grégoire", target: "Gala de charité", timestamp: "2026-02-08T14:30:00", type: "mission" },
];

// ---- KPIs ----
export const mockKPIs = {
  totalRevenue: 160300,
  revenueGrowth: 12.5,
  activeClients: 4,
  clientsGrowth: 8,
  pendingDevis: 2,
  devisAmount: 4300,
  unpaidInvoices: 2,
  unpaidAmount: 4600,
  upcomingMissions: 4,
  equipmentAvailable: 7,
  equipmentTotal: 10,
};

// ---- CHART DATA ----
export const mockChartData = [
  { month: "Sep", revenue: 8500, expenses: 3200 },
  { month: "Oct", revenue: 12400, expenses: 4100 },
  { month: "Nov", revenue: 9800, expenses: 3800 },
  { month: "Déc", revenue: 15200, expenses: 5200 },
  { month: "Jan", revenue: 11600, expenses: 4500 },
  { month: "Fév", revenue: 13800, expenses: 4800 },
];
