import { createFileRoute, Link } from "@tanstack/react-router";
import { DoorOpen, Plus, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { HouseholdFormDialog } from "@/features/households/household-form-dialog";
import { useHousingUnitsControllerFindAll } from "@/lib/api/generated/hooks";

export const Route = createFileRoute("/_authed/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { data: units, isLoading } = useHousingUnitsControllerFindAll();

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Your households</h1>
          <p className="mt-1 text-muted-foreground">
            Households you own or belong to. Open one to manage rooms and bookings.
          </p>
        </div>
        <HouseholdFormDialog
          trigger={
            <Button>
              <Plus className="size-4" /> New household
            </Button>
          }
        />
      </div>

      {isLoading ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : units && units.length > 0 ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {units.map((unit) => (
            <Link key={unit.id} to="/units/$unitId" params={{ unitId: unit.id }}>
              <Card className="h-full transition-colors hover:border-honey">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <h2 className="font-display text-lg font-semibold">{unit.name}</h2>
                    <Badge variant={unit.viewerRole === "OWNER" ? "default" : "secondary"}>
                      {unit.viewerRole === "OWNER" ? "Owner" : "Member"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{unit.address}</p>
                  <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <DoorOpen className="size-4" /> {unit.roomCount} rooms
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="size-4" /> {unit.memberCount} members
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="mt-8 border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <div className="rounded-full bg-secondary p-3">
              <DoorOpen className="size-6 text-honey" />
            </div>
            <div>
              <p className="font-display text-lg font-semibold">No households yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create one to add rooms and invite your housemates.
              </p>
            </div>
            <HouseholdFormDialog
              trigger={
                <Button>
                  <Plus className="size-4" /> Create a household
                </Button>
              }
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
