import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BackupMetadataDTO } from "@/shared/dto";

/**
 * The Backup screen's status badge is the only place PHOS tells the
 * user whether their progress is protected. Getting it wrong is worse
 * than showing nothing: a stale backup reported as "up to date" is an
 * assurance the user would act on.
 */
const backupOps = vi.hoisted(() => ({
  listBackups: vi.fn(),
  createBackup: vi.fn(),
  deleteBackup: vi.fn(),
  restoreBackup: vi.fn(),
  exportData: vi.fn(),
  importData: vi.fn(),
  DATA_RESET_CONFIRMATION: "DELETE",
}));

vi.mock("@/client/operations", () => ({ backupOps }));

const { getBackupStatus, createBackup } = await import("@/lib/api/backup");

function backup(overrides: Partial<BackupMetadataDTO> = {}): BackupMetadataDTO {
  return {
    backupId: "backup-1",
    filename: "phos-backup.json",
    createdAt: new Date(2026, 7, 4, 9, 0).toISOString(),
    fileSizeBytes: 245_062,
    applicationVersion: "0.1.0",
    ...overrides,
  };
}

const NOW = new Date(2026, 7, 4, 12, 0);

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  backupOps.listBackups.mockResolvedValue({ backups: [], count: 0 });
});

afterEach(() => {
  vi.useRealTimers();
});

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 86_400_000).toISOString();
}

describe("the status badge", () => {
  it("says never when no backup has ever been taken", async () => {
    const status = await getBackupStatus();

    expect(status.status).toBe("never");
    expect(status.lastBackup).toBeUndefined();
    expect(status.history).toEqual([]);
  });

  it("says up to date within the last week", async () => {
    backupOps.listBackups.mockResolvedValue({
      backups: [backup({ createdAt: daysAgo(6) })],
      count: 1,
    });

    expect((await getBackupStatus()).status).toBe("up_to_date");
  });

  it("says outdated once the newest backup is older than a week", async () => {
    backupOps.listBackups.mockResolvedValue({
      backups: [backup({ createdAt: daysAgo(8) })],
      count: 1,
    });

    expect((await getBackupStatus()).status).toBe("outdated");
  });

  it("judges by the newest backup, not by whichever came back first", async () => {
    // The engine already sorts, but the badge must not depend on that:
    // a single old backup arriving first would otherwise report
    // "outdated" while a fresh one sat in the same list.
    backupOps.listBackups.mockResolvedValue({
      backups: [
        backup({ backupId: "old", createdAt: daysAgo(30) }),
        backup({ backupId: "fresh", createdAt: daysAgo(1) }),
      ],
      count: 2,
    });

    const status = await getBackupStatus();

    expect(status.status).toBe("up_to_date");
    expect(status.history.map((entry) => entry.id)).toEqual(["fresh", "old"]);
  });
});

describe("how a backup is described", () => {
  it("shows a small backup in KB and a large one in MB", async () => {
    backupOps.listBackups.mockResolvedValue({
      backups: [
        backup({ backupId: "small", fileSizeBytes: 245_062 }),
        backup({ backupId: "large", fileSizeBytes: 3_500_000, createdAt: daysAgo(1) }),
      ],
      count: 2,
    });

    const sizes = Object.fromEntries(
      (await getBackupStatus()).history.map((entry) => [entry.id, entry.size]),
    );

    expect(sizes.small).toBe("239 KB");
    expect(sizes.large).toBe("3.3 MB");
  });

  it("labels every backup manual, because PHOS has no scheduler", async () => {
    backupOps.createBackup.mockResolvedValue(backup());

    const entry = await createBackup();

    // Claiming "automatic" would imply a background job that does not
    // exist; every backup in PHOS is one the user asked for, or one
    // taken immediately before a destructive action.
    expect(entry.type).toBe("manual");
    expect(entry.status).toBe("success");
    expect(entry.id).toBe("backup-1");
  });
});
