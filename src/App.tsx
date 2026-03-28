import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { AuthProvider } from "@/hooks/use-auth";
import { ThemeProvider } from "@/hooks/use-theme";
import { WorkspaceProvider } from "@/hooks/use-workspace";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Clients = lazy(() => import("./pages/Clients"));
const ClientDetail = lazy(() => import("./pages/ClientDetail"));
const ClientForm = lazy(() => import("./pages/ClientForm"));
const Missions = lazy(() => import("./pages/Missions"));
const MissionDetail = lazy(() => import("./pages/MissionDetail"));
const MissionForm = lazy(() => import("./pages/MissionForm"));
const Finance = lazy(() => import("./pages/Finance"));
const DevisForm = lazy(() => import("./pages/DevisForm"));
const DevisDetail = lazy(() => import("./pages/DevisDetail"));
const FactureForm = lazy(() => import("./pages/FactureForm"));
const FactureDetail = lazy(() => import("./pages/FactureDetail"));
const Materiel = lazy(() => import("./pages/Materiel"));
const MaterielDetail = lazy(() => import("./pages/MaterielDetail"));
const MaterielForm = lazy(() => import("./pages/MaterielForm"));
const ScanMateriel = lazy(() => import("./pages/ScanMateriel"));
const BatchMovements = lazy(() => import("./pages/BatchMovements"));
const MonitoringDisponibilites = lazy(() => import("./pages/MonitoringDisponibilites"));
const StorageLocations = lazy(() => import("./pages/StorageLocations"));
const Settings = lazy(() => import("./pages/Settings"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Suppliers = lazy(() => import("./pages/Suppliers"));
const Providers = lazy(() => import("./pages/Providers"));
const ProviderDetail = lazy(() => import("./pages/ProviderDetail"));
const ProviderOnboarding = lazy(() => import("./pages/ProviderOnboarding"));
const PublicDevisSign = lazy(() => import("./pages/PublicDevisSign"));
const PublicClientPortal = lazy(() => import("./pages/PublicClientPortal"));
const PublicLegalPage = lazy(() => import("./pages/PublicLegalPage"));
const AcceptInvitation = lazy(() => import("./pages/AcceptInvitation"));
const EmailConfirmed = lazy(() => import("./pages/EmailConfirmed"));
const Reforme2026 = lazy(() => import("./pages/Reforme2026"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const SuperAdmin = lazy(() => import("./pages/SuperAdmin"));
const Calendrier = lazy(() => import("./pages/Calendrier"));
const Expenses = lazy(() => import("./pages/Expenses"));
const SupplierInvoices = lazy(() => import("./pages/SupplierInvoices"));
const EquipmentCheckouts = lazy(() => import("./pages/EquipmentCheckouts"));
const Vehicles = lazy(() => import("./pages/Vehicles"));
const VehicleDetail = lazy(() => import("./pages/VehicleDetail"));
const SupplierDetail = lazy(() => import("./pages/SupplierDetail"));
const WorkspaceSelect = lazy(() => import("./pages/WorkspaceSelect"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="rounded-2xl border border-border/70 bg-card px-5 py-4 shadow-card">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Chargement</p>
        <p className="mt-1 text-sm text-foreground">Ouverture de l’espace en cours…</p>
      </div>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <WorkspaceProvider>
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/verify-email" element={<VerifyEmail />} />
                  <Route path="/select-workspace" element={<ProtectedRoute allowWithoutWorkspace><WorkspaceSelect /></ProtectedRoute>} />
                  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/clients" element={<ProtectedRoute requiredSection="clients"><Clients /></ProtectedRoute>} />
                  <Route path="/clients/nouveau" element={<ProtectedRoute requiredSection="clients"><ClientForm /></ProtectedRoute>} />
                  <Route path="/clients/:id" element={<ProtectedRoute requiredSection="clients"><ClientDetail /></ProtectedRoute>} />
                  <Route path="/clients/:id/modifier" element={<ProtectedRoute requiredSection="clients"><ClientForm /></ProtectedRoute>} />
                  <Route path="/missions" element={<ProtectedRoute requiredSection="missions"><Missions /></ProtectedRoute>} />
                  <Route path="/calendrier" element={<ProtectedRoute requiredSection="missions"><Calendrier /></ProtectedRoute>} />
                  <Route path="/missions/nouveau" element={<ProtectedRoute requiredSection="missions"><MissionForm /></ProtectedRoute>} />
                  <Route path="/missions/:id" element={<ProtectedRoute requiredSection="missions"><MissionDetail /></ProtectedRoute>} />
                  <Route path="/missions/:id/modifier" element={<ProtectedRoute requiredSection="missions"><MissionForm /></ProtectedRoute>} />
                  <Route path="/finance/devis" element={<ProtectedRoute requiredSection="finance"><Finance /></ProtectedRoute>} />
                  <Route path="/finance/devis/nouveau" element={<ProtectedRoute requiredSection="finance"><DevisForm /></ProtectedRoute>} />
                  <Route path="/finance/devis/:id" element={<ProtectedRoute requiredSection="finance"><DevisDetail /></ProtectedRoute>} />
                  <Route path="/finance/devis/:id/modifier" element={<ProtectedRoute requiredSection="finance"><DevisForm /></ProtectedRoute>} />
                  <Route path="/finance/factures" element={<ProtectedRoute requiredSection="finance"><Finance /></ProtectedRoute>} />
                  <Route path="/finance/factures/nouveau" element={<ProtectedRoute requiredSection="finance"><FactureForm /></ProtectedRoute>} />
                  <Route path="/finance/factures/:id" element={<ProtectedRoute requiredSection="finance"><FactureDetail /></ProtectedRoute>} />
                  <Route path="/finance/factures/:id/modifier" element={<ProtectedRoute requiredSection="finance"><FactureForm /></ProtectedRoute>} />
                  <Route path="/finance/paiements" element={<ProtectedRoute requiredSection="finance"><Finance /></ProtectedRoute>} />
                  <Route path="/finance/depenses" element={<ProtectedRoute requiredSection="finance"><Expenses /></ProtectedRoute>} />
                  <Route path="/finance/achats" element={<ProtectedRoute requiredSection="finance"><SupplierInvoices /></ProtectedRoute>} />
                  <Route path="/finance" element={<Navigate to="/finance/devis" replace />} />
                  <Route path="/materiel" element={<ProtectedRoute requiredSection="materiel"><Materiel /></ProtectedRoute>} />
                  <Route path="/materiel/nouveau" element={<ProtectedRoute requiredSection="materiel"><MaterielForm /></ProtectedRoute>} />
                  <Route path="/materiel/scan" element={<ProtectedRoute requiredSection="materiel"><ScanMateriel /></ProtectedRoute>} />
                  <Route path="/materiel/mouvements" element={<ProtectedRoute requiredSection="materiel"><BatchMovements /></ProtectedRoute>} />
                  <Route path="/materiel/checkouts" element={<ProtectedRoute requiredSection="materiel"><EquipmentCheckouts /></ProtectedRoute>} />
                  <Route path="/materiel/stockage" element={<ProtectedRoute requiredSection="materiel"><StorageLocations /></ProtectedRoute>} />
                  <Route path="/vehicules" element={<ProtectedRoute requiredSection="materiel"><Vehicles /></ProtectedRoute>} />
                  <Route path="/vehicules/:id" element={<ProtectedRoute requiredSection="materiel"><VehicleDetail /></ProtectedRoute>} />
                  <Route path="/suppliers" element={<ProtectedRoute requiredSection="materiel"><Suppliers /></ProtectedRoute>} />
                  <Route path="/suppliers/:id" element={<ProtectedRoute requiredSection="materiel"><SupplierDetail /></ProtectedRoute>} />
                  <Route path="/prestataires" element={<ProtectedRoute requiredSection="parametres"><Providers /></ProtectedRoute>} />
                  <Route path="/prestataires/:id" element={<ProtectedRoute requiredSection="parametres"><ProviderDetail /></ProtectedRoute>} />
                  <Route path="/materiel/disponibilites" element={<ProtectedRoute requiredSection="materiel"><MonitoringDisponibilites /></ProtectedRoute>} />
                  <Route path="/materiel/:id" element={<ProtectedRoute requiredSection="materiel"><MaterielDetail /></ProtectedRoute>} />
                  <Route path="/materiel/:id/modifier" element={<ProtectedRoute requiredSection="materiel"><MaterielForm /></ProtectedRoute>} />
                  <Route path="/parametres" element={<ProtectedRoute requiredSection="parametres"><Settings /></ProtectedRoute>} />
                  <Route path="/onboarding/prestataire" element={<ProtectedRoute><ProviderOnboarding /></ProtectedRoute>} />
                  <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                  <Route path="/public/devis/sign" element={<PublicDevisSign />} />
                  <Route path="/public/client-portal" element={<PublicClientPortal />} />
                  <Route path="/legal" element={<Navigate to="/legal/mentions-legales" replace />} />
                  <Route path="/legal/:slug" element={<PublicLegalPage />} />
                  <Route path="/invitation" element={<AcceptInvitation />} />
                  <Route path="/email-confirmed" element={<EmailConfirmed />} />
                  <Route path="/reforme-2026" element={<Reforme2026 />} />
                  <Route path="/superadmin" element={<ProtectedRoute requiredSection="superadmin"><SuperAdmin /></ProtectedRoute>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </WorkspaceProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
