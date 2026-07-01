import { createFileRoute, Link } from "@tanstack/react-router";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

function RegisterPage() {
  // Registration isn't wired yet — the real flow lands with the backend auth milestone.
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    toast.info("Registration isn't connected yet — coming in the next milestone.");
  }

  return (
    <AuthShell
      title="Create your household"
      subtitle="Set up an account and invite your housemates."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/signin" className="font-medium text-honey hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="firstName">First name</Label>
            <Input id="firstName" autoComplete="given-name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" autoComplete="family-name" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="new-password" />
        </div>
        <Button type="submit" className="w-full">
          Create account
        </Button>
      </form>
    </AuthShell>
  );
}
