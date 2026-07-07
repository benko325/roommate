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
import { browserTimezone, supportedTimezones } from "@/lib/time";
import { m } from "@/paraglide/messages";

const schema = z.object({
  name: z.string().min(1, m.validation_name_required()).max(100),
  address: z.string().min(1, m.validation_address_required()).max(200),
  description: z.string().max(2000).optional(),
  timezone: z.string().min(1, m.validation_timezone_required()),
});
type Values = z.infer<typeof schema>;

const TIMEZONES = supportedTimezones();

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
      timezone: unit?.timezone ?? browserTimezone(),
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
      toast.success(editing ? m.household_updated_toast() : m.household_created_toast());
      setOpen(false);
      reset();
    };
    const onError = () => toast.error(m.error_generic());

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
          <DialogTitle>
            {editing ? m.household_dialog_edit_title() : m.household_dialog_new_title()}
          </DialogTitle>
          <DialogDescription>{m.household_dialog_description()}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="name">{m.name_label()}</Label>
            <Input id="name" placeholder={m.household_name_placeholder()} {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">{m.address_label()}</Label>
            <Input id="address" placeholder={m.address_placeholder()} {...register("address")} />
            {errors.address && <p className="text-sm text-destructive">{errors.address.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{m.description_label()}</Label>
            <Textarea id="description" rows={3} {...register("description")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timezone">{m.timezone_label()}</Label>
            <select
              id="timezone"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              {...register("timezone")}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">{m.timezone_hint()}</p>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending
                ? m.save_button_pending()
                : editing
                  ? m.save_button()
                  : m.household_create_button()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
