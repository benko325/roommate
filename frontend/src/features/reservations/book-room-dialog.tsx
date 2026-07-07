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
import { apiErrorMessage } from "@/lib/api/error-message";
import {
  reservationsControllerMineQueryKey,
  useRoomReservationsControllerCreate,
} from "@/lib/api/generated/hooks";
import { wallToUtcIso } from "@/lib/time";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

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
          toast.success(m.book_reserved_toast());
          setOpen(false);
          setNote("");
        },
        onError: (err) => {
          toast.error(apiErrorMessage(err) ?? m.book_create_error());
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.book_dialog_title()}</DialogTitle>
          <DialogDescription>
            {new Date(`${date}T00:00:00`).toLocaleDateString(getLocale(), {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
            {defaultFrom && defaultTo
              ? ` · ${m.book_dialog_open_range({ from: defaultFrom, to: defaultTo })}`
              : ""}{" "}
            · {m.book_dialog_times_in({ timezone })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="start">{m.start_label()}</Label>
              <Input
                id="start"
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">{m.end_label()}</Label>
              <Input id="end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">{m.note_label()}</Label>
            <Textarea
              id="note"
              rows={2}
              placeholder={m.note_placeholder()}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending ? m.reserve_button_pending() : m.reserve_button()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
