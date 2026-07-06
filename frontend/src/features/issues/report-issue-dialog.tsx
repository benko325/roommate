import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  unitIssuesControllerListQueryKey,
  useRoomsControllerFindAll,
  useUnitIssuesControllerCreate,
} from "@/lib/api/generated/hooks";

const schema = z.object({
  message: z.string().trim().min(1, "Describe the issue").max(1000),
});
type Values = z.infer<typeof schema>;

const GENERAL = "general";

/**
 * Report an issue to the unit owner. When `reservation` is given (from the
 * My Reservations page) the issue is pre-linked to it and the room picker
 * is replaced by a static context line.
 */
export function ReportIssueDialog({
  unitId,
  trigger,
  reservation,
}: {
  unitId: string;
  trigger: ReactNode;
  reservation?: { id: string; roomName: string; label: string };
}) {
  const [open, setOpen] = useState(false);
  const [roomId, setRoomId] = useState<string>(GENERAL);
  const queryClient = useQueryClient();
  // Skip fetching rooms when the room is implied by the reservation.
  const { data: rooms } = useRoomsControllerFindAll(unitId, {
    query: { enabled: open && !reservation },
  });
  const create = useUnitIssuesControllerCreate();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { message: "" } });

  function onSubmit(values: Values) {
    const data = reservation
      ? { message: values.message, reservationId: reservation.id }
      : { message: values.message, ...(roomId !== GENERAL && { roomId }) };
    create.mutate(
      { unitId, data },
      {
        onSuccess: async () => {
          await queryClient.invalidateQueries({
            queryKey: unitIssuesControllerListQueryKey(unitId),
          });
          toast.success("Issue reported to the owner");
          reset();
          setRoomId(GENERAL);
          setOpen(false);
        },
        onError: (err: unknown) => {
          const msg = (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message;
          toast.error(msg ?? "Something went wrong");
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report an issue</DialogTitle>
          <DialogDescription>
            {reservation
              ? `About your reservation of ${reservation.roomName}, ${reservation.label}.`
              : "The owner of this household will see your report."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {!reservation && (
            <div className="space-y-2">
              <Label>Where</Label>
              <Select value={roomId} onValueChange={setRoomId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={GENERAL}>General (whole household)</SelectItem>
                  {rooms?.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="issue-message">What's wrong?</Label>
            <Textarea
              id="issue-message"
              rows={4}
              placeholder="The shower drain is clogged…"
              {...register("message")}
            />
            {errors.message && <p className="text-sm text-destructive">{errors.message.message}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Sending…" : "Report issue"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
