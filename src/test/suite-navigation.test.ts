import { getPageMeta, navGroups, shellQuickAccess } from "@/components/layout/navigation";

describe("suite navigation", () => {
  it("exposes the three Planify modules in the shell", () => {
    const titles = navGroups
      .flatMap((group) => group.items)
      .map((item) => item.title);

    expect(titles).toContain("Planify");
    expect(titles).toContain("Planify Logistique");
    expect(titles).toContain("Planify Facturation");
    expect(titles).toContain("Planify Administration");

    expect(shellQuickAccess.map((item) => item.path)).toEqual([
      "/dashboard",
      "/logistique",
      "/facturation",
      "/administration",
    ]);
  });

  it("returns module metadata for the suite hubs", () => {
    expect(getPageMeta("/logistique").title).toBe("Planify Logistique");
    expect(getPageMeta("/facturation").title).toBe("Planify Facturation");
    expect(getPageMeta("/administration").title).toBe("Planify Administration");
    expect(getPageMeta("/dashboard").title).toBe("Planify");
  });
});
