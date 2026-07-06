import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Button } from "@/components/ui/button";
import { ReportIssueDialog } from "./report-issue-dialog";

const mutate = vi.fn();

// The generated Kubb hooks hit the network; replace the ones this dialog uses.
vi.mock("@/lib/api/generated/hooks", () => ({
  useRoomsControllerFindAll: () => ({ data: [{ id: "room-1", name: "Bathroom" }] }),
  useUnitIssuesControllerCreate: () => ({ mutate, isPending: false }),
  unitIssuesControllerListQueryKey: (unitId: string) => ["issues", unitId],
}));

function renderDialog(reservation?: { id: string; roomName: string; label: string }) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ReportIssueDialog
        unitId="unit-1"
        reservation={reservation}
        trigger={<Button>Open report</Button>}
      />
    </QueryClientProvider>,
  );
}

describe("ReportIssueDialog", () => {
  beforeEach(() => {
    mutate.mockClear();
  });

  it("requires a message before submitting", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: "Open report" }));
    await user.click(screen.getByRole("button", { name: "Report issue" }));

    expect(await screen.findByText("Describe the issue")).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it("submits a general issue without a roomId", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: "Open report" }));
    await user.type(screen.getByLabelText("What's wrong?"), "The heating is broken");
    await user.click(screen.getByRole("button", { name: "Report issue" }));

    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect(mutate.mock.calls[0][0]).toEqual({
      unitId: "unit-1",
      data: { message: "The heating is broken" },
    });
  });

  it("pre-links the reservation and hides the room picker", async () => {
    const user = userEvent.setup();
    renderDialog({ id: "res-1", roomName: "Bathroom", label: "Mon, Aug 10 · 10:00–11:00" });
    await user.click(screen.getByRole("button", { name: "Open report" }));

    expect(screen.getByText(/About your reservation of Bathroom/)).toBeInTheDocument();
    expect(screen.queryByText("Where")).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("What's wrong?"), "No hot water");
    await user.click(screen.getByRole("button", { name: "Report issue" }));

    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect(mutate.mock.calls[0][0]).toEqual({
      unitId: "unit-1",
      data: { message: "No hot water", reservationId: "res-1" },
    });
  });
});
