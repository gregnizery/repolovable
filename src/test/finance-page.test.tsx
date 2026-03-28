import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Finance from "@/pages/Finance";

const mockUseDevisList = vi.fn();
const mockUseFactures = vi.fn();
const mockUsePaiements = vi.fn();
const mockUseMissions = vi.fn();
const mockUseUserRole = vi.fn();

vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/PaiementFormDialog", () => ({
  PaiementFormDialog: () => <div>Paiement dialog</div>,
}));

vi.mock("@/components/charts/RevenueChart", () => ({
  RevenueChart: () => <div>Revenue chart</div>,
}));

vi.mock("@/components/charts/DevisConversionChart", () => ({
  DevisConversionChart: () => <div>Conversion chart</div>,
}));

vi.mock("@/components/charts/EventTypeChart", () => ({
  EventTypeChart: () => <div>Event chart</div>,
}));

vi.mock("@/components/charts/PaymentDelayChart", () => ({
  PaymentDelayChart: () => <div>Delay chart</div>,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

vi.mock("@/hooks/use-data", () => ({
  useDevisList: () => mockUseDevisList(),
  useFactures: () => mockUseFactures(),
  usePaiements: () => mockUsePaiements(),
  useMissions: () => mockUseMissions(),
}));

vi.mock("@/hooks/use-user-role", () => ({
  useUserRole: () => mockUseUserRole(),
}));

vi.mock("@/hooks/use-realtime-sync", () => ({
  useRealtimeSync: vi.fn(),
}));

describe("Finance page", () => {
  beforeEach(() => {
    mockUseUserRole.mockReturnValue({ data: { role: "manager" } });
    mockUseDevisList.mockReturnValue({
      isLoading: false,
      data: [],
    });
    mockUseFactures.mockReturnValue({
      isLoading: false,
      data: [
        {
          id: "fac-1",
          number: "F-001",
          status: "envoyée",
          total_ttc: 1200,
          date: "2026-03-01T00:00:00.000Z",
          due_date: "2026-03-15T00:00:00.000Z",
          clients: { name: "Maison Lune" },
        },
        {
          id: "fac-2",
          number: "F-002",
          status: "payée",
          total_ttc: 500,
          date: "2026-03-02T00:00:00.000Z",
          due_date: "2026-03-20T00:00:00.000Z",
          clients: { name: "Atelier Nord" },
        },
      ],
    });
    mockUsePaiements.mockReturnValue({
      isLoading: false,
      data: [],
    });
    mockUseMissions.mockReturnValue({
      data: [],
    });
  });

  it("filters the finance listing by search on the active tab", () => {
    render(
      <MemoryRouter initialEntries={["/finance/factures"]}>
        <Routes>
          <Route path="/finance/:section" element={<Finance />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText("Numéro, client, référence"), {
      target: { value: "Maison" },
    });

    expect(screen.getByText("F-001")).toBeInTheDocument();
    expect(screen.queryByText("F-002")).not.toBeInTheDocument();
  });
});
