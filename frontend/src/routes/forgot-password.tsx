import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MailCheck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthControllerForgotPassword } from "@/lib/api/generated/hooks";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

const schema = z.object({ email: z.string().email(m.validation_email_invalid()) });
type Values = z.infer<typeof schema>;

function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const forgot = useAuthControllerForgotPassword();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  function onSubmit(values: Values) {
    // Always shows the same confirmation regardless of whether the email exists.
    forgot.mutate({ data: values }, { onSettled: () => setSent(true) });
  }

  return (
    <AuthShell
      title={m.forgot_title()}
      subtitle={m.forgot_subtitle()}
      footer={
        <Link to="/signin" className="font-medium text-honey hover:underline">
          {m.back_to_signin()}
        </Link>
      }
    >
      {sent ? (
        <div className="space-y-3 text-center">
          <MailCheck className="mx-auto size-8 text-sage" />
          <p className="text-sm text-muted-foreground">{m.forgot_sent_info()}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="email">{m.email_label()}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder={m.email_placeholder()}
              {...register("email")}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={forgot.isPending}>
            {forgot.isPending ? m.forgot_button_pending() : m.forgot_button()}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
