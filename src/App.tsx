import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./hooks/use-theme";
import { AuthProvider } from "./hooks/use-auth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import ClientForm from "./pages/ClientForm";
import Missions from "./pages/Missions";
import MissionDetail from "./pages/MissionDetail";
import MissionForm from "./pages/MissionForm";
import Finance from "./pages/Finance";
import DevisForm from "./pages/DevisForm";
import DevisDetail from "./pages/DevisDetail";
import FactureForm from "./pages/FactureForm";
import FactureDetail from "./pages/FactureDetail";
import Materiel from "./pages/Materiel";
import MaterielDetail from "./pages/MaterielDetail";
import MaterielForm from "./pages/MaterielForm";
import ScanMateriel from "./pages/ScanMateriel";
import BatchMovements from "./pages/BatchMovements";
import MonitoringDisponibilites from "./pages/MonitoringDisponibilites";
import StorageLocations from "./pages/StorageLocations";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import Suppliers from "./pages/Suppliers";
import Providers from "./pages/Providers";
import ProviderDetail from "./pages/ProviderDetail";
import ProviderOnboarding from "./pages/ProviderOnboarding";
import PublicDevisSign from "./pages/PublicDevisSign";
import PublicClientPortal from "./pages/PublicClientPortal";
import AcceptInvitation from "./pages/AcceptInvitation";
import EmailConfirmed from "./pages/EmailConfirmed";
import Reforme2026 from "./pages/Reforme2026";
import VerifyEmail from "./pages/VerifyEmail";
import SuperAdmin from "./pages/SuperAdmin";
import Calendrier from "./pages/Calendrier";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
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
              <Route path="/finance" element={<Navigate to="/finance/devis" replace />} />
              <Route path="/materiel" element={<ProtectedRoute requiredSection="materiel"><Materiel /></ProtectedRoute>} />
              <Route path="/materiel/nouveau" element={<ProtectedRoute requiredSection="materiel"><MaterielForm /></ProtectedRoute>} />
              <Route path="/materiel/scan" element={<ProtectedRoute requiredSection="materiel"><ScanMateriel /></ProtectedRoute>} />
              <Route path="/materiel/mouvements" element={<ProtectedRoute requiredSection="materiel"><BatchMovements /></ProtectedRoute>} />
              <Route path="/materiel/stockage" element={<ProtectedRoute requiredSection="materiel"><StorageLocations /></ProtectedRoute>} />
              <Route path="/suppliers" element={<ProtectedRoute requiredSection="materiel"><Suppliers /></ProtectedRoute>} />
              <Route path="/prestataires" element={<ProtectedRoute requiredSection="parametres"><Providers /></ProtectedRoute>} />
              <Route path="/prestataires/:id" element={<ProtectedRoute requiredSection="parametres"><ProviderDetail /></ProtectedRoute>} />
              <Route path="/materiel/disponibilites" element={<ProtectedRoute requiredSection="materiel"><MonitoringDisponibilites /></ProtectedRoute>} />
              <Route path="/materiel/:id" element={<ProtectedRoute requiredSection="materiel"><MaterielDetail /></ProtectedRoute>} />
              <Route path="/materiel/:id/modifier" element={<ProtectedRoute requiredSection="materiel"><MaterielForm /></ProtectedRoute>} />
              <Route path="/parametres" element={<ProtectedRoute requiredSection="parametres"><Settings /></ProtectedRoute>} />
              <Route path="/onboarding/prestataire" element={<ProviderOnboarding />} />
              <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
              <Route path="/public/devis/sign" element={<PublicDevisSign />} />
              <Route path="/public/client-portal" element={<PublicClientPortal />} />
              <Route path="/invitation" element={<AcceptInvitation />} />
              <Route path="/email-confirmed" element={<EmailConfirmed />} />
              <Route path="/reforme-2026" element={<Reforme2026 />} />
              <Route path="/superadmin" element={<ProtectedRoute requiredSection="superadmin"><SuperAdmin /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
