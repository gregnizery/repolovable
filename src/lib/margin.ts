export interface MarginCostInputs {
  laborCost: number;
  logisticsCost: number;
  equipmentDepreciationCost: number;
}

export interface MarginComputation extends MarginCostInputs {
  revenueHT: number;
  totalCost: number;
  marginAmount: number;
  marginRate: number;
}

export interface MarginAlert {
  level: "healthy" | "low" | "negative";
  title: string;
  suggestions: string[];
}

export const DEFAULT_MARGIN_COSTS: MarginCostInputs = {
  laborCost: 0,
  logisticsCost: 0,
  equipmentDepreciationCost: 0,
};

export function computeMargin(revenueHT: number, costs: MarginCostInputs): MarginComputation {
  const safeRevenue = Number.isFinite(revenueHT) ? Math.max(0, revenueHT) : 0;
  const laborCost = Number.isFinite(costs.laborCost) ? Math.max(0, costs.laborCost) : 0;
  const logisticsCost = Number.isFinite(costs.logisticsCost) ? Math.max(0, costs.logisticsCost) : 0;
  const equipmentDepreciationCost = Number.isFinite(costs.equipmentDepreciationCost)
    ? Math.max(0, costs.equipmentDepreciationCost)
    : 0;

  const totalCost = laborCost + logisticsCost + equipmentDepreciationCost;
  const marginAmount = safeRevenue - totalCost;
  const marginRate = safeRevenue > 0 ? (marginAmount / safeRevenue) * 100 : 0;

  return {
    revenueHT: safeRevenue,
    laborCost,
    logisticsCost,
    equipmentDepreciationCost,
    totalCost,
    marginAmount,
    marginRate,
  };
}

export function buildMarginAlert(result: MarginComputation): MarginAlert {
  if (result.marginAmount < 0) {
    return {
      level: "negative",
      title: "Marge négative détectée",
      suggestions: [
        "Augmenter le montant HT du devis ou ajuster les quantités facturées.",
        "Réduire les coûts de main d'œuvre planifiés (optimiser planning/équipe).",
        "Réévaluer la logistique (transport, manutention, sous-traitance).",
      ],
    };
  }

  if (result.marginRate < 15) {
    return {
      level: "low",
      title: "Marge faible",
      suggestions: [
        "Ajouter une ligne de prestation à forte valeur ajoutée.",
        "Négocier une baisse des coûts logistiques ou mutualiser les déplacements.",
        "Ajuster la durée/location matériel pour limiter l'amortissement.",
      ],
    };
  }

  return {
    level: "healthy",
    title: "Marge saine",
    suggestions: [],
  };
}
