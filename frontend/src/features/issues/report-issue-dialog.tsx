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
import { apiErrorMessage } from "@/lib/api/error-message";
import {
  unitIssuesControllerListQueryKey,
  useRoomsControllerFindAll,
  useUnitIssuesControllerCreate,
} from "@/lib/api/generated/hooks";
import { m } from "@/paraglide/messages";

const schema = z.object({
  message: z.string().trim().min(1, m.validation_issue_message()).max(1000),
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
          toast.success(m.issue_reported_toast());
          reset();
          setRoomId(GENERAL);
          setOpen(false);
        },
        onError: (err: unknown) => {
          toast.error(apiErrorMessage(err) ?? m.error_generic());
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.issue_dialog_title()}</DialogTitle>
          <DialogDescription>
            {reservation
              ? m.issue_dialog_about_reservation({
                  roomName: reservation.roomName,
                  label: reservation.label,
                })
              : m.issue_dialog_description()}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {!reservation && (
            <div className="space-y-2">
              <Label>{m.issue_where_label()}</Label>
              <Select value={roomId} onValueChange={setRoomId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={GENERAL}>{m.issue_general_option()}</SelectItem>
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
            <Label htmlFor="issue-message">{m.issue_message_label()}</Label>
            <Textarea
              id="issue-message"
              rows={4}
              placeholder={m.issue_message_placeholder()}
              {...register("message")}
            />
            {errors.message && <p className="text-sm text-destructive">{errors.message.message}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? m.issue_send_pending() : m.report_issue_button()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
