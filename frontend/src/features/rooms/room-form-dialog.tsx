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
import {
  roomsControllerFindAllQueryKey,
  useRoomsControllerCreate,
  useRoomsControllerUpdate,
} from "@/lib/api/generated/hooks";
import type { RoomDto } from "@/lib/api/generated/types";

// Fields are strings in the form; numbers/blanks are normalized on submit.
// The backend enforces the real F-11 rules and returns a message on failure.
const schema = z.object({
  name: z.string().min(1, "Name is required").max(100),
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
      toast.success(editing ? "Room updated" : "Room added");
      setOpen(false);
    };
    const onError = (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Something went wrong");
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
          <DialogTitle>{editing ? "Edit room" : "Add a room"}</DialogTitle>
          <DialogDescription>
            Optional rules limit how this room can be booked. Leave blank for no limit.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="Bathroom" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea id="description" rows={2} {...register("description")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="maxReservationHours">Max hours / booking</Label>
              <Input
                id="maxReservationHours"
                type="number"
                min={1}
                {...register("maxReservationHours")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxReservationsPerDay">Max bookings / day</Label>
              <Input
                id="maxReservationsPerDay"
                type="number"
                min={1}
                {...register("maxReservationsPerDay")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minGapMinutes">Min gap (minutes)</Label>
              <Input id="minGapMinutes" type="number" min={0} {...register("minGapMinutes")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="availableFrom">Available from</Label>
              <Input id="availableFrom" type="time" {...register("availableFrom")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="availableTo">Available until</Label>
              <Input id="availableTo" type="time" {...register("availableTo")} />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : editing ? "Save changes" : "Add room"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
