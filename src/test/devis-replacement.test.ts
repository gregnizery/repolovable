import { describe, expect, it } from "vitest";
import {
  evaluateMissionReplacement,
  getMissionReplacementStatusLabel,
} from "@/lib/devis-replacement";

describe("devis replacement preflight", () => {
  it("returns none when there are no active linked devis", () => {
    const result = evaluateMissionReplacement([
      { id: "quote-1", number: "DEV-001", status: "annulé" },
      { id: "quote-2", number: "DEV-002", status: "refusé" },
    ]);

    expect(result).toEqual({ mode: "none", quotes: [] });
  });

  it("requires confirmation for active non-signed devis", () => {
    const result = evaluateMissionReplacement([
      { id: "quote-1", number: "DEV-001", status: "envoyé" },
      { id: "quote-2", number: "DEV-002", status: "expiré" },
    ]);

    expect(result.mode).toBe("confirm");
    expect(result.quotes).toHaveLength(2);
  });

  it("blocks replacement when a signed devis is already linked", () => {
    const result = evaluateMissionReplacement([
      { id: "quote-1", number: "DEV-001", status: "brouillon" },
      { id: "quote-2", number: "DEV-002", status: "signé" },
    ]);

    expect(result.mode).toBe("blocked");
  });

  it("treats legacy accepted status as blocking", () => {
    const result = evaluateMissionReplacement([
      { id: "quote-1", number: "DEV-001", status: "accepted" },
    ]);

    expect(result.mode).toBe("blocked");
  });

  it("formats known status labels for the dialog", () => {
    expect(getMissionReplacementStatusLabel("envoyé")).toBe("Envoyé");
    expect(getMissionReplacementStatusLabel("accepted")).toBe("Accepté");
    expect(getMissionReplacementStatusLabel(null)).toBe("Inconnu");
  });
});
