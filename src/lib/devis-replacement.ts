export type MissionReplacementQuote = {
  id: string;
  number: string;
  status: string | null;
};

export type MissionReplacementMode = "none" | "confirm" | "blocked";

const IGNORED_STATUSES = new Set(["annulé", "refusé"]);
const BLOCKING_STATUSES = new Set(["signé", "accepted"]);

export function evaluateMissionReplacement(quotes: MissionReplacementQuote[]): {
  mode: MissionReplacementMode;
  quotes: MissionReplacementQuote[];
} {
  const activeQuotes = quotes.filter((quote) => !IGNORED_STATUSES.has(quote.status ?? ""));

  if (activeQuotes.length === 0) {
    return { mode: "none", quotes: [] };
  }

  const hasBlockingQuote = activeQuotes.some((quote) => BLOCKING_STATUSES.has(quote.status ?? ""));

  return {
    mode: hasBlockingQuote ? "blocked" : "confirm",
    quotes: activeQuotes,
  };
}

export function getMissionReplacementStatusLabel(status: string | null) {
  switch (status) {
    case "brouillon":
      return "Brouillon";
    case "envoyé":
      return "Envoyé";
    case "expiré":
      return "Expiré";
    case "signé":
      return "Signé";
    case "accepted":
      return "Accepté";
    case "annulé":
      return "Annulé";
    case "refusé":
      return "Refusé";
    default:
      return status || "Inconnu";
  }
}
