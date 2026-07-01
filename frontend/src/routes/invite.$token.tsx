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
      return (
        <p className="text-center text-sm text-muted-foreground">
          This invitation link is invalid.
        </p>
      );
    }
    if (data.status !== "PENDING") {
      return (
        <p className="text-center text-sm text-muted-foreground">
          This invitation has already been {data.status.toLowerCase()}.
        </p>
      );
    }
    if (!signedIn) {
      return (
        <div className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            Sign in as <span className="font-medium text-ink">{data.email}</span> to respond.
          </p>
          <div className="flex justify-center gap-2">
            <Button asChild>
              <Link to="/signin">Sign in</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/register">Create account</Link>
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
                  toast.success(`You've joined ${data.unitName}`);
                  navigate({ to: "/dashboard" });
                },
                onError: () => toast.error("Could not accept (is this invite for your email?)"),
              },
            )
          }
        >
          Accept invitation
        </Button>
        <Button
          variant="outline"
          disabled={reject.isPending}
          onClick={() =>
            reject.mutate(
              { data: { token } },
              {
                onSuccess: () => {
                  toast("Invitation declined");
                  navigate({ to: "/dashboard" });
                },
                onError: () => toast.error("Could not decline"),
              },
            )
          }
        >
          Decline
        </Button>
      </div>
    );
  };

  return (
    <AuthShell
      title={data?.unitName ? `Join ${data.unitName}` : "Household invitation"}
      subtitle="You've been invited to a shared household on RoomMate."
      footer={
        <Link to="/" className="font-medium text-honey hover:underline">
          Back home
        </Link>
      }
    >
      {body()}
    </AuthShell>
  );
}
