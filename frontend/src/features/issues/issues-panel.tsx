import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, MessageSquareWarning, Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportIssueDialog } from "@/features/issues/report-issue-dialog";
import {
  unitIssuesControllerListQueryKey,
  useUnitIssuesControllerList,
  useUnitIssuesControllerResolve,
} from "@/lib/api/generated/hooks";
import type { IssueDto } from "@/lib/api/generated/types";
import { dateLabelInTz, hhmmInTz } from "@/lib/time";
import { m } from "@/paraglide/messages";

function issueContext(issue: IssueDto, timezone: string): string {
  const parts: string[] = [issue.roomName ?? m.issue_general()];
  if (issue.reservationStartAt && issue.reservationEndAt) {
    parts.push(
      `${dateLabelInTz(issue.reservationStartAt, timezone)} ${hhmmInTz(issue.reservationStartAt, timezone)}–${hhmmInTz(issue.reservationEndAt, timezone)}`,
    );
  }
  return parts.join(" · ");
}

export function IssuesPanel({
  unitId,
  isOwner,
  timezone,
}: {
  unitId: string;
  isOwner: boolean;
  timezone: string;
}) {
  const queryClient = useQueryClient();
  const { data: issues, isLoading } = useUnitIssuesControllerList(unitId);
  const resolve = useUnitIssuesControllerResolve();

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {isOwner ? m.issues_intro_owner() : m.issues_intro_member()}
        </p>
        <ReportIssueDialog
          unitId={unitId}
          trigger={
            <Button size="sm">
              <Plus className="size-4" /> {m.report_issue_button()}
            </Button>
          }
        />
      </div>

      {isLoading ? (
        <Skeleton className="h-24 rounded-xl" />
      ) : issues && issues.length > 0 ? (
        <div className="divide-y rounded-xl border">
          {issues.map((issue) => (
            <div key={issue.id} className="flex items-start justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={issue.status === "OPEN" ? "default" : "outline"}>
                    {issue.status === "OPEN" ? m.issue_status_open() : m.issue_status_resolved()}
                  </Badge>
                  <span className="font-mono text-xs text-muted-foreground">
                    {issueContext(issue, timezone)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    · {isOwner ? issue.reporterName : m.issue_by_you()},{" "}
                    {dateLabelInTz(issue.createdAt, timezone)}
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm">{issue.message}</p>
              </div>
              {isOwner && issue.status === "OPEN" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  disabled={resolve.isPending}
                  onClick={() =>
                    resolve.mutate(
                      { unitId, issueId: issue.id },
                      {
                        onSuccess: () => {
                          queryClient.invalidateQueries({
                            queryKey: unitIssuesControllerListQueryKey(unitId),
                          });
                          toast.success(m.issue_resolved_toast());
                        },
                      },
                    )
                  }
                >
                  <CheckCircle2 className="size-4" /> {m.resolve_button()}
                </Button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <MessageSquareWarning className="size-6 text-honey" />
            <p className="text-sm text-muted-foreground">
              {isOwner ? m.issues_empty_owner() : m.issues_empty_member()}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
