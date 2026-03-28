import { describe, expect, it } from "vitest";
import { getAssignableProviders, normalizeAssignedProviderId } from "@/lib/provider-assignment";

describe("provider assignment", () => {
  it("only keeps providers backed by a user account for devis/facture assignment", () => {
    const providers = [
      { id: "provider-1", user_id: "user-1", name: "Studio Nord" },
      { id: "provider-2", user_id: null, name: "Prestataire manuel" },
    ];

    expect(getAssignableProviders(providers)).toEqual([
      { id: "provider-1", user_id: "user-1", name: "Studio Nord" },
    ]);
  });

  it("normalizes stored provider assignments back to the provider user id", () => {
    const providers = [
      { id: "provider-1", user_id: "user-1", name: "Studio Nord" },
    ];

    expect(normalizeAssignedProviderId("provider-1", providers)).toBe("user-1");
    expect(normalizeAssignedProviderId("user-1", providers)).toBe("user-1");
  });
});
