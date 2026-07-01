import { cn } from "@/lib/utils";

type Status = "free" | "occupied";

/**
 * RoomMate's signature element — the vacant/occupied door latch.
 * A pill whose knob slides between Vacant (sage) and Occupied (clay).
 * Status is conveyed by label + position, never color alone.
 */
export function OccupancyLatch({ status, className }: { status: Status; className?: string }) {
  const occupied = status === "occupied";
  return (
    <span
      role="status"
      aria-label={occupied ? "Occupied" : "Vacant"}
      className={cn(
        "inline-flex select-none items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-xs font-medium",
        occupied ? "border-clay/30 bg-clay/12 text-clay" : "border-sage/30 bg-sage/12 text-sage",
        className,
      )}
    >
      <span className="relative inline-flex h-5 w-9 items-center rounded-full bg-current/15">
        <span
          className={cn(
            "absolute h-4 w-4 rounded-full bg-current transition-transform duration-200 ease-out motion-reduce:transition-none",
            occupied ? "translate-x-[1.125rem]" : "translate-x-0.5",
          )}
        />
      </span>
      {occupied ? "Occupied" : "Vacant"}
    </span>
  );
}
