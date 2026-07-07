import { Link } from "@tanstack/react-router";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

/** Full-page 404, used as the router's defaultNotFoundComponent. */
export function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="rounded-full bg-secondary p-4">
        <Compass className="size-8 text-honey" />
      </div>
      <p className="font-display text-6xl font-bold tracking-tight">404</p>
      <div>
        <p className="font-display text-lg font-semibold">{m.notfound_title()}</p>
        <p className="mt-1 text-sm text-muted-foreground">{m.notfound_subtitle()}</p>
      </div>
      <Button asChild>
        <Link to="/dashboard">{m.notfound_button()}</Link>
      </Button>
    </div>
  );
}
