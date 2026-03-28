import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Missions from "@/pages/Missions";

const mockUseMissions = vi.fn();
const mockUseUserRole = vi.fn();
const mockUseSubscription = vi.fn();

vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/hooks/use-data", () => ({
  useMissions: () => mockUseMissions(),
}));

vi.mock("@/hooks/use-user-role", () => ({
  useUserRole: () => mockUseUserRole(),
  canEdit: () => true,
}));

vi.mock("@/hooks/use-subscription", () => ({
  useSubscription: () => mockUseSubscription(),
}));

vi.mock("@/hooks/use-realtime-sync", () => ({
  useRealtimeSync: vi.fn(),
}));

describe("Missions page", () => {
  beforeEach(() => {
    mockUseUserRole.mockReturnValue({ data: { role: "manager" } });
    mockUseSubscription.mockReturnValue({
      limits: { missionsPerMonth: "unlimited" },
      isFree: false,
    });
    mockUseMissions.mockReturnValue({
      isLoading: false,
      data: [
        {
          id: "1",
          title: "Salon Paris",
          status: "planifiée",
          start_date: "2026-04-02T08:00:00.000Z",
          clients: { name: "Maison Lune" },
          location: "Paris",
          mission_assignments: [],
          devis: [],
          amount: 1200,
          event_type: "Salon",
          created_at: "2026-03-01T10:00:00.000Z",
        },
        {
          id: "2",
          title: "Montage Lyon",
          status: "en_cours",
          start_date: "2026-04-03T08:00:00.000Z",
          clients: { name: "Atelier Nord" },
          location: "Lyon",
          mission_assignments: [],
          devis: [],
          amount: 900,
          event_type: "Montage",
          created_at: "2026-03-01T10:00:00.000Z",
        },
      ],
    });
  });

  it("filters the listing by search and status", () => {
    render(
      <MemoryRouter initialEntries={["/missions"]}>
        <Routes>
          <Route path="/missions" element={<Missions />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getAllByText("Salon Paris").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Montage Lyon").length).toBeGreaterThan(0);

    fireEvent.change(screen.getByPlaceholderText("Titre, client ou lieu"), {
      target: { value: "Maison" },
    });

    expect(screen.getAllByText("Salon Paris").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("Montage Lyon")).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Toutes" }));
    fireEvent.click(screen.getByRole("button", { name: "Planifiée" }));

    expect(screen.getAllByText("Salon Paris").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("Montage Lyon")).toHaveLength(0);
  });
});
