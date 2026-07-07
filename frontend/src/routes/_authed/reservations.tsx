import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, MessageSquareWarning } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PaginationControls } from "@/components/pagination-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReportIssueDialog } from "@/features/issues/report-issue-dialog";
import {
  reservationsControllerMineQueryKey,
  useReservationsControllerCancel,
  useReservationsControllerMine,
} from "@/lib/api/generated/hooks";
import type { MyReservationDto } from "@/lib/api/generated/types";
import { dateLabelInTz, hhmmInTz } from "@/lib/time";
import { usePagination } from "@/lib/use-pagination";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/_authed/reservations")({
  component: MyReservationsPage,
});

const PAGE_SIZE = 8;

function formatRange(startIso: string, endIso: string, tz: string): string {
  return `${dateLabelInTz(startIso, tz)} · ${hhmmInTz(startIso, tz)}–${hhmmInTz(endIso, tz)} (${tz})`;
}

function MyReservationsPage() {
  const { data: reservations, isLoading } = useReservationsControllerMine();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"ALL" | "ACTIVE" | "CANCELLED">("ALL");

  // Cancel flips the card to "cancelled" immediately and rolls back on error.
  const cancel = useReservationsControllerCancel({
    mutation: {
      onMutate: async ({ id }) => {
        await queryClient.cancelQueries({ queryKey: reservationsControllerMineQueryKey() });
        const previous = queryClient.getQueryData<MyReservationDto[]>(
          reservationsControllerMineQueryKey(),
        );
        queryClient.setQueryData<MyReservationDto[]>(reservationsControllerMineQueryKey(), (old) =>
          old?.map((r) => (r.id === id ? { ...r, status: "CANCELLED" } : r)),
        );
        return { previous };
      },
      onSuccess: () => toast.success(m.reservation_cancelled_toast()),
      onError: (_err, _vars, ctx) => {
        if (ctx?.previous) {
          queryClient.setQueryData(reservationsControllerMineQueryKey(), ctx.previous);
        }
        toast.error(m.reservation_cancel_error());
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: reservationsControllerMineQueryKey() });
      },
    },
  });

  const filtered = useMemo(
    () => (reservations ?? []).filter((r) => status === "ALL" || r.status === status),
    [reservations, status],
  );
  const { page, setPage, pageCount, pageItems } = usePagination(filtered, PAGE_SIZE);

  return (
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight">{m.reservations_title()}</h1>
      <p className="mt-1 text-muted-foreground">{m.reservations_subtitle()}</p>

      <Tabs value={status} onValueChange={(v) => setStatus(v as typeof status)} className="mt-6">
        <TabsList>
          <TabsTrigger value="ALL">{m.filter_all()}</TabsTrigger>
          <TabsTrigger value="ACTIVE">{m.filter_active()}</TabsTrigger>
          <TabsTrigger value="CANCELLED">{m.filter_cancelled()}</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-4 space-y-2">
        {isLoading ? (
          [0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)
        ) : pageItems.length > 0 ? (
          pageItems.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Link
                      to="/units/$unitId/rooms/$roomId"
                      params={{ unitId: r.unitId, roomId: r.roomId }}
                      className="font-medium hover:text-honey"
                    >
                      {r.roomName}
                    </Link>
                    <span className="text-sm text-muted-foreground">· {r.unitName}</span>
                    {r.status === "CANCELLED" && (
                      <Badge variant="outline">{m.status_cancelled_badge()}</Badge>
                    )}
                  </div>
                  <p className="font-mono text-sm text-muted-foreground tabular-nums">
                    {formatRange(r.startAt, r.endAt, r.unitTimezone)}
                  </p>
                  {r.note && <p className="text-sm text-muted-foreground">{r.note}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <ReportIssueDialog
                    unitId={r.unitId}
                    reservation={{
                      id: r.id,
                      roomName: r.roomName,
                      label: formatRange(r.startAt, r.endAt, r.unitTimezone),
                    }}
                    trigger={
                      <Button variant="ghost" size="sm" aria-label={m.report_issue_button()}>
                        <MessageSquareWarning className="size-4" /> {m.report_issue_button()}
                      </Button>
                    }
                  />
                  {r.status === "ACTIVE" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => cancel.mutate({ id: r.id })}
                    >
                      {m.cancel_button()}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
              <CalendarClock className="size-6 text-honey" />
              <p className="text-sm text-muted-foreground">
                {status === "ALL"
                  ? m.reservations_empty_all()
                  : status === "ACTIVE"
                    ? m.reservations_empty_active()
                    : m.reservations_empty_cancelled()}
              </p>
            </CardContent>
          </Card>
        )}
        <PaginationControls page={page} pageCount={pageCount} onPageChange={setPage} />
      </div>
    </div>
  );
}
