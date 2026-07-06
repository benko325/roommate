import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder rows shown while a table's data is loading. */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 py-2">
      {Array.from({ length: rows }, (_, i) => i).map((row) => (
        <Skeleton key={row} className="h-12 rounded-lg" />
      ))}
    </div>
  );
}
