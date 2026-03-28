import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Login from "@/pages/Login";

const mockSignIn = vi.fn();
const mockUseAuth = vi.fn();
const mockToast = vi.fn();

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/hooks/use-failsafe-redirect", () => ({
  useFailsafeRedirect: () => ({ shouldBlock: false, clearFailsafe: vi.fn() }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe("Login page", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ signIn: mockSignIn, user: null });
    mockSignIn.mockResolvedValue({ error: null });
    mockToast.mockReset();
  });

  it("uses proper autocomplete and displays inline auth errors", async () => {
    mockSignIn.mockResolvedValue({ error: { message: "Identifiants invalides" } });

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByLabelText("Email")).toHaveAttribute("autocomplete", "username");
    expect(screen.getByLabelText("Mot de passe")).toHaveAttribute("autocomplete", "current-password");

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ops@example.com" } });
    fireEvent.change(screen.getByLabelText("Mot de passe"), { target: { value: "bad-password" } });
    fireEvent.click(screen.getByRole("button", { name: /se connecter/i }));

    await waitFor(() => {
      expect(screen.getByText("Identifiants invalides")).toBeInTheDocument();
      expect(mockToast).toHaveBeenCalled();
    });
  });
});
