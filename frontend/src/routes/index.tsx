import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, DoorOpen, Users } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { OccupancyLatch } from "@/components/occupancy-latch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

const ROOMS = [
  { name: m.landing_demo_kitchen, note: m.landing_demo_kitchen_note, status: "free" as const },
  {
    name: m.landing_demo_bathroom,
    note: m.landing_demo_bathroom_note,
    status: "occupied" as const,
  },
  { name: m.landing_demo_laundry, note: m.landing_demo_laundry_note, status: "free" as const },
];

function LandingPage() {
  return (
    <div className="min-h-dvh bg-paper text-ink">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <DoorOpen className="size-6 text-honey" />
          <span className="font-display text-xl font-bold tracking-tight">RoomMate</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link to="/signin">{m.signin_button()}</Link>
          </Button>
          <Button asChild>
            <Link to="/register">{m.landing_get_started()}</Link>
          </Button>
          <ModeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <section className="grid items-center gap-12 py-16 md:grid-cols-2 md:py-24">
          <div>
            <Badge variant="secondary" className="mb-5 rounded-full">
              {m.landing_badge()}
            </Badge>
            <h1 className="font-display text-5xl leading-[1.05] font-bold tracking-tight md:text-6xl">
              {m.landing_hero_before()}{" "}
              <span className="text-honey">{m.landing_hero_highlight()}</span>{" "}
              {m.landing_hero_after()}
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">{m.landing_hero_sub()}</p>
            <div className="mt-8 flex gap-3">
              <Button size="lg" asChild>
                <Link to="/register">{m.landing_cta_create()}</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/signin">{m.signin_button()}</Link>
              </Button>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Users className="size-4" /> {m.landing_feature_invite()}
              </span>
              <span className="flex items-center gap-2">
                <CalendarClock className="size-4" /> {m.landing_feature_availability()}
              </span>
            </div>
          </div>

          <Card className="shadow-sm">
            <CardContent className="p-2">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="font-display text-sm font-semibold">{m.landing_demo_unit()}</span>
                <span className="font-mono text-xs text-muted-foreground tabular-nums">08:42</span>
              </div>
              <ul className="space-y-1">
                {ROOMS.map((room) => (
                  <li
                    key={room.name()}
                    className="flex items-center justify-between rounded-xl px-4 py-3 hover:bg-secondary"
                  >
                    <div>
                      <p className="font-medium">{room.name()}</p>
                      <p className="font-mono text-xs text-muted-foreground tabular-nums">
                        {room.note()}
                      </p>
                    </div>
                    <OccupancyLatch status={room.status} />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
