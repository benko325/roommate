import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { CalendarClock, DoorOpen, LogOut, Shield, User } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth/guard";
import { useAuth, useLogout } from "@/lib/auth/use-auth";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/_authed")({
  beforeLoad: requireAuth,
  component: AuthedLayout,
});

function AuthedLayout() {
  const logout = useLogout();
  const { user } = useAuth();
  return (
    <div className="min-h-dvh bg-paper text-ink">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="flex items-center gap-2">
            <DoorOpen className="size-6 text-honey" />
            <span className="font-display text-xl font-bold tracking-tight">RoomMate</span>
          </Link>
          <nav className="flex items-center gap-1">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/reservations">
                <CalendarClock className="size-4" /> {m.nav_my_reservations()}
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/profile">
                <User className="size-4" /> {m.nav_profile()}
              </Link>
            </Button>
            {user?.systemRole === "ADMIN" && (
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin">
                  <Shield className="size-4" /> {m.nav_admin()}
                </Link>
              </Button>
            )}
            <LanguageSwitcher />
            <ModeToggle />
            <Button variant="ghost" size="sm" onClick={() => logout()}>
              <LogOut className="size-4" /> {m.nav_signout()}
            </Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
