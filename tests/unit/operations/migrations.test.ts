import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The once-only guard around a repair that runs on every user's device
 * without being asked for.
 *
 * PHOS stores everything locally, so a corrected rule can only reach
 * existing records here. That makes the guard load-bearing in a way a
 * server migration's would not be: it runs on somebody's only copy of
 * their Hifz, unattended, while they are trying to open the app.
 */
const settingsRepository = vi.hoisted(() => ({
  getSettings: vi.fn(),
  markRevisionBlocksRepaired: vi.fn(),
}));
const memoryEngine = vi.hoisted(() => ({ reblockSeededRevision: vi.fn() }));
const adaptiveEngine = vi.hoisted(() => ({ getMemorizationSequence: vi.fn() }));

vi.mock("@/client/container", () => ({
  container: { settingsRepository, memoryEngine, adaptiveEngine },
}));

const { repairSeededRevisionBlocks } = await import("@/client/operations/migrations");

beforeEach(() => {
  vi.clearAllMocks();
  settingsRepository.getSettings.mockResolvedValue({ revisionBlocksRepairedAt: null });
  settingsRepository.markRevisionBlocksRepaired.mockResolvedValue({});
  adaptiveEngine.getMemorizationSequence.mockResolvedValue([{ id: "p1" }, { id: "p2" }]);
  memoryEngine.reblockSeededRevision.mockResolvedValue(23);
});

describe("when it has not run yet", () => {
  it("repairs, and records that it did", async () => {
    const result = await repairSeededRevisionBlocks();

    expect(result).toEqual({ ran: true, pagesRepaired: 23 });
    expect(settingsRepository.markRevisionBlocksRepaired).toHaveBeenCalledTimes(1);
  });

  it("works along the memorization order, not page order", async () => {
    // Somebody who began at Juz 30 has their Hifz at the end of the
    // Mushaf; page order would build runs across material in an order
    // they never learned it.
    await repairSeededRevisionBlocks();

    expect(adaptiveEngine.getMemorizationSequence).toHaveBeenCalled();
    expect(memoryEngine.reblockSeededRevision).toHaveBeenCalledWith(["p1", "p2"]);
  });

  it("marks itself done even when nothing needed repairing", async () => {
    /*
     * A user who onboarded after the fix already has blocked dates.
     * Re-walking all 604 pages on every launch to rediscover that would
     * be a permanent cost for a one-time problem.
     */
    memoryEngine.reblockSeededRevision.mockResolvedValue(0);

    await repairSeededRevisionBlocks();

    expect(settingsRepository.markRevisionBlocksRepaired).toHaveBeenCalledTimes(1);
  });
});

describe("when it has already run", () => {
  it("does nothing at all", async () => {
    settingsRepository.getSettings.mockResolvedValue({
      revisionBlocksRepairedAt: new Date("2026-08-01"),
    });

    const result = await repairSeededRevisionBlocks();

    expect(result).toEqual({ ran: false, pagesRepaired: 0 });
    expect(memoryEngine.reblockSeededRevision).not.toHaveBeenCalled();
  });
});

describe("when it fails", () => {
  it("never stops the application opening", async () => {
    memoryEngine.reblockSeededRevision.mockRejectedValue(new Error("storage error"));

    await expect(repairSeededRevisionBlocks()).resolves.toEqual({
      ran: false,
      pagesRepaired: 0,
    });
  });

  it("does not mark itself done, so a half-finished repair is retried", async () => {
    /*
     * The difference between "nothing to do" and "could not finish". A
     * repair that stopped halfway must get another attempt on the next
     * launch rather than being skipped forever, which is exactly what
     * marking it here would cause.
     */
    memoryEngine.reblockSeededRevision.mockRejectedValue(new Error("storage error"));

    await repairSeededRevisionBlocks();

    expect(settingsRepository.markRevisionBlocksRepaired).not.toHaveBeenCalled();
  });

  it("survives settings being unreadable", async () => {
    settingsRepository.getSettings.mockRejectedValue(new Error("no database"));

    await expect(repairSeededRevisionBlocks()).resolves.toMatchObject({ ran: false });
  });
});
