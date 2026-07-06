import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldOff, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PaginationControls } from "@/components/pagination-controls";
import { TableSkeleton } from "@/components/table-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  adminControllerReservationsQueryKey,
  adminControllerStatsQueryKey,
  adminControllerUnitsQueryKey,
  adminControllerUsersQueryKey,
  useAdminControllerDeleteReservation,
  useAdminControllerDeleteUnit,
  useAdminControllerDeleteUser,
  useAdminControllerReservations,
  useAdminControllerSetRole,
  useAdminControllerStats,
  useAdminControllerUnits,
  useAdminControllerUsers,
} from "@/lib/api/generated/hooks";
import type { AdminReservationDto, AdminUnitDto, AdminUserDto } from "@/lib/api/generated/types";
import { useAuth } from "@/lib/auth/use-auth";
import { usePagination } from "@/lib/use-pagination";

export const Route = createFileRoute("/_authed/admin")({
  component: AdminPage,
});

const PAGE_SIZE = 10;

function apiErrorMessage(err: unknown): string | undefined {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
}

/** Centered muted row shown when a filter matches nothing. */
function EmptyRow({ colSpan }: { colSpan: number }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-8 text-center text-sm text-muted-foreground">
        No results.
      </TableCell>
    </TableRow>
  );
}

function AdminPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;
  if (user?.systemRole !== "ADMIN") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <ShieldOff className="size-8 text-muted-foreground" />
          <p className="font-display text-lg font-semibold">Admins only</p>
          <p className="text-sm text-muted-foreground">You don't have access to this area.</p>
          <Button asChild variant="outline">
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight">Admin</h1>
      <p className="mt-1 text-muted-foreground">System-wide management and stats.</p>

      <Tabs defaultValue="overview" className="mt-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="households">Households</TabsTrigger>
          <TabsTrigger value="reservations">Reservations</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="users">
          <UsersTab currentUserId={user.id} />
        </TabsContent>
        <TabsContent value="households">
          <HouseholdsTab />
        </TabsContent>
        <TabsContent value="reservations">
          <ReservationsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OverviewTab() {
  const { data: stats } = useAdminControllerStats();
  const cards = [
    { label: "Users", value: stats?.users },
    { label: "Households", value: stats?.housingUnits },
    { label: "Rooms", value: stats?.rooms },
    { label: "Active reservations", value: stats?.activeReservations },
    { label: "Total reservations", value: stats?.totalReservations },
    { label: "Pending invitations", value: stats?.pendingInvitations },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">{c.label}</p>
            <p className="mt-1 font-display text-3xl font-bold tabular-nums">{c.value ?? "—"}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function UsersTab({ currentUserId }: { currentUserId: string }) {
  const queryClient = useQueryClient();
  const { data: users, isLoading } = useAdminControllerUsers();
  const [search, setSearch] = useState("");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: adminControllerUsersQueryKey() });
    queryClient.invalidateQueries({ queryKey: adminControllerStatsQueryKey() });
  };

  // Both mutations update the cached list optimistically and roll back on error.
  const setRole = useAdminControllerSetRole({
    mutation: {
      onMutate: async ({ id, data }) => {
        await queryClient.cancelQueries({ queryKey: adminControllerUsersQueryKey() });
        const previous = queryClient.getQueryData<AdminUserDto[]>(adminControllerUsersQueryKey());
        queryClient.setQueryData<AdminUserDto[]>(adminControllerUsersQueryKey(), (old) =>
          old?.map((u) => (u.id === id ? { ...u, systemRole: data.systemRole } : u)),
        );
        return { previous };
      },
      onError: (err, _vars, ctx) => {
        if (ctx?.previous) {
          queryClient.setQueryData(adminControllerUsersQueryKey(), ctx.previous);
        }
        toast.error(apiErrorMessage(err) ?? "Could not change role");
      },
      onSettled: invalidate,
    },
  });

  const deleteUser = useAdminControllerDeleteUser({
    mutation: {
      onMutate: async ({ id }) => {
        await queryClient.cancelQueries({ queryKey: adminControllerUsersQueryKey() });
        const previous = queryClient.getQueryData<AdminUserDto[]>(adminControllerUsersQueryKey());
        queryClient.setQueryData<AdminUserDto[]>(adminControllerUsersQueryKey(), (old) =>
          old?.filter((u) => u.id !== id),
        );
        return { previous };
      },
      onSuccess: () => toast.success("User deleted"),
      onError: (err, _vars, ctx) => {
        if (ctx?.previous) {
          queryClient.setQueryData(adminControllerUsersQueryKey(), ctx.previous);
        }
        toast.error(apiErrorMessage(err) ?? "Could not delete user");
      },
      onSettled: invalidate,
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users ?? [];
    return (users ?? []).filter(
      (u) =>
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    );
  }, [users, search]);
  const { page, setPage, pageCount, pageItems } = usePagination(filtered, PAGE_SIZE);

  if (isLoading) return <TableSkeleton />;

  return (
    <div>
      <Input
        placeholder="Search by name or email…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-3 max-w-xs"
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="text-right">Owns</TableHead>
            <TableHead className="text-right">Member</TableHead>
            <TableHead className="text-right">Bookings</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageItems.length === 0 && <EmptyRow colSpan={6} />}
          {pageItems.map((u) => (
            <TableRow key={u.id}>
              <TableCell>
                <div className="font-medium">
                  {u.firstName} {u.lastName}
                </div>
                <div className="text-sm text-muted-foreground">{u.email}</div>
              </TableCell>
              <TableCell>
                <Badge variant={u.systemRole === "ADMIN" ? "default" : "secondary"}>
                  {u.systemRole}
                </Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">{u.ownedUnitCount}</TableCell>
              <TableCell className="text-right tabular-nums">{u.membershipCount}</TableCell>
              <TableCell className="text-right tabular-nums">{u.reservationCount}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  {u.id !== currentUserId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setRole.mutate({
                          id: u.id,
                          data: { systemRole: u.systemRole === "ADMIN" ? "USER" : "ADMIN" },
                        })
                      }
                    >
                      {u.systemRole === "ADMIN" ? "Demote" : "Make admin"}
                    </Button>
                  )}
                  {u.id !== currentUserId && (
                    <ConfirmDialog
                      title={`Delete ${u.email}?`}
                      description="This permanently deletes the user and their memberships and bookings."
                      onConfirm={() => deleteUser.mutate({ id: u.id })}
                      trigger={
                        <Button variant="ghost" size="icon" aria-label="Delete user">
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      }
                    />
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <PaginationControls page={page} pageCount={pageCount} onPageChange={setPage} />
    </div>
  );
}

function HouseholdsTab() {
  const queryClient = useQueryClient();
  const { data: units, isLoading } = useAdminControllerUnits();
  const [search, setSearch] = useState("");

  const deleteUnit = useAdminControllerDeleteUnit({
    mutation: {
      onMutate: async ({ id }) => {
        await queryClient.cancelQueries({ queryKey: adminControllerUnitsQueryKey() });
        const previous = queryClient.getQueryData<AdminUnitDto[]>(adminControllerUnitsQueryKey());
        queryClient.setQueryData<AdminUnitDto[]>(adminControllerUnitsQueryKey(), (old) =>
          old?.filter((u) => u.id !== id),
        );
        return { previous };
      },
      onSuccess: () => toast.success("Household deleted"),
      onError: (err, _vars, ctx) => {
        if (ctx?.previous) {
          queryClient.setQueryData(adminControllerUnitsQueryKey(), ctx.previous);
        }
        toast.error(apiErrorMessage(err) ?? "Could not delete household");
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: adminControllerUnitsQueryKey() });
        queryClient.invalidateQueries({ queryKey: adminControllerStatsQueryKey() });
      },
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return units ?? [];
    return (units ?? []).filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.address.toLowerCase().includes(q) ||
        u.ownerEmail.toLowerCase().includes(q),
    );
  }, [units, search]);
  const { page, setPage, pageCount, pageItems } = usePagination(filtered, PAGE_SIZE);

  if (isLoading) return <TableSkeleton />;

  return (
    <div>
      <Input
        placeholder="Search by name, address, or owner…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-3 max-w-xs"
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Household</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Timezone</TableHead>
            <TableHead className="text-right">Rooms</TableHead>
            <TableHead className="text-right">Members</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageItems.length === 0 && <EmptyRow colSpan={6} />}
          {pageItems.map((u) => (
            <TableRow key={u.id}>
              <TableCell>
                <div className="font-medium">{u.name}</div>
                <div className="text-sm text-muted-foreground">{u.address}</div>
              </TableCell>
              <TableCell className="text-sm">{u.ownerEmail}</TableCell>
              <TableCell className="font-mono text-xs">{u.timezone}</TableCell>
              <TableCell className="text-right tabular-nums">{u.roomCount}</TableCell>
              <TableCell className="text-right tabular-nums">{u.memberCount}</TableCell>
              <TableCell className="text-right">
                <ConfirmDialog
                  title={`Delete ${u.name}?`}
                  description="This permanently removes the household, its rooms, and all reservations."
                  onConfirm={() => deleteUnit.mutate({ id: u.id })}
                  trigger={
                    <Button variant="ghost" size="icon" aria-label="Delete household">
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  }
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <PaginationControls page={page} pageCount={pageCount} onPageChange={setPage} />
    </div>
  );
}

function ReservationsTab() {
  const queryClient = useQueryClient();
  const { data: reservations, isLoading } = useAdminControllerReservations();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ALL" | "ACTIVE" | "CANCELLED">("ALL");

  const deleteRes = useAdminControllerDeleteReservation({
    mutation: {
      onMutate: async ({ id }) => {
        await queryClient.cancelQueries({ queryKey: adminControllerReservationsQueryKey() });
        const previous = queryClient.getQueryData<AdminReservationDto[]>(
          adminControllerReservationsQueryKey(),
        );
        queryClient.setQueryData<AdminReservationDto[]>(
          adminControllerReservationsQueryKey(),
          (old) => old?.filter((r) => r.id !== id),
        );
        return { previous };
      },
      onSuccess: () => toast.success("Reservation deleted"),
      onError: (err, _vars, ctx) => {
        if (ctx?.previous) {
          queryClient.setQueryData(adminControllerReservationsQueryKey(), ctx.previous);
        }
        toast.error(apiErrorMessage(err) ?? "Could not delete reservation");
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: adminControllerReservationsQueryKey() });
        queryClient.invalidateQueries({ queryKey: adminControllerStatsQueryKey() });
      },
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (reservations ?? []).filter(
      (r) =>
        (status === "ALL" || r.status === status) &&
        (!q ||
          r.roomName.toLowerCase().includes(q) ||
          r.unitName.toLowerCase().includes(q) ||
          r.userEmail.toLowerCase().includes(q)),
    );
  }, [reservations, search, status]);
  const { page, setPage, pageCount, pageItems } = usePagination(filtered, PAGE_SIZE);

  if (isLoading) return <TableSkeleton />;

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <Input
          placeholder="Search by room, household, or user…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>When</TableHead>
            <TableHead>Room</TableHead>
            <TableHead>Household</TableHead>
            <TableHead>Booked by</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageItems.length === 0 && <EmptyRow colSpan={6} />}
          {pageItems.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="text-sm tabular-nums">
                {new Date(r.startAt).toLocaleString()}
              </TableCell>
              <TableCell>{r.roomName}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{r.unitName}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{r.userEmail}</TableCell>
              <TableCell>
                <Badge variant={r.status === "ACTIVE" ? "default" : "outline"}>
                  {r.status.toLowerCase()}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <ConfirmDialog
                  title="Delete this reservation?"
                  description="This permanently removes the reservation."
                  onConfirm={() => deleteRes.mutate({ id: r.id })}
                  trigger={
                    <Button variant="ghost" size="icon" aria-label="Delete reservation">
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  }
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <PaginationControls page={page} pageCount={pageCount} onPageChange={setPage} />
    </div>
  );
}
