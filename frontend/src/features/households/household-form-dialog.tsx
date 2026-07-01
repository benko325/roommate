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
  housingUnitsControllerFindAllQueryKey,
  housingUnitsControllerFindOneQueryKey,
  useHousingUnitsControllerCreate,
  useHousingUnitsControllerUpdate,
} from "@/lib/api/generated/hooks";
import type { HousingUnitDto } from "@/lib/api/generated/types";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  address: z.string().min(1, "Address is required").max(200),
  description: z.string().max(2000).optional(),
});
type Values = z.infer<typeof schema>;

export function HouseholdFormDialog({
  trigger,
  unit,
}: {
  trigger: ReactNode;
  unit?: HousingUnitDto;
}) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const create = useHousingUnitsControllerCreate();
  const update = useHousingUnitsControllerUpdate();
  const editing = !!unit;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    values: {
      name: unit?.name ?? "",
      address: unit?.address ?? "",
      description: unit?.description ?? "",
    },
  });

  function onSubmit(values: Values) {
    const onSuccess = async () => {
      await queryClient.invalidateQueries({ queryKey: housingUnitsControllerFindAllQueryKey() });
      if (unit) {
        await queryClient.invalidateQueries({
          queryKey: housingUnitsControllerFindOneQueryKey(unit.id),
        });
      }
      toast.success(editing ? "Household updated" : "Household created");
      setOpen(false);
      reset();
    };
    const onError = () => toast.error("Something went wrong");

    if (unit) {
      update.mutate({ id: unit.id, data: values }, { onSuccess, onError });
    } else {
      create.mutate({ data: values }, { onSuccess, onError });
    }
  }

  const pending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit household" : "New household"}</DialogTitle>
          <DialogDescription>
            A household groups the rooms and housemates you share.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="Sunny Flat" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" placeholder="12 Main St" {...register("address")} />
            {errors.address && <p className="text-sm text-destructive">{errors.address.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea id="description" rows={3} {...register("description")} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : editing ? "Save changes" : "Create household"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
