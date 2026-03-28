export function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

export function formatCompactCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value ?? 0);
}

export function formatDateLabel(value: string | null | undefined) {
  if (!value) return "Non planifié";
  return new Date(value)
    .toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
    .replace(" à", " ·");
}

export function formatDayLabel(value: string | null | undefined) {
  if (!value) return "Non planifié";
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}

export function formatCount(value: number | null | undefined) {
  return new Intl.NumberFormat("fr-FR").format(value ?? 0);
}
