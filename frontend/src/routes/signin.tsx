import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthControllerLogin } from "@/lib/api/generated/hooks";
import { useSaveSession } from "@/lib/auth/use-auth";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/signin")({
  component: SignInPage,
});

const schema = z.object({
  email: z.string().email(m.validation_email_invalid()),
  password: z.string().min(1, m.validation_password_required()),
});
type Values = z.infer<typeof schema>;

function SignInPage() {
  const navigate = useNavigate();
  const saveSession = useSaveSession();
  const login = useAuthControllerLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit(values: Values) {
    login.mutate(
      { data: values },
      {
        onSuccess: (res) => {
          saveSession(res);
          navigate({ to: "/dashboard" });
        },
        onError: () => toast.error(m.signin_error_invalid()),
      },
    );
  }

  return (
    <AuthShell
      title={m.signin_title()}
      subtitle={m.signin_subtitle()}
      footer={
        <>
          {m.signin_footer_prompt()}{" "}
          <Link to="/register" className="font-medium text-honey hover:underline">
            {m.signin_footer_link()}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{m.password_label()}</Label>
            <Link
              to="/forgot-password"
              className="text-xs text-muted-foreground hover:text-honey hover:underline"
            >
              {m.signin_forgot_link()}
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            {...register("password")}
          />
          {errors.password && (
            <p role="alert" className="text-sm text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={login.isPending}>
          {login.isPending ? m.signin_button_pending() : m.signin_button()}
        </Button>
      </form>
    </AuthShell>
  );
}
