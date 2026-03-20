export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: { key: keyof T; label: string; format?: (value: unknown) => string }[],
  filename: string
) {
  const BOM = "\uFEFF";
  const separator = ";";

  const header = columns.map((c) => `"${c.label}"`).join(separator);
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const raw = row[col.key];
        const value = col.format ? col.format(raw) : (raw ?? "");
        return `"${String(value).replace(/"/g, '""')}"`;
      })
      .join(separator)
  );

  const csv = BOM + [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
