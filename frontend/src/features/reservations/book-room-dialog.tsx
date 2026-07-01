import { useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  reservationsControllerMineQueryKey,
  useRoomReservationsControllerCreate,
} from "@/lib/api/generated/hooks";
import { wallToUtcIso } from "@/lib/time";

/** Times are entered in the household's timezone and converted to UTC instants. */
export function BookRoomDialog({
  roomId,
  date,
  timezone,
  defaultFrom,
  defaultTo,
  trigger,
}: {
  roomId: string;
  date: string; // yyyy-mm-dd (local day in `timezone`)
  timezone: string;
  defaultFrom?: string | null;
  defaultTo?: string | null;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(defaultFrom ?? "09:00");
  const [end, setEnd] = useState("10:00");
  const [note, setNote] = useState("");
  const queryClient = useQueryClient();
  const create = useRoomReservationsControllerCreate();

  function submit() {
    create.mutate(
      {
        roomId,
        data: {
          startAt: wallToUtcIso(date, start, timezone),
          endAt: wallToUtcIso(date, end, timezone),
          note: note.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: [{ url: "/rooms/:roomId/reservations", params: { roomId } }],
          });
          queryClient.invalidateQueries({ queryKey: reservationsControllerMineQueryKey() });
          toast.success("Reserved");
          setOpen(false);
          setNote("");
        },
        onError: (err) => {
          const msg = (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message;
          toast.error(msg ?? "Could not create reservation");
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New reservation</DialogTitle>
          <DialogDescription>
            {new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
            {defaultFrom && defaultTo ? ` · open ${defaultFrom}–${defaultTo}` : ""} · times in{" "}
            {timezone}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="start">Start</Label>
              <Input
                id="start"
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">End</Label>
              <Input id="end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">Note (optional)</Label>
            <Textarea
              id="note"
              rows={2}
              placeholder="What's it for?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending ? "Reserving…" : "Reserve"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
