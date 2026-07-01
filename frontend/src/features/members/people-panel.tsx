import { useQueryClient } from "@tanstack/react-query";
import { Mail, Trash2, UserMinus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  unitInvitationsControllerListQueryKey,
  unitInvitationsControllerMembersQueryKey,
  useUnitInvitationsControllerInvite,
  useUnitInvitationsControllerList,
  useUnitInvitationsControllerMembers,
  useUnitInvitationsControllerRemoveMember,
  useUnitInvitationsControllerRevoke,
} from "@/lib/api/generated/hooks";

const STATUS_VARIANT = {
  PENDING: "secondary",
  ACCEPTED: "default",
  REJECTED: "outline",
  EXPIRED: "outline",
} as const;

export function PeoplePanel({ unitId, isOwner }: { unitId: string; isOwner: boolean }) {
  const queryClient = useQueryClient();
  const { data: members } = useUnitInvitationsControllerMembers(unitId);
  const invite = useUnitInvitationsControllerInvite();
  const removeMember = useUnitInvitationsControllerRemoveMember();
  const [email, setEmail] = useState("");

  const invalidateMembers = () =>
    queryClient.invalidateQueries({ queryKey: unitInvitationsControllerMembersQueryKey(unitId) });

  return (
    <div className="space-y-8">
      <section>
        <h3 className="font-display text-lg font-semibold">Members</h3>
        <div className="mt-3 divide-y rounded-xl border">
          {members && members.length > 0 ? (
            members.map((m) => (
              <div key={m.userId} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium">
                    {m.firstName} {m.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">{m.email}</p>
                </div>
                {isOwner && (
                  <ConfirmDialog
                    title="Remove this member?"
                    description={`${m.firstName} will lose access to this household and its rooms.`}
                    confirmLabel="Remove"
                    onConfirm={() =>
                      removeMember.mutate(
                        { unitId, memberUserId: m.userId },
                        {
                          onSuccess: () => {
                            invalidateMembers();
                            toast.success("Member removed");
                          },
                        },
                      )
                    }
                    trigger={
                      <Button variant="ghost" size="icon" aria-label="Remove member">
                        <UserMinus className="size-4 text-destructive" />
                      </Button>
                    }
                  />
                )}
              </div>
            ))
          ) : (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">No members yet.</p>
          )}
        </div>
      </section>

      {isOwner && (
        <InvitationsSection unitId={unitId} invite={invite} email={email} setEmail={setEmail} />
      )}
    </div>
  );
}

function InvitationsSection({
  unitId,
  invite,
  email,
  setEmail,
}: {
  unitId: string;
  invite: ReturnType<typeof useUnitInvitationsControllerInvite>;
  email: string;
  setEmail: (v: string) => void;
}) {
  const queryClient = useQueryClient();
  const { data: invitations } = useUnitInvitationsControllerList(unitId);
  const revoke = useUnitInvitationsControllerRevoke();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: unitInvitationsControllerListQueryKey(unitId) });

  function send() {
    if (!email.trim()) return;
    invite.mutate(
      { unitId, data: { email: email.trim() } },
      {
        onSuccess: () => {
          invalidate();
          setEmail("");
          toast.success("Invitation sent");
        },
        onError: (err) => {
          const msg = (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message;
          toast.error(msg ?? "Could not send invitation");
        },
      },
    );
  }

  return (
    <section>
      <h3 className="font-display text-lg font-semibold">Invitations</h3>
      <div className="mt-3 flex gap-2">
        <Input
          type="email"
          placeholder="housemate@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <Button onClick={send} disabled={invite.isPending}>
          <Mail className="size-4" /> Invite
        </Button>
      </div>

      {invitations && invitations.length > 0 && (
        <div className="mt-4 divide-y rounded-xl border">
          {invitations.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium">{inv.email}</p>
                <p className="text-xs text-muted-foreground">
                  Sent {new Date(inv.sentAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={STATUS_VARIANT[inv.status]}>{inv.status.toLowerCase()}</Badge>
                {inv.status === "PENDING" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Revoke invitation"
                    onClick={() =>
                      revoke.mutate({ unitId, invitationId: inv.id }, { onSuccess: invalidate })
                    }
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
