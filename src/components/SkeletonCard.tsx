import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SkeletonCardProps {
  variant?: "client" | "mission" | "equipment" | "finance";
  className?: string;
}

export function SkeletonCard({ variant = "client", className }: SkeletonCardProps) {
  return (
    <Card className={cn("shadow-card border-border/50", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <Skeleton className="w-16 h-5 rounded-full" />
        </div>
        <Skeleton className="h-5 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2 mb-4" />
        {variant === "mission" && (
          <div className="space-y-2 mt-3">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-2/3" />
          </div>
        )}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-5 w-16" />
        </div>
      </CardContent>
    </Card>
  );
}

export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <Card className="shadow-card border-border/50 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i} className="p-4"><Skeleton className="h-4 w-20" /></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r} className="border-b border-border/50">
                {Array.from({ length: cols }).map((_, c) => (
                  <td key={c} className="p-4"><Skeleton className={cn("h-4", c === 0 ? "w-24" : "w-16")} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
