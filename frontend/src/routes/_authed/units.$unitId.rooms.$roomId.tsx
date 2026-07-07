import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CalendarClock, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { OccupancyLatch } from "@/components/occupancy-latch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BookRoomDialog } from "@/features/reservations/book-room-dialog";
import {
  reservationsControllerMineQueryKey,
  useHousingUnitsControllerFindOne,
  useReservationsControllerCancel,
  useRoomReservationsControllerList,
  useRoomsControllerFindOne,
} from "@/lib/api/generated/hooks";
import { dayBoundsUtc, hhmmInTz, todayInTz } from "@/lib/time";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/_authed/units/$unitId/rooms/$roomId")({
  component: RoomCalendarPage,
});

function RoomCalendarPage() {
  const { unitId, roomId } = Route.useParams();
  const queryClient = useQueryClient();

  const { data: unit } = useHousingUnitsControllerFindOne(unitId);
  const tz = unit?.timezone ?? "UTC";
  const { data: room } = useRoomsControllerFindOne(unitId, roomId);

  const [date, setDate] = useState(() => todayInTz(tz));
  const { from, to } = dayBoundsUtc(date, tz);
  const { data: reservations, isLoading } = useRoomReservationsControllerList(roomId, { from, to });
  const cancel = useReservationsControllerCancel();

  return (
    <div>
      <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
        <Link to="/units/$unitId" params={{ unitId }}>
          <ArrowLeft className="size-4" /> {m.room_back_link()}
        </Link>
      </Button>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            {room?.name ?? m.room_fallback_name()}
          </h1>
          {room?.availableFrom && room?.availableTo && (
            <p className="mt-1 font-mono text-sm text-muted-foreground">
              {m.room_open_hours({ from: room.availableFrom, to: room.availableTo, tz })}
            </p>
          )}
        </div>
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <label htmlFor="date" className="text-xs text-muted-foreground">
              {m.room_date_label({ tz })}
            </label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-auto"
            />
          </div>
          <BookRoomDialog
            roomId={roomId}
            date={date}
            timezone={tz}
            defaultFrom={room?.availableFrom}
            defaultTo={room?.availableTo}
            trigger={
              <Button>
                <Plus className="size-4" /> {m.reserve_button()}
              </Button>
            }
          />
        </div>
      </div>

      <div className="mt-6 space-y-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{m.loading()}</p>
        ) : reservations && reservations.length > 0 ? (
          reservations.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <span className="font-mono text-sm tabular-nums">
                    {hhmmInTz(r.startAt, tz)}–{hhmmInTz(r.endAt, tz)}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      {r.author ? (
                        <span className="font-medium">
                          {r.author.firstName} {r.author.lastName}
                        </span>
                      ) : (
                        <span className="font-medium text-muted-foreground">
                          {m.reserved_fallback()}
                        </span>
                      )}
                      {r.isMine && <Badge variant="secondary">{m.you_badge()}</Badge>}
                    </div>
                    {r.note && <p className="text-sm text-muted-foreground">{r.note}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <OccupancyLatch status="occupied" />
                  {r.isMine && (
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
                                queryKey: [
                                  { url: "/rooms/:roomId/reservations", params: { roomId } },
                                ],
                              });
                              queryClient.invalidateQueries({
                                queryKey: reservationsControllerMineQueryKey(),
                              });
                              toast.success(m.reservation_cancelled_toast());
                            },
                          },
                        )
                      }
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
              <p className="text-sm text-muted-foreground">{m.room_empty_day()}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
