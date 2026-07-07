import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, DoorOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HouseholdFormDialog } from "@/features/households/household-form-dialog";
import { IssuesPanel } from "@/features/issues/issues-panel";
import { PeoplePanel } from "@/features/members/people-panel";
import { RoomFormDialog } from "@/features/rooms/room-form-dialog";
import {
  housingUnitsControllerFindAllQueryKey,
  roomsControllerFindAllQueryKey,
  useHousingUnitsControllerFindOne,
  useHousingUnitsControllerRemove,
  useRoomsControllerFindAll,
  useRoomsControllerRemove,
} from "@/lib/api/generated/hooks";
import type { RoomDto } from "@/lib/api/generated/types";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/_authed/units/$unitId/")({
  component: UnitDetailPage,
});

function roomRules(room: RoomDto): string {
  const parts: string[] = [];
  if (room.maxReservationHours) parts.push(`≤${room.maxReservationHours}h`);
  if (room.maxReservationsPerDay)
    parts.push(m.room_rule_per_day({ count: room.maxReservationsPerDay }));
  if (room.minGapMinutes) parts.push(m.room_rule_gap({ minutes: room.minGapMinutes }));
  if (room.availableFrom && room.availableTo)
    parts.push(`${room.availableFrom}–${room.availableTo}`);
  return parts.length ? parts.join(" · ") : m.room_rule_no_limits();
}

function UnitDetailPage() {
  const { unitId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: unit, isLoading } = useHousingUnitsControllerFindOne(unitId);
  const { data: rooms } = useRoomsControllerFindAll(unitId);
  const removeUnit = useHousingUnitsControllerRemove();
  const removeRoom = useRoomsControllerRemove();

  if (isLoading || !unit) {
    return <Skeleton className="h-40 rounded-xl" />;
  }
  const isOwner = unit.viewerRole === "OWNER";

  return (
    <div>
      <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
        <Link to="/dashboard">
          <ArrowLeft className="size-4" /> {m.unit_back_link()}
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl font-bold tracking-tight">{unit.name}</h1>
            <Badge variant={isOwner ? "default" : "secondary"}>
              {isOwner ? m.role_owner() : m.role_member()}
            </Badge>
          </div>
          <p className="mt-1 text-muted-foreground">
            {unit.address} · <span className="font-mono text-sm">{unit.timezone}</span>
          </p>
          {unit.description && <p className="mt-2 max-w-prose text-sm">{unit.description}</p>}
        </div>
        {isOwner && (
          <div className="flex gap-2">
            <HouseholdFormDialog
              unit={unit}
              trigger={
                <Button variant="outline" size="sm">
                  <Pencil className="size-4" /> {m.edit_button()}
                </Button>
              }
            />
            <ConfirmDialog
              title={m.unit_delete_title()}
              description={m.admin_unit_delete_description()}
              onConfirm={() =>
                removeUnit.mutate(
                  { id: unitId },
                  {
                    onSuccess: async () => {
                      await queryClient.invalidateQueries({
                        queryKey: housingUnitsControllerFindAllQueryKey(),
                      });
                      navigate({ to: "/dashboard" });
                    },
                  },
                )
              }
              trigger={
                <Button variant="ghost" size="sm" className="text-destructive">
                  <Trash2 className="size-4" /> {m.delete_button()}
                </Button>
              }
            />
          </div>
        )}
      </div>

      <Tabs defaultValue="rooms" className="mt-8">
        <TabsList>
          <TabsTrigger value="rooms">{m.unit_tab_rooms()}</TabsTrigger>
          <TabsTrigger value="people">{m.unit_tab_people()}</TabsTrigger>
          <TabsTrigger value="issues">{m.unit_tab_issues()}</TabsTrigger>
        </TabsList>

        <TabsContent value="rooms">
          <div className="mb-4 flex items-center justify-end">
            {isOwner && (
              <RoomFormDialog
                unitId={unitId}
                trigger={
                  <Button size="sm">
                    <Plus className="size-4" /> {m.add_room_button()}
                  </Button>
                }
              />
            )}
          </div>

          {rooms && rooms.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => (
                <Card key={room.id} className="flex flex-col">
                  <CardContent className="flex flex-1 flex-col p-5">
                    <div className="flex items-start justify-between">
                      <Link
                        to="/units/$unitId/rooms/$roomId"
                        params={{ unitId, roomId: room.id }}
                        className="font-display text-lg font-semibold hover:text-honey"
                      >
                        {room.name}
                      </Link>
                      {isOwner && (
                        <div className="flex gap-1">
                          <RoomFormDialog
                            unitId={unitId}
                            room={room}
                            trigger={
                              <Button variant="ghost" size="icon" aria-label={m.edit_room_aria()}>
                                <Pencil className="size-4" />
                              </Button>
                            }
                          />
                          <ConfirmDialog
                            title={m.room_delete_title({ name: room.name })}
                            description={m.room_delete_description()}
                            onConfirm={() =>
                              removeRoom.mutate(
                                { unitId, roomId: room.id },
                                {
                                  onSuccess: () =>
                                    queryClient.invalidateQueries({
                                      queryKey: roomsControllerFindAllQueryKey(unitId),
                                    }),
                                },
                              )
                            }
                            trigger={
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={m.delete_room_aria()}
                                className="text-destructive"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            }
                          />
                        </div>
                      )}
                    </div>
                    {/* Always reserve one line so cards align; truncate long text. */}
                    <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                      {room.description || " "}
                    </p>
                    <p className="mt-3 font-mono text-xs text-muted-foreground">
                      {roomRules(room)}
                    </p>
                    <Button variant="outline" size="sm" asChild className="mt-4 w-full">
                      <Link to="/units/$unitId/rooms/$roomId" params={{ unitId, roomId: room.id }}>
                        {m.view_availability_button()}
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
                <DoorOpen className="size-6 text-honey" />
                <p className="text-sm text-muted-foreground">
                  {isOwner ? m.rooms_empty_owner() : m.rooms_empty_member()}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="people">
          <PeoplePanel unitId={unitId} isOwner={isOwner} />
        </TabsContent>

        <TabsContent value="issues">
          <IssuesPanel unitId={unitId} isOwner={isOwner} timezone={unit.timezone} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
