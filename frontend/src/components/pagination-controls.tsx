import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

/** Prev/next pager for client-side pagination; hides itself for a single page. */
export function PaginationControls({
  page,
  pageCount,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}) {
  if (pageCount <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-2 pt-3">
      <span className="text-sm text-muted-foreground tabular-nums">
        {m.pagination_label({ page, pageCount })}
      </span>
      <Button
        variant="outline"
        size="icon"
        aria-label={m.pagination_prev()}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft className="size-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        aria-label={m.pagination_next()}
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
