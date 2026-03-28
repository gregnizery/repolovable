import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Materiel from "@/pages/Materiel";

const mockUseMateriel = vi.fn();
const mockUseUserRole = vi.fn();

vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/MaterielQrHover", () => ({
  MaterielQrHover: () => null,
}));

vi.mock("@/hooks/use-data", () => ({
  useMateriel: () => mockUseMateriel(),
}));

vi.mock("@/hooks/use-user-role", () => ({
  useUserRole: () => mockUseUserRole(),
  canEdit: () => true,
}));

vi.mock("@/hooks/use-realtime-sync", () => ({
  useRealtimeSync: vi.fn(),
}));

describe("Materiel page", () => {
  beforeEach(() => {
    mockUseUserRole.mockReturnValue({ data: { role: "manager" } });
    mockUseMateriel.mockReturnValue({
      isLoading: false,
      data: [
        {
          id: "eq-1",
          name: "Projecteur A",
          status: "disponible",
          category: "Lumière",
          quantity: 3,
          rental_price: 45,
          is_subrented: false,
          is_b2b_shared: false,
          storage_locations: { name: "Dépôt A" },
          suppliers: null,
          mission_materiel: [],
        },
        {
          id: "eq-2",
          name: "Console Son",
          status: "maintenance",
          category: "Audio",
          quantity: 1,
          rental_price: 60,
          is_subrented: true,
          is_b2b_shared: false,
          storage_locations: null,
          suppliers: { name: "LocaTech" },
          mission_materiel: [],
        },
      ],
    });
  });

  it("filters the inventory by search and status", () => {
    render(
      <MemoryRouter initialEntries={["/materiel"]}>
        <Routes>
          <Route path="/materiel" element={<Materiel />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText("Nom, catégorie, stockage ou fournisseur"), {
      target: { value: "LocaTech" },
    });

    expect(screen.getByText("Console Son")).toBeInTheDocument();
    expect(screen.queryByText("Projecteur A")).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Nom, catégorie, stockage ou fournisseur"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Maintenance" }));

    expect(screen.getByText("Console Son")).toBeInTheDocument();
    expect(screen.queryByText("Projecteur A")).not.toBeInTheDocument();
  });
});
