import { useQueryClient } from "@tanstack/react-query";
import { Mail, Trash2, UserMinus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiErrorMessage } from "@/lib/api/error-message";
import {
  unitInvitationsControllerListQueryKey,
  unitInvitationsControllerMembersQueryKey,
  useUnitInvitationsControllerInvite,
  useUnitInvitationsControllerList,
  useUnitInvitationsControllerMembers,
  useUnitInvitationsControllerRemoveMember,
  useUnitInvitationsControllerRevoke,
} from "@/lib/api/generated/hooks";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

const STATUS_VARIANT = {
  PENDING: "secondary",
  ACCEPTED: "default",
  REJECTED: "outline",
  EXPIRED: "outline",
} as const;

const STATUS_LABEL = {
  PENDING: m.invitation_status_pending,
  ACCEPTED: m.invitation_status_accepted,
  REJECTED: m.invitation_status_rejected,
  EXPIRED: m.invitation_status_expired,
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
        <h3 className="font-display text-lg font-semibold">{m.members_title()}</h3>
        <div className="mt-3 divide-y rounded-xl border">
          {members && members.length > 0 ? (
            members.map((member) => (
              <div key={member.userId} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium">
                    {member.firstName} {member.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">{member.email}</p>
                </div>
                {isOwner && (
                  <ConfirmDialog
                    title={m.member_remove_title()}
                    description={m.member_remove_description({ firstName: member.firstName })}
                    confirmLabel={m.remove_button()}
                    onConfirm={() =>
                      removeMember.mutate(
                        { unitId, memberUserId: member.userId },
                        {
                          onSuccess: () => {
                            invalidateMembers();
                            toast.success(m.member_removed_toast());
                          },
                        },
                      )
                    }
                    trigger={
                      <Button variant="ghost" size="icon" aria-label={m.member_remove_aria()}>
                        <UserMinus className="size-4 text-destructive" />
                      </Button>
                    }
                  />
                )}
              </div>
            ))
          ) : (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              {m.members_empty()}
            </p>
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
          toast.success(m.invitation_sent_toast());
        },
        onError: (err) => {
          toast.error(apiErrorMessage(err) ?? m.invitation_send_error());
        },
      },
    );
  }

  return (
    <section>
      <h3 className="font-display text-lg font-semibold">{m.invitations_title()}</h3>
      <div className="mt-3 flex gap-2">
        <Input
          type="email"
          placeholder={m.invite_email_placeholder()}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <Button onClick={send} disabled={invite.isPending}>
          <Mail className="size-4" /> {m.invite_button()}
        </Button>
      </div>

      {invitations && invitations.length > 0 && (
        <div className="mt-4 divide-y rounded-xl border">
          {invitations.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium">{inv.email}</p>
                <p className="text-xs text-muted-foreground">
                  {m.invitation_sent_date({
                    date: new Date(inv.sentAt).toLocaleDateString(getLocale()),
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={STATUS_VARIANT[inv.status]}>{STATUS_LABEL[inv.status]()}</Badge>
                {inv.status === "PENDING" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={m.invite_revoke_aria()}
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
