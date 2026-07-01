import { CalendarClock, DoorOpen, Users } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { OccupancyLatch } from "@/components/occupancy-latch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const ROOMS = [
  { name: "Kitchen", note: "free until 18:00", status: "free" as const },
  { name: "Bathroom", note: "booked 09:00–10:00", status: "occupied" as const },
  { name: "Laundry", note: "free all day", status: "free" as const },
];

function App() {
  return (
    <div className="min-h-dvh bg-paper text-ink">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <DoorOpen className="size-6 text-honey" />
          <span className="font-display text-xl font-bold tracking-tight">RoomMate</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost">Sign in</Button>
          <Button>Get started</Button>
          <ModeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <section className="grid items-center gap-12 py-16 md:grid-cols-2 md:py-24">
          <div>
            <Badge variant="secondary" className="mb-5 rounded-full">
              Shared living, minus the clashes
            </Badge>
            <h1 className="font-display text-5xl leading-[1.05] font-bold tracking-tight md:text-6xl">
              Who's got the <span className="text-honey">bathroom</span> at eight?
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">
              RoomMate lets housemates see what's free and book shared rooms — kitchen, bathroom,
              laundry — without the group-chat chaos.
            </p>
            <div className="mt-8 flex gap-3">
              <Button size="lg">Create a household</Button>
              <Button size="lg" variant="outline">
                See how it works
              </Button>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Users className="size-4" /> Invite by email
              </span>
              <span className="flex items-center gap-2">
                <CalendarClock className="size-4" /> Live availability
              </span>
            </div>
          </div>

          <Card className="shadow-sm">
            <CardContent className="p-2">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="font-display text-sm font-semibold">Sunny Flat · today</span>
                <span className="font-mono text-xs text-muted-foreground tabular-nums">08:42</span>
              </div>
              <ul className="space-y-1">
                {ROOMS.map((room) => (
                  <li
                    key={room.name}
                    className="flex items-center justify-between rounded-xl px-4 py-3 hover:bg-secondary"
                  >
                    <div>
                      <p className="font-medium">{room.name}</p>
                      <p className="font-mono text-xs text-muted-foreground tabular-nums">
                        {room.note}
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

export default App;
