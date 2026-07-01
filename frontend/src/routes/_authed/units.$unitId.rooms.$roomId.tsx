import { createFileRoute } from "@tanstack/react-router";

// Placeholder — the availability calendar and booking flow land in the
// reservations UI task.
export const Route = createFileRoute("/_authed/units/$unitId/rooms/$roomId")({
  component: () => <p className="text-muted-foreground">Room calendar coming soon.</p>,
});
