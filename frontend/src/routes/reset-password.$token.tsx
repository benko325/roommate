import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthControllerResetPassword } from "@/lib/api/generated/hooks";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/reset-password/$token")({
  component: ResetPasswordPage,
});

const schema = z
  .object({
    newPassword: z.string().min(8, m.validation_password_min()),
    confirmPassword: z.string().min(1, m.validation_required()),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: m.validation_passwords_mismatch(),
    path: ["confirmPassword"],
  });
type Values = z.infer<typeof schema>;

function ResetPasswordPage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const reset = useAuthControllerResetPassword();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  function onSubmit(values: Values) {
    reset.mutate(
      { data: { token, newPassword: values.newPassword } },
      {
        onSuccess: () => {
          toast.success(m.reset_success_toast());
          navigate({ to: "/signin" });
        },
        onError: () => toast.error(m.reset_error_toast()),
      },
    );
  }

  return (
    <AuthShell
      title={m.reset_title()}
      subtitle={m.reset_subtitle()}
      footer={
        <Link to="/signin" className="font-medium text-honey hover:underline">
          {m.back_to_signin()}
        </Link>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
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
        <Button type="submit" className="w-full" disabled={reset.isPending}>
          {reset.isPending ? m.reset_button_pending() : m.reset_button()}
        </Button>
      </form>
    </AuthShell>
  );
}
