import { createFileRoute, Outlet } from "@tanstack/react-router";

// Layout for a unit: renders the detail (index route) or a nested room page.
export const Route = createFileRoute("/_authed/units/$unitId")({
  component: () => <Outlet />,
});
