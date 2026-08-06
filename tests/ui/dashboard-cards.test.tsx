import React from "react";
import { render, screen } from "@testing-library/react";
import { DASHBOARD } from "../support/pageFixtures";
import type { TodayRevisionDTO, TodaySessionDTO } from "@/types/dto";

/**
 * The Dashboard's two primary actions.
 *
 * These had no tests at all, and both were dead from the first commit:
 * the button rendered a bare `<span>` whenever a session or revision
 * existed — no href, no handler — so it worked only when there was
 * nothing to do, and did nothing in exactly the case a user would press
 * it. The flow stayed reachable through the sidebar, which is how it
 * survived twelve phases and a public release.
 *
 * The lesson these tests encode: **a button must be asserted to lead
 * somewhere, not merely to exist.** Every test that would have caught
 * this checks the `href`, not the label.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const { TodaySessionCard } = require("@/components/dashboard/today-session-card") as {
  TodaySessionCard: React.ComponentType<{ session?: TodaySessionDTO | null }>;
};
const { TodayRevisionCard } = require("@/components/dashboard/today-revision-card") as {
  TodayRevisionCard: React.ComponentType<{ revision?: TodayRevisionDTO | null }>;
};
/* eslint-enable @typescript-eslint/no-require-imports */

const session = (overrides: Partial<TodaySessionDTO> = {}): TodaySessionDTO => ({
  ...DASHBOARD.session!,
  ...overrides,
});

const revision = (overrides: Partial<TodayRevisionDTO> = {}): TodayRevisionDTO => ({
  ...DASHBOARD.revision!,
  ...overrides,
});

describe("Today's session card", () => {
  it("leads to the session screen when there is work waiting", () => {
    // The case that was broken: a session exists, so the button said
    // "Start Session" and went nowhere.
    render(<TodaySessionCard session={session({ status: "not_started" })} />);

    const action = screen.getByRole("link", { name: /Start Session/ });
    expect(action).toHaveAttribute("href", "/session");
  });

  it("leads to the session screen mid-session too", () => {
    render(<TodaySessionCard session={session({ status: "in_progress" })} />);

    expect(screen.getByRole("link", { name: /Continue Session/ })).toHaveAttribute(
      "href",
      "/session",
    );
  });

  it("still leads there when there is no session at all", () => {
    // The only case that used to work, kept working.
    render(<TodaySessionCard session={null} />);

    expect(screen.getByRole("link", { name: /Go to Session/ })).toHaveAttribute("href", "/session");
  });

  it("never renders the action as anything but a link", () => {
    /*
     * The shape of the original defect. A `<span>` inside a `<button>`
     * looks identical, reads identically to a label-based assertion,
     * and does nothing at all.
     */
    render(<TodaySessionCard session={session()} />);

    expect(screen.queryByRole("button", { name: /Session/ })).not.toBeInTheDocument();
  });
});

describe("Today's revision card", () => {
  it("leads to the revision screen when there is revision waiting", () => {
    render(<TodayRevisionCard revision={revision({ status: "not_started" })} />);

    expect(screen.getByRole("link", { name: /Start Revision/ })).toHaveAttribute(
      "href",
      "/revision",
    );
  });

  it("leads to the revision screen mid-revision too", () => {
    render(<TodayRevisionCard revision={revision({ status: "in_progress" })} />);

    expect(screen.getByRole("link", { name: /Continue Revision/ })).toHaveAttribute(
      "href",
      "/revision",
    );
  });

  it("still leads there when there is no revision at all", () => {
    render(<TodayRevisionCard revision={null} />);

    expect(screen.getByRole("link", { name: /Go to Revision/ })).toHaveAttribute(
      "href",
      "/revision",
    );
  });

  it("never renders the action as anything but a link", () => {
    render(<TodayRevisionCard revision={revision()} />);

    expect(screen.queryByRole("button", { name: /Revision/ })).not.toBeInTheDocument();
  });
});
