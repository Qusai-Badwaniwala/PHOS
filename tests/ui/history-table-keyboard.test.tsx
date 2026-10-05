import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HistoryTable } from "@/components/history/history-table";
import type { TimelineEntryDTO } from "@/types/dto";

it("opens a dated history record once from the keyboard", async () => {
  const entry: TimelineEntryDTO = {
    id: "saved-study",
    type: "revision",
    title: "Completed revision",
    description: "Pages 582–589 · 8 recalls",
    date: "05/10/2026",
    time: "10:48 AM",
    status: "completed",
  };
  const select = jest.fn();
  const user = userEvent.setup();
  render(<HistoryTable entries={[entry]} onSelect={select} />);
  await user.tab();
  expect(screen.getByRole("button", { name: "Open Completed revision, 05/10/2026" })).toHaveFocus();
  await user.keyboard("{Enter}");
  expect(select).toHaveBeenCalledTimes(1);
  expect(select).toHaveBeenCalledWith(entry);
});
