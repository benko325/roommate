import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useInvitationsControllerAccept,
  useInvitationsControllerLookup,
  useInvitationsControllerReject,
} from "@/lib/api/generated/hooks";
import { getToken } from "@/lib/auth/token";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/invite/$token")({
  component: InvitePage,
});

function InvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useInvitationsControllerLookup({ token });
  const accept = useInvitationsControllerAccept();
  const reject = useInvitationsControllerReject();
  const signedIn = !!getToken();

  const body = () => {
    if (isLoading) return <Skeleton className="h-24 w-full" />;
    if (isError || !data) {
      return <p className="text-center text-sm text-muted-foreground">{m.invite_invalid()}</p>;
    }
    if (data.status !== "PENDING") {
      return (
        <p className="text-center text-sm text-muted-foreground">
          {data.status === "ACCEPTED" ? m.invite_already_accepted() : m.invite_already_declined()}
        </p>
      );
    }
    if (!signedIn) {
      return (
        <div className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            {m.invite_signin_prompt_before()}{" "}
            <span className="font-medium text-ink">{data.email}</span>{" "}
            {m.invite_signin_prompt_after()}
          </p>
          <div className="flex justify-center gap-2">
            <Button asChild>
              <Link to="/signin">{m.signin_button()}</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/register">{m.register_button()}</Link>
            </Button>
          </div>
        </div>
      );
    }
    return (
      <div className="flex justify-center gap-2">
        <Button
          disabled={accept.isPending}
          onClick={() =>
            accept.mutate(
              { data: { token } },
              {
                onSuccess: () => {
                  toast.success(m.invite_joined_toast({ unitName: data.unitName }));
                  navigate({ to: "/dashboard" });
                },
                onError: () => toast.error(m.invite_accept_error()),
              },
            )
          }
        >
          {m.invite_accept_button()}
        </Button>
        <Button
          variant="outline"
          disabled={reject.isPending}
          onClick={() =>
            reject.mutate(
              { data: { token } },
              {
                onSuccess: () => {
                  toast(m.invite_declined_toast());
                  navigate({ to: "/dashboard" });
                },
                onError: () => toast.error(m.invite_decline_error()),
              },
            )
          }
        >
          {m.invite_decline_button()}
        </Button>
      </div>
    );
  };

  return (
    <AuthShell
      title={
        data?.unitName ? m.invite_title({ unitName: data.unitName }) : m.invite_title_generic()
      }
      subtitle={m.invite_subtitle()}
      footer={
        <Link to="/" className="font-medium text-honey hover:underline">
          {m.invite_back_home()}
        </Link>
      }
    >
      {body()}
    </AuthShell>
  );
}
