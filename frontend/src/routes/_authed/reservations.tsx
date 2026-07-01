import { createFileRoute } from "@tanstack/react-router";

// Placeholder — the cross-unit "my reservations" list lands in the
// reservations UI task.
export const Route = createFileRoute("/_authed/reservations")({
  component: () => <p className="text-muted-foreground">Your reservations list is coming soon.</p>,
});
