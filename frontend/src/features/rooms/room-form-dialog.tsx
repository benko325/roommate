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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiErrorMessage } from "@/lib/api/error-message";
import {
  roomsControllerFindAllQueryKey,
  useRoomsControllerCreate,
  useRoomsControllerUpdate,
} from "@/lib/api/generated/hooks";
import type { RoomDto } from "@/lib/api/generated/types";
import { m } from "@/paraglide/messages";

// Fields are strings in the form; numbers/blanks are normalized on submit.
// The backend enforces the real F-11 rules and returns a message on failure.
const schema = z.object({
  name: z.string().min(1, m.validation_name_required()).max(100),
  description: z.string().max(2000).optional(),
  maxReservationHours: z.string().optional(),
  maxReservationsPerDay: z.string().optional(),
  minGapMinutes: z.string().optional(),
  availableFrom: z.string().optional(),
  availableTo: z.string().optional(),
});
type Values = z.infer<typeof schema>;

const num = (v?: string) => (v && v.trim() !== "" ? Number(v) : undefined);
const str = (v?: string) => (v && v.trim() !== "" ? v : undefined);

export function RoomFormDialog({
  unitId,
  room,
  trigger,
}: {
  unitId: string;
  room?: RoomDto;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const create = useRoomsControllerCreate();
  const update = useRoomsControllerUpdate();
  const editing = !!room;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    values: {
      name: room?.name ?? "",
      description: room?.description ?? "",
      maxReservationHours: room?.maxReservationHours?.toString() ?? "",
      maxReservationsPerDay: room?.maxReservationsPerDay?.toString() ?? "",
      minGapMinutes: room?.minGapMinutes?.toString() ?? "",
      availableFrom: room?.availableFrom ?? "",
      availableTo: room?.availableTo ?? "",
    },
  });

  function onSubmit(values: Values) {
    const data = {
      name: values.name,
      description: str(values.description),
      maxReservationHours: num(values.maxReservationHours),
      maxReservationsPerDay: num(values.maxReservationsPerDay),
      minGapMinutes: num(values.minGapMinutes),
      availableFrom: str(values.availableFrom),
      availableTo: str(values.availableTo),
    };
    const onSuccess = async () => {
      await queryClient.invalidateQueries({ queryKey: roomsControllerFindAllQueryKey(unitId) });
      toast.success(editing ? m.room_updated_toast() : m.room_added_toast());
      setOpen(false);
    };
    const onError = (err: unknown) => {
      toast.error(apiErrorMessage(err) ?? m.error_generic());
    };
    if (room) {
      update.mutate({ unitId, roomId: room.id, data }, { onSuccess, onError });
    } else {
      create.mutate({ unitId, data }, { onSuccess, onError });
    }
  }

  const pending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing ? m.room_dialog_edit_title() : m.room_dialog_new_title()}
          </DialogTitle>
          <DialogDescription>{m.room_dialog_description()}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="name">{m.name_label()}</Label>
            <Input id="name" placeholder={m.room_name_placeholder()} {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{m.description_label()}</Label>
            <Textarea id="description" rows={2} {...register("description")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="maxReservationHours">{m.room_max_hours_label()}</Label>
              <Input
                id="maxReservationHours"
                type="number"
                min={1}
                {...register("maxReservationHours")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxReservationsPerDay">{m.room_max_per_day_label()}</Label>
              <Input
                id="maxReservationsPerDay"
                type="number"
                min={1}
                {...register("maxReservationsPerDay")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minGapMinutes">{m.room_min_gap_label()}</Label>
              <Input id="minGapMinutes" type="number" min={0} {...register("minGapMinutes")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="availableFrom">{m.room_available_from_label()}</Label>
              <Input id="availableFrom" type="time" {...register("availableFrom")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="availableTo">{m.room_available_to_label()}</Label>
              <Input id="availableTo" type="time" {...register("availableTo")} />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? m.save_button_pending() : editing ? m.save_button() : m.add_room_button()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
