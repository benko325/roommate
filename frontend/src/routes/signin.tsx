import { createFileRoute, Link } from "@tanstack/react-router";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/signin")({
  component: SignInPage,
});

function SignInPage() {
  // Auth isn't wired yet — the real flow lands with the backend auth milestone.
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    toast.info("Sign-in isn't connected yet — coming in the next milestone.");
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to see what's free in your household."
      footer={
        <>
          New here?{" "}
          <Link to="/register" className="font-medium text-honey hover:underline">
            Create a household
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="current-password" />
        </div>
        <Button type="submit" className="w-full">
          Sign in
        </Button>
      </form>
    </AuthShell>
  );
}
