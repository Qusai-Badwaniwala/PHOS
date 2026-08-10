import { describe, expect, it } from "vitest";
import { APPLICATION_VERSION, EXPORT_FORMAT_VERSION, canReadFormat } from "@/shared/constants";

/**
 * Whether PHOS can still read a file it wrote last month.
 *
 * Restore and import compared `applicationVersion` with `!==`, so every
 * release silently orphaned the previous release's files. Shipping
 * v0.3.0 would have made every v0.2.1 export unimportable and every
 * v0.2.1 restore point unrestorable — including the safety backup PHOS
 * takes automatically before a full reset, whose entire purpose is to
 * make an accidental wipe recoverable.
 *
 * It would have done that in the release that reframes the exported file
 * as the only copy surviving a cleared browser, and says so in a warning
 * on the Backup screen. Promising that and then refusing to read the
 * file is the sharpest possible version of PHOS claiming something
 * untrue.
 *
 * Compatibility is now a property of the data *format*, which changes
 * only when an older file genuinely cannot be read.
 */
describe("reading data written by an older PHOS", () => {
  it("accepts a file with no format version at all", () => {
    // Every file written by v0.1.0 through v0.2.1 — all format 1. This
    // is the case the old check got wrong.
    expect(canReadFormat(undefined)).toBe(true);
  });

  it("accepts the string form backups have always stamped", () => {
    // `SNAPSHOT_FORMAT_VERSION` is "1"; exports use the number 1. One
    // rule reads both so the two cannot drift apart.
    expect(canReadFormat("1")).toBe(true);
    expect(canReadFormat(1)).toBe(true);
  });

  it("accepts the current format", () => {
    expect(canReadFormat(EXPORT_FORMAT_VERSION)).toBe(true);
  });

  it("refuses a file from a future PHOS", () => {
    // Declining is right here: a newer file may rely on something this
    // build does not understand, and importing half of somebody's Hifz
    // is worse than importing none of it.
    expect(canReadFormat(EXPORT_FORMAT_VERSION + 1)).toBe(false);
  });

  it("refuses a value that is not a version at all", () => {
    expect(canReadFormat("not-a-version")).toBe(false);
  });

  /*
   * The guard that keeps the two apart in future. Bumping the
   * application version must never bump the format version by reflex —
   * that reflex is what this whole file exists to prevent — so the
   * format is a small integer that moves on its own schedule and has
   * nothing to do with the release number.
   */
  it("does not track the application version", () => {
    expect(typeof EXPORT_FORMAT_VERSION).toBe("number");
    expect(String(EXPORT_FORMAT_VERSION)).not.toBe(APPLICATION_VERSION);
    expect(APPLICATION_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
