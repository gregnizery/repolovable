import type { ComponentProps, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type Tone = "default" | "primary" | "info" | "success" | "warning" | "destructive";

const toneClasses: Record<Tone, string> = {
  default: "border-border/80 bg-card text-foreground",
  primary: "border-primary/20 bg-primary/10 text-primary",
  info: "border-info/25 bg-info/15 text-info-foreground",
  success: "border-success/25 bg-success/15 text-success-foreground",
  warning: "border-warning/30 bg-warning/20 text-warning-foreground",
  destructive: "border-destructive/25 bg-destructive/10 text-destructive",
};

export interface MetricStripItem {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  tone?: Tone;
  icon?: LucideIcon;
}

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function SectionHeader({ eyebrow, title, description, actions }: SectionHeaderProps) {
  return (
    <section className="rounded-2xl border border-border/70 bg-card px-5 py-5 shadow-card md:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          {eyebrow ? (
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{eyebrow}</p>
          ) : null}
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[2rem]">{title}</h1>
            {description ? <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </section>
  );
}

export function MetricStrip({ items, className }: { items: MetricStripItem[]; className?: string }) {
  return (
    <div className={cn("grid gap-3 md:grid-cols-2 xl:grid-cols-4", className)}>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.label} className="overflow-hidden">
            <CardContent className="flex items-start justify-between gap-4 p-4">
              <div className="space-y-1">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
                <p className="text-2xl font-semibold tracking-tight text-foreground">{item.value}</p>
                {item.detail ? <p className="text-xs text-muted-foreground">{item.detail}</p> : null}
              </div>
              {Icon ? (
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg border", toneClasses[item.tone ?? "default"])}>
                  <Icon className="h-4 w-4" />
                </div>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

interface WorkbenchPanelProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function WorkbenchPanel({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
}: WorkbenchPanelProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className={cn("p-0", contentClassName)}>
        <div className="flex flex-col gap-3 border-b border-border/70 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {action}
        </div>
        <div className="p-5">{children}</div>
      </CardContent>
    </Card>
  );
}

interface FilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Rechercher",
  filters,
  actions,
  className,
}: FilterBarProps) {
  return (
    <div className={cn("flex flex-col gap-3 md:flex-row md:items-center md:justify-between", className)}>
      <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-10 rounded-lg border-border/80 bg-background pl-9"
          />
        </div>
        {filters ? <div className="flex flex-wrap items-center gap-2">{filters}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatusPill({
  label,
  tone = "default",
  className,
}: {
  label: string;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.12em]",
        toneClasses[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}

export const DenseTable = Table;
export const DenseTableHeader = TableHeader;
export const DenseTableBody = TableBody;

export function DenseTableRow(props: ComponentProps<typeof TableRow>) {
  return <TableRow {...props} className={cn("cursor-default", props.className)} />;
}

export function DenseTableHead(props: ComponentProps<typeof TableHead>) {
  return <TableHead {...props} className={cn("h-10 px-3 font-mono text-[11px]", props.className)} />;
}

export function DenseTableCell(props: ComponentProps<typeof TableCell>) {
  return <TableCell {...props} className={cn("px-3 py-3", props.className)} />;
}
