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
import { apiErrorMessage } from "@/lib/api/error-message";
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
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/_authed/admin")({
  component: AdminPage,
});

const PAGE_SIZE = 10;

/** Centered muted row shown when a filter matches nothing. */
function EmptyRow({ colSpan }: { colSpan: number }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-8 text-center text-sm text-muted-foreground">
        {m.no_results()}
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
          <p className="font-display text-lg font-semibold">{m.admin_forbidden_title()}</p>
          <p className="text-sm text-muted-foreground">{m.admin_forbidden_subtitle()}</p>
          <Button asChild variant="outline">
            <Link to="/dashboard">{m.admin_forbidden_button()}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight">{m.admin_title()}</h1>
      <p className="mt-1 text-muted-foreground">{m.admin_subtitle()}</p>

      <Tabs defaultValue="overview" className="mt-6">
        <TabsList>
          <TabsTrigger value="overview">{m.admin_tab_overview()}</TabsTrigger>
          <TabsTrigger value="users">{m.admin_tab_users()}</TabsTrigger>
          <TabsTrigger value="households">{m.admin_tab_households()}</TabsTrigger>
          <TabsTrigger value="reservations">{m.admin_tab_reservations()}</TabsTrigger>
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
    { label: m.admin_stat_users(), value: stats?.users },
    { label: m.admin_stat_households(), value: stats?.housingUnits },
    { label: m.admin_stat_rooms(), value: stats?.rooms },
    { label: m.admin_stat_active_reservations(), value: stats?.activeReservations },
    { label: m.admin_stat_total_reservations(), value: stats?.totalReservations },
    { label: m.admin_stat_pending_invitations(), value: stats?.pendingInvitations },
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
        toast.error(apiErrorMessage(err) ?? m.admin_role_error());
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
      onSuccess: () => toast.success(m.admin_user_deleted_toast()),
      onError: (err, _vars, ctx) => {
        if (ctx?.previous) {
          queryClient.setQueryData(adminControllerUsersQueryKey(), ctx.previous);
        }
        toast.error(apiErrorMessage(err) ?? m.admin_user_delete_error());
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
        placeholder={m.admin_users_search_placeholder()}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-3 max-w-xs"
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{m.admin_col_user()}</TableHead>
            <TableHead>{m.admin_col_role()}</TableHead>
            <TableHead className="text-right">{m.admin_col_owns()}</TableHead>
            <TableHead className="text-right">{m.admin_col_member()}</TableHead>
            <TableHead className="text-right">{m.admin_col_bookings()}</TableHead>
            <TableHead className="text-right">{m.admin_col_actions()}</TableHead>
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
                      {u.systemRole === "ADMIN"
                        ? m.admin_demote_button()
                        : m.admin_promote_button()}
                    </Button>
                  )}
                  {u.id !== currentUserId && (
                    <ConfirmDialog
                      title={m.admin_user_delete_title({ email: u.email })}
                      description={m.admin_user_delete_description()}
                      onConfirm={() => deleteUser.mutate({ id: u.id })}
                      trigger={
                        <Button variant="ghost" size="icon" aria-label={m.admin_user_delete_aria()}>
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
      onSuccess: () => toast.success(m.admin_unit_deleted_toast()),
      onError: (err, _vars, ctx) => {
        if (ctx?.previous) {
          queryClient.setQueryData(adminControllerUnitsQueryKey(), ctx.previous);
        }
        toast.error(apiErrorMessage(err) ?? m.admin_unit_delete_error());
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
        placeholder={m.admin_units_search_placeholder()}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-3 max-w-xs"
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{m.admin_col_household()}</TableHead>
            <TableHead>{m.admin_col_owner()}</TableHead>
            <TableHead>{m.admin_col_timezone()}</TableHead>
            <TableHead className="text-right">{m.admin_col_rooms()}</TableHead>
            <TableHead className="text-right">{m.admin_col_members()}</TableHead>
            <TableHead className="text-right">{m.admin_col_actions()}</TableHead>
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
                  title={m.admin_unit_delete_title({ name: u.name })}
                  description={m.admin_unit_delete_description()}
                  onConfirm={() => deleteUnit.mutate({ id: u.id })}
                  trigger={
                    <Button variant="ghost" size="icon" aria-label={m.admin_unit_delete_aria()}>
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
      onSuccess: () => toast.success(m.admin_reservation_deleted_toast()),
      onError: (err, _vars, ctx) => {
        if (ctx?.previous) {
          queryClient.setQueryData(adminControllerReservationsQueryKey(), ctx.previous);
        }
        toast.error(apiErrorMessage(err) ?? m.admin_reservation_delete_error());
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
          placeholder={m.admin_reservations_search_placeholder()}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{m.filter_all_statuses()}</SelectItem>
            <SelectItem value="ACTIVE">{m.filter_active()}</SelectItem>
            <SelectItem value="CANCELLED">{m.filter_cancelled()}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{m.admin_col_when()}</TableHead>
            <TableHead>{m.admin_col_room()}</TableHead>
            <TableHead>{m.admin_col_household()}</TableHead>
            <TableHead>{m.admin_col_booked_by()}</TableHead>
            <TableHead>{m.admin_col_status()}</TableHead>
            <TableHead className="text-right">{m.admin_col_actions()}</TableHead>
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
                  {r.status === "ACTIVE" ? m.status_active_badge() : m.status_cancelled_badge()}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <ConfirmDialog
                  title={m.admin_reservation_delete_title()}
                  description={m.admin_reservation_delete_description()}
                  onConfirm={() => deleteRes.mutate({ id: r.id })}
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={m.admin_reservation_delete_aria()}
                    >
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
