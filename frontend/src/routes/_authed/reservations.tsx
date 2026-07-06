import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, MessageSquareWarning } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportIssueDialog } from "@/features/issues/report-issue-dialog";
import {
  reservationsControllerMineQueryKey,
  useReservationsControllerCancel,
  useReservationsControllerMine,
} from "@/lib/api/generated/hooks";
import { dateLabelInTz, hhmmInTz } from "@/lib/time";

export const Route = createFileRoute("/_authed/reservations")({
  component: MyReservationsPage,
});

function formatRange(startIso: string, endIso: string, tz: string): string {
  return `${dateLabelInTz(startIso, tz)} · ${hhmmInTz(startIso, tz)}–${hhmmInTz(endIso, tz)} (${tz})`;
}

function MyReservationsPage() {
  const { data: reservations, isLoading } = useReservationsControllerMine();
  const cancel = useReservationsControllerCancel();
  const queryClient = useQueryClient();

  return (
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight">My reservations</h1>
      <p className="mt-1 text-muted-foreground">Everything you've booked across your households.</p>

      <div className="mt-6 space-y-2">
        {isLoading ? (
          [0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)
        ) : reservations && reservations.length > 0 ? (
          reservations.map((r) => (
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
                    {r.status === "CANCELLED" && <Badge variant="outline">cancelled</Badge>}
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
                      <Button variant="ghost" size="sm" aria-label="Report issue">
                        <MessageSquareWarning className="size-4" /> Report issue
                      </Button>
                    }
                  />
                  {r.status === "ACTIVE" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() =>
                        cancel.mutate(
                          { id: r.id },
                          {
                            onSuccess: () => {
                              queryClient.invalidateQueries({
                                queryKey: reservationsControllerMineQueryKey(),
                              });
                              toast.success("Reservation cancelled");
                            },
                          },
                        )
                      }
                    >
                      Cancel
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
                No reservations yet. Open a room to book a slot.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
