import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthControllerRegister } from "@/lib/api/generated/hooks";
import { useSaveSession } from "@/lib/auth/use-auth";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

const schema = z.object({
  firstName: z.string().min(1, m.validation_first_name_required()),
  lastName: z.string().min(1, m.validation_last_name_required()),
  email: z.string().email(m.validation_email_invalid()),
  password: z.string().min(8, m.validation_password_min()),
});
type Values = z.infer<typeof schema>;

function RegisterPage() {
  const navigate = useNavigate();
  const saveSession = useSaveSession();
  const registerMutation = useAuthControllerRegister();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: "", lastName: "", email: "", password: "" },
  });

  function onSubmit(values: Values) {
    registerMutation.mutate(
      { data: values },
      {
        onSuccess: (res) => {
          saveSession(res);
          navigate({ to: "/dashboard" });
        },
        onError: (err) => {
          const conflict = (err as { response?: { status?: number } })?.response?.status === 409;
          toast.error(conflict ? m.register_error_conflict() : m.register_error_generic());
        },
      },
    );
  }

  return (
    <AuthShell
      title={m.register_title()}
      subtitle={m.register_subtitle()}
      footer={
        <>
          {m.register_footer_prompt()}{" "}
          <Link to="/signin" className="font-medium text-honey hover:underline">
            {m.register_footer_link()}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="firstName">{m.first_name_label()}</Label>
            <Input
              id="firstName"
              autoComplete="given-name"
              aria-invalid={!!errors.firstName}
              {...register("firstName")}
            />
            {errors.firstName && (
              <p role="alert" className="text-sm text-destructive">
                {errors.firstName.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">{m.last_name_label()}</Label>
            <Input
              id="lastName"
              autoComplete="family-name"
              aria-invalid={!!errors.lastName}
              {...register("lastName")}
            />
            {errors.lastName && (
              <p role="alert" className="text-sm text-destructive">
                {errors.lastName.message}
              </p>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">{m.email_label()}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder={m.email_placeholder()}
            aria-invalid={!!errors.email}
            {...register("email")}
          />
          {errors.email && (
            <p role="alert" className="text-sm text-destructive">
              {errors.email.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{m.password_label()}</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            {...register("password")}
          />
          {errors.password && (
            <p role="alert" className="text-sm text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
          {registerMutation.isPending ? m.register_button_pending() : m.register_button()}
        </Button>
      </form>
    </AuthShell>
  );
}
