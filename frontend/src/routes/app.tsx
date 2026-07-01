import { createFileRoute, redirect } from "@tanstack/react-router";
import { DoorOpen, LogOut, Plus } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getToken } from "@/lib/auth/token";
import { useAuth, useLogout } from "@/lib/auth/use-auth";

export const Route = createFileRoute("/app")({
  // Guard: no token means not signed in — bounce to the sign-in page.
  beforeLoad: () => {
    if (!getToken()) throw redirect({ to: "/signin" });
  },
  component: DashboardPage,
});

function DashboardPage() {
  const { user, isLoading } = useAuth();
  const logout = useLogout();

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <DoorOpen className="size-6 text-honey" />
          <span className="font-display text-xl font-bold tracking-tight">RoomMate</span>
        </div>
        <div className="flex items-center gap-2">
          <ModeToggle />
          <Button variant="ghost" onClick={() => logout()}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="font-display text-3xl font-bold tracking-tight">
          {isLoading ? "Loading…" : `Hi, ${user?.firstName ?? "there"} 👋`}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Your households will show up here. Create one to add rooms and invite housemates.
        </p>

        <Card className="mt-8 border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <div className="rounded-full bg-secondary p-3">
              <DoorOpen className="size-6 text-honey" />
            </div>
            <div>
              <p className="font-display text-lg font-semibold">No households yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Households, rooms, and reservations land in the next milestone.
              </p>
            </div>
            <Button disabled>
              <Plus className="size-4" /> Create a household
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
