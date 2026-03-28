import { Layers } from "lucide-react";
import { cn } from "@/lib/utils";

interface GroupByOption {
  key: string;
  label: string;
}

interface GroupBySelectProps {
  options: GroupByOption[];
  value: string;
  onChange: (value: string) => void;
}

export function GroupBySelect({ options, value, onChange }: GroupBySelectProps) {
  return (
    <div className="flex items-center gap-1.5">
      <Layers className="h-3.5 w-3.5 text-muted-foreground" />
      <div className="flex gap-1">
        {options.map((opt) => (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            className={cn(
              "text-xs font-medium px-2.5 py-1 rounded-full transition-colors",
              value === opt.key
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
