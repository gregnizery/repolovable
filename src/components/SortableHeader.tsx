import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc" | null;

interface SortableHeaderProps {
  label: string;
  sortKey: string;
  currentSort: string | null;
  currentDirection: SortDirection;
  onSort: (key: string) => void;
  align?: "left" | "right";
}

export function SortableHeader({
  label,
  sortKey,
  currentSort,
  currentDirection,
  onSort,
  align = "left",
}: SortableHeaderProps) {
  const isActive = currentSort === sortKey;

  return (
    <th
      className={cn(
        "p-3 font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none",
        align === "right" ? "text-right" : "text-left"
      )}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive ? (
          currentDirection === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </span>
    </th>
  );
}
