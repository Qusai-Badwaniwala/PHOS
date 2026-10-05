import React from "react";
import { act, render, screen } from "@testing-library/react";
import { StudyExperience } from "@/components/shared/study-experience";
import { getSession } from "@/lib/api/session";
import { getStudyReceipt } from "@/lib/api/activeSession";
import type { SessionDTO } from "@/types/dto";

let mockParams = new URLSearchParams();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  useSearchParams: () => mockParams,
}));
jest.mock("@/providers/settings-provider", () => ({
  useSettings: () => ({
    settings: {
      session: { showTimer: false, showProgress: false },
      revision: { showProgress: false },
    },
  }),
}));
jest.mock("@/lib/api/session", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/api/revision", () => ({ getRevision: jest.fn() }));
jest.mock("@/lib/api/activeSession", () => ({ getStudyReceipt: jest.fn() }));

const assignment = {
  id: "new",
  status: "not_started",
  studyPages: [{ pageId: "p2", pageNumber: 2, juzNumber: 1 }],
  progress: { current: 0, total: 1 },
  estimatedTime: "1 min",
} as unknown as SessionDTO;

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = new URLSearchParams();
});

it("discards an old receipt when the next receipt cannot be loaded", async () => {
  mockParams = new URLSearchParams("receipt=old");
  jest.mocked(getStudyReceipt).mockResolvedValueOnce({
    sessionId: "old",
    sessionType: "Sabaq",
    pagesCompleted: 1,
    weakPages: 0,
    totalRecallEvents: 1,
    durationSeconds: 60,
    completedAt: "2026-10-05T10:00:00Z",
  });
  const view = render(<StudyExperience />);
  await screen.findByRole("heading", { name: "A careful day’s work" });
  mockParams = new URLSearchParams("receipt=missing");
  jest.mocked(getStudyReceipt).mockRejectedValueOnce(new Error("This record could not be found."));
  view.rerender(<StudyExperience />);
  await screen.findByRole("alert");
  expect(screen.queryByRole("heading", { name: "A careful day’s work" })).not.toBeInTheDocument();
});

it("keeps the newest assignment when an earlier request finishes later", async () => {
  let resolveOld!: (value: SessionDTO) => void;
  jest.mocked(getSession).mockReturnValueOnce(
    new Promise((resolve) => {
      resolveOld = resolve;
    }),
  );
  const view = render(<StudyExperience />);
  mockParams = new URLSearchParams("extra=1");
  jest.mocked(getSession).mockResolvedValueOnce(assignment);
  view.rerender(<StudyExperience />);
  await screen.findByText("Page 2", { selector: "h2" });
  await act(async () =>
    resolveOld({
      ...assignment,
      studyPages: [{ pageId: "p1", pageNumber: 1, juzNumber: 1 }],
    } as SessionDTO),
  );
  expect(screen.getByText("Page 2", { selector: "h2" })).toBeInTheDocument();
  expect(screen.queryByText("Page 1", { selector: "h2" })).not.toBeInTheDocument();
});
