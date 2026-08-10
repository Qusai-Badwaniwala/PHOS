import React from "react";
import { render, screen } from "@testing-library/react";

/**
 * "You are here", in both navigations.
 *
 * This shipped broken on every route. `next.config.mjs` sets
 * `trailingSlash: true` — PHOS is a static export, and directory-style
 * URLs are what let an offline route resolve to its own `index.html` —
 * so `usePathname()` returns `"/settings/"` while the navigation arrays
 * hold `"/settings"`. `pathname === item.href` was therefore false on
 * every page of the application: nothing was ever highlighted, and
 * `aria-current` was never emitted, so a screen reader was never told
 * where it was.
 *
 * Every case below uses the **trailing-slash** form deliberately. A test
 * written against `"/settings"` passes against the original defect and
 * proves nothing, which is precisely why the bug survived to production.
 */
const mockPathname = jest.fn();
jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}));

jest.mock("@/components/about/guide-content", () => ({ AUTHOR: "Qusai" }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Sidebar } = require("@/components/layout/sidebar") as {
  Sidebar: React.ComponentType<{ onNavigate?: () => void }>;
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { MobileNav } = require("@/components/layout/mobile-nav") as {
  MobileNav: React.ComponentType;
};

/** The link the browser would consider current, by its accessible marker. */
function currentLink(): HTMLElement | null {
  return document.querySelector('[aria-current="page"]');
}

describe("the sidebar's current-page marker", () => {
  it("marks the open route when the path carries a trailing slash", () => {
    mockPathname.mockReturnValue("/settings/");
    render(<Sidebar />);

    expect(currentLink()).toHaveTextContent("Settings");
  });

  it("marks exactly one entry, never several", () => {
    mockPathname.mockReturnValue("/session/");
    render(<Sidebar />);

    expect(document.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
  });

  it("still works without the trailing slash, so the fix is not a swap", () => {
    mockPathname.mockReturnValue("/revision");
    render(<Sidebar />);

    expect(currentLink()).toHaveTextContent("Revision");
  });

  it("marks nothing on a route that is not in the navigation", () => {
    mockPathname.mockReturnValue("/some-other-page/");
    render(<Sidebar />);

    expect(currentLink()).toBeNull();
  });

  it("does not treat /session as current while /revision is open", () => {
    mockPathname.mockReturnValue("/revision/");
    render(<Sidebar />);

    expect(currentLink()).not.toHaveTextContent("Memorization");
  });
});

describe("the mobile navigation's current-page marker", () => {
  it("marks the open route when the path carries a trailing slash", () => {
    mockPathname.mockReturnValue("/dashboard/");
    render(<MobileNav />);

    // The mobile bar labels Dashboard as "Home" to fit at 10px.
    expect(currentLink()).toHaveTextContent("Home");
  });

  it("marks exactly one entry", () => {
    mockPathname.mockReturnValue("/analytics/");
    render(<MobileNav />);

    expect(document.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
  });
});

describe("what a screen reader is told", () => {
  it("announces the current page, which it never did before", () => {
    mockPathname.mockReturnValue("/backup/");
    render(<Sidebar />);

    // The visual highlight and the announcement come from the same
    // expression, so they can never disagree — but the announcement is
    // the half nobody would have noticed missing.
    const link = screen.getByRole("link", { name: /Backup/ });
    expect(link).toHaveAttribute("aria-current", "page");
  });
});
