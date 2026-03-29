import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { BottomNav } from "@/components/layout/BottomNav";

const mockUseUserRole = vi.fn();

vi.mock("@/hooks/use-user-role", () => ({
  useUserRole: () => mockUseUserRole(),
  canAccess: () => true,
}));

describe("BottomNav", () => {
  it("renders the industrial mobile navigation and opens the menu", () => {
    const onMenuOpen = vi.fn();
    mockUseUserRole.mockReturnValue({ data: { role: "manager" } });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <BottomNav onMenuOpen={onMenuOpen} />
      </MemoryRouter>,
    );

    expect(screen.getByText("Planify")).toBeInTheDocument();
    expect(screen.getByText("Logistique")).toBeInTheDocument();
    expect(screen.getByText("Facturation")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /menu/i }));
    expect(onMenuOpen).toHaveBeenCalledTimes(1);
  });
});
