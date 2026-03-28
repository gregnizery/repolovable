import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";

interface ListViewToggleProps {
  view: "grid" | "table";
  onViewChange: (view: "grid" | "table") => void;
}

export function ListViewToggle({ view, onViewChange }: ListViewToggleProps) {
  return (
    <div className="flex items-center border border-border/50 rounded-full overflow-hidden h-8">
      <button
        onClick={() => onViewChange("grid")}
        className={cn(
          "flex items-center gap-1.5 px-3 h-full text-xs font-medium transition-colors",
          view === "grid"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted"
        )}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Cartes</span>
      </button>
      <button
        onClick={() => onViewChange("table")}
        className={cn(
          "flex items-center gap-1.5 px-3 h-full text-xs font-medium transition-colors",
          view === "table"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted"
        )}
      >
        <List className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Tableau</span>
      </button>
    </div>
  );
}
