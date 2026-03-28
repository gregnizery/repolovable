import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider, useTheme } from "@/hooks/use-theme";

function ThemeProbe() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button type="button" onClick={toggleTheme}>
      {theme}
    </button>
  );
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
  });

  it("persists the selected theme and applies it to the root element", async () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    await waitFor(() => expect(document.documentElement).toHaveClass("light"));
    fireEvent.click(screen.getByRole("button", { name: "light" }));

    await waitFor(() => {
      expect(document.documentElement).toHaveClass("dark");
      expect(localStorage.getItem("planify-theme")).toBe("dark");
    });
  });
});
