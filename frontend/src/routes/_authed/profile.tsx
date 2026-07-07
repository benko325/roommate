import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  authControllerMeQueryKey,
  useAuthControllerChangePassword,
  useAuthControllerUpdateProfile,
} from "@/lib/api/generated/hooks";
import { useAuth } from "@/lib/auth/use-auth";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/_authed/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user, isLoading } = useAuth();

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-display text-3xl font-bold tracking-tight">{m.profile_title()}</h1>
      <p className="mt-1 text-muted-foreground">{m.profile_subtitle()}</p>

      {isLoading || !user ? (
        <Skeleton className="mt-6 h-64 rounded-xl" />
      ) : (
        <div className="mt-6 space-y-6">
          <DetailsCard
            defaults={{
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
            }}
          />
          <PasswordCard />
        </div>
      )}
    </div>
  );
}

const detailsSchema = z.object({
  firstName: z.string().min(1, m.validation_required()).max(80),
  lastName: z.string().min(1, m.validation_required()).max(80),
  email: z.string().email(m.validation_email_invalid()).max(254),
});
type DetailsValues = z.infer<typeof detailsSchema>;

function DetailsCard({ defaults }: { defaults: DetailsValues }) {
  const queryClient = useQueryClient();
  const update = useAuthControllerUpdateProfile();
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<DetailsValues>({ resolver: zodResolver(detailsSchema), values: defaults });

  function onSubmit(values: DetailsValues) {
    update.mutate(
      { data: values },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: authControllerMeQueryKey() });
          toast.success(m.profile_updated_toast());
        },
        onError: (err) => {
          const conflict = (err as { response?: { status?: number } })?.response?.status === 409;
          toast.error(conflict ? m.profile_email_conflict() : m.profile_update_error());
        },
      },
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display">{m.profile_details_title()}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="firstName">{m.first_name_label()}</Label>
              <Input id="firstName" {...register("firstName")} />
              {errors.firstName && (
                <p className="text-sm text-destructive">{errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">{m.last_name_label()}</Label>
              <Input id="lastName" {...register("lastName")} />
              {errors.lastName && (
                <p className="text-sm text-destructive">{errors.lastName.message}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{m.email_label()}</Label>
            <Input id="email" type="email" {...register("email")} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <Button type="submit" disabled={update.isPending || !isDirty}>
            {update.isPending ? m.save_button_pending() : m.save_button()}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, m.validation_required()),
    newPassword: z.string().min(8, m.validation_password_min()),
    confirmPassword: z.string().min(1, m.validation_required()),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: m.validation_passwords_mismatch(),
    path: ["confirmPassword"],
  });
type PasswordValues = z.infer<typeof passwordSchema>;

function PasswordCard() {
  const change = useAuthControllerChangePassword();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  function onSubmit(values: PasswordValues) {
    change.mutate(
      { data: { currentPassword: values.currentPassword, newPassword: values.newPassword } },
      {
        onSuccess: () => {
          toast.success(m.password_changed_toast());
          reset();
        },
        onError: (err) => {
          const unauth = (err as { response?: { status?: number } })?.response?.status === 401;
          toast.error(unauth ? m.password_current_incorrect() : m.password_change_error());
        },
      },
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display">{m.password_label()}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="currentPassword">{m.current_password_label()}</Label>
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              {...register("currentPassword")}
            />
            {errors.currentPassword && (
              <p className="text-sm text-destructive">{errors.currentPassword.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">{m.new_password_label()}</Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              {...register("newPassword")}
            />
            {errors.newPassword && (
              <p className="text-sm text-destructive">{errors.newPassword.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{m.confirm_password_label()}</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>
          <Button type="submit" disabled={change.isPending}>
            {change.isPending ? m.reset_button_pending() : m.change_password_button()}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
