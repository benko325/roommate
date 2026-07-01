import { Link } from "@tanstack/react-router";
import { DoorOpen } from "lucide-react";
import type { ReactNode } from "react";
import { ModeToggle } from "@/components/mode-toggle";
import { Card, CardContent } from "@/components/ui/card";

/** Centered, branded frame shared by the sign-in and register screens. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-paper text-ink">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2">
          <DoorOpen className="size-6 text-honey" />
          <span className="font-display text-xl font-bold tracking-tight">RoomMate</span>
        </Link>
        <ModeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-6 text-center">
            <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <Card>
            <CardContent className="pt-6">{children}</CardContent>
          </Card>
          <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>
        </div>
      </main>
    </div>
  );
}
