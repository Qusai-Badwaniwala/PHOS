import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SETTINGS, hookResult } from "../support/pageFixtures";
import type { BackupStatusDTO } from "@/types/dto";

/**
 * The three screens that are not driven by a study plan.
 *
 * Settings and Backup both hold destructive controls, so what matters
 * here is that neither renders those controls before it knows what the
 * user's real state is — a Danger Zone shown over default settings, or
 * a restore picker shown over an unread backup list, invites a click
 * the user cannot take back.
 */
const useBackup = jest.fn();
const useSettings = jest.fn();

jest.mock("@/lib/hooks/use-backup", () => ({ useBackup: () => useBackup() }));
jest.mock("@/providers/settings-provider", () => ({ useSettings: () => useSettings() }));
// The theme selector reads the applied theme from `ThemeProvider`,
// which lives in the root layout rather than on any page.
jest.mock("@/providers/theme-provider", () => ({
  useTheme: () => ({ theme: "system", setTheme: jest.fn() }),
}));

jest.mock("@/lib/api/backup", () => ({
  createBackup: jest.fn(),
  deleteBackup: jest.fn(),
  restoreBackup: jest.fn(),
  exportData: jest.fn(),
  importData: jest.fn(),
  downloadJson: jest.fn(),
}));
jest.mock("@/lib/api/settings", () => ({
  DATA_RESET_CONFIRMATION: "DELETE",
  resetAllData: jest.fn(),
  resetSettings: jest.fn(),
  getRoadmap: jest.fn().mockResolvedValue({
    order: "Standard",
    juzSequence: [1, 2, 3],
    pausedJuz: [],
    entries: [{ juzNumber: 1, position: 0, paused: false }],
  }),
  updateRoadmap: jest.fn(),
}));
jest.mock("@/lib/api/activeSession", () => ({ clearAllAssignments: jest.fn() }));
// Reads browser install capabilities jsdom does not model.
jest.mock("@/components/shared/install-guide", () => ({ InstallGuide: () => null }));
// Reads `navigator.storage`, absent in jsdom.
jest.mock("@/client/storage", () => ({
  readStorageReport: jest
    .fn()
    .mockResolvedValue({ persistence: "persistent", usageBytes: 245062, quotaBytes: null }),
}));

/* eslint-disable @typescript-eslint/no-require-imports */
const BackupPage = require("@/app/backup/page").default as React.ComponentType;
const SettingsPage = require("@/app/settings/page").default as React.ComponentType;
const AboutPage = require("@/app/about/page").default as React.ComponentType;
/* eslint-enable @typescript-eslint/no-require-imports */

const BACKUP_STATUS: BackupStatusDTO = {
  status: "up_to_date",
  lastBackup: "08/04/2026 9:00 AM",
  lastExport: "08/04/2026 9:05 AM",
  neverExported: false,
  history: [
    {
      id: "backup-1",
      date: "08/04/2026 9:00 AM",
      type: "manual",
      size: "239 KB",
      status: "success",
    },
  ],
};

function readySettings() {
  return {
    settings: SETTINGS,
    ready: true,
    updatePreferences: jest.fn(),
    setTheme: jest.fn(),
    reload: jest.fn(),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  useSettings.mockReturnValue(readySettings());
  useBackup.mockReturnValue(hookResult({ data: BACKUP_STATUS }));
});

describe("Backup page", () => {
  it("renders a skeleton while the backup list is loading", () => {
    useBackup.mockReturnValue(hookResult({ loading: true }));

    const { container } = render(<BackupPage />);

    expect(container).not.toBeEmptyDOMElement();
    expect(screen.queryByRole("heading", { name: "Backup & Restore" })).not.toBeInTheDocument();
  });

  it("offers a retry when the list cannot be read", async () => {
    const user = userEvent.setup();
    const refetch = jest.fn();
    useBackup.mockReturnValue({ ...hookResult({ error: new Error("boom") }), refetch });

    render(<BackupPage />);
    await user.click(screen.getByRole("button", { name: /try again|retry/i }));

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("tells the user where their data lives, alongside the tools that protect it", async () => {
    render(<BackupPage />);

    expect(screen.getByRole("heading", { name: "Backup & Restore" })).toBeInTheDocument();
    // The limitation is stated on the screen where the user is already
    // thinking about losing data, not only in the guide.
    expect(await screen.findByText(/stored in this browser, on this device/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Export" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Import" })).toBeInTheDocument();
  });

  it("renders with no backups yet, without pretending one exists", () => {
    useBackup.mockReturnValue(
      hookResult({
        data: { status: "never", history: [], neverExported: true } as BackupStatusDTO,
      }),
    );

    render(<BackupPage />);

    expect(screen.getByText("No backups to restore from")).toBeInTheDocument();
  });
});

describe("Settings page", () => {
  it("waits on a skeleton rather than showing defaults as if they were saved", () => {
    // A failed or slow read leaves `ready` false. Rendering the real
    // controls would briefly present PHOS's defaults as the user's own
    // choices — and put a Danger Zone under them.
    useSettings.mockReturnValue({ ...readySettings(), ready: false });

    render(<SettingsPage />);

    expect(screen.queryByRole("heading", { name: "Settings" })).not.toBeInTheDocument();
    expect(screen.queryByText("Danger Zone")).not.toBeInTheDocument();
  });

  it("renders every section once settings have loaded", () => {
    render(<SettingsPage />);

    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    for (const section of ["Appearance", "Session", "Revision", "Danger Zone"]) {
      expect(screen.getAllByText(section).length).toBeGreaterThan(0);
    }
  });

  it("persists a preference the moment it is toggled", async () => {
    const user = userEvent.setup();
    const updatePreferences = jest.fn();
    useSettings.mockReturnValue({ ...readySettings(), updatePreferences });

    render(<SettingsPage />);
    await user.click(screen.getByRole("switch", { name: /reduced motion/i }));

    // Sent as a patch of one field, so two quick changes cannot clobber
    // each other.
    expect(updatePreferences).toHaveBeenCalledWith({ reducedMotion: true });
  });
});

describe("About page", () => {
  it("renders the guide, the credit and the install section", () => {
    render(<AboutPage />);

    expect(screen.getByRole("heading", { name: "About PHOS" })).toBeInTheDocument();
    expect(screen.getAllByText(/By Qusai/).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Using PHOS as an app" })).toBeInTheDocument();
  });

  it("still states plainly where the data lives and what erases it", () => {
    render(<AboutPage />);

    // Requirement: no misleading wording. The privacy claim and its
    // cost travel together.
    expect(screen.getByText(/a database inside your own browser/)).toBeInTheDocument();
    expect(screen.getByText(/clearing this browser's site data erases it/i)).toBeInTheDocument();
  });

  it("keeps the first-run expectations reachable, as Requirement 6 asks", () => {
    render(<AboutPage />);

    expect(screen.getByRole("heading", { name: /What PHOS is — and isn't/ })).toBeInTheDocument();
  });
});
