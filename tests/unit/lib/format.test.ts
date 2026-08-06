import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatDateTime,
  formatTime,
  describeSessionType,
  formatPageList,
} from "@/lib/format";

/**
 * These functions exist because `toLocaleDateString()` renders whatever
 * order the browser's locale prefers, which silently ignored the user's
 * Date Format setting. The tests below pin the chosen order and the
 * clock conversion, since that is the whole point of the setting.
 *
 * A fixed local-time date is used throughout: constructing with
 * component arguments (rather than parsing an ISO string) keeps these
 * assertions independent of the machine's time zone.
 */
const SAMPLE = new Date(2026, 7, 3, 15, 5); // 3 August 2026, 15:05 local

describe("formatDate", () => {
  it("writes month first for mdy", () => {
    expect(formatDate(SAMPLE, "mdy")).toBe("08/03/2026");
  });

  it("writes day first for dmy", () => {
    expect(formatDate(SAMPLE, "dmy")).toBe("03/08/2026");
  });

  it("zero-pads single-digit days and months", () => {
    expect(formatDate(new Date(2026, 0, 9), "dmy")).toBe("09/01/2026");
  });

  it("returns a dash rather than 'Invalid Date' for unparseable input", () => {
    expect(formatDate("not a date")).toBe("—");
  });
});

describe("formatTime", () => {
  it("converts to a 12-hour clock with a suffix", () => {
    expect(formatTime(SAMPLE, "12h")).toBe("3:05 PM");
  });

  it("keeps a 24-hour clock zero-padded", () => {
    expect(formatTime(SAMPLE, "24h")).toBe("15:05");
  });

  it("shows midnight as 12 AM, not 0 AM", () => {
    expect(formatTime(new Date(2026, 7, 3, 0, 30), "12h")).toBe("12:30 AM");
  });

  it("shows noon as 12 PM, not 0 PM", () => {
    expect(formatTime(new Date(2026, 7, 3, 12, 30), "12h")).toBe("12:30 PM");
  });

  it("returns a dash for unparseable input", () => {
    expect(formatTime("not a time")).toBe("—");
  });
});

describe("formatDateTime", () => {
  it("combines both preferences", () => {
    expect(formatDateTime(SAMPLE, "dmy", "24h")).toBe("03/08/2026 15:05");
  });
});

/**
 * How a day's pages are written out.
 *
 * Raised by the product owner: "Completed session" said whether you
 * worked, not on what — and read identically for revision and new
 * memorization. Shared by the Dashboard and History so the same session
 * can never be described two different ways.
 */
describe("formatPageList", () => {
  it("collapses a contiguous run, because eight numbers is a wall of digits", () => {
    expect(formatPageList([582, 583, 584, 585, 586, 587, 588, 589])).toBe("Pages 582–589");
  });

  it("keeps gaps, because a gap is real information about the day", () => {
    expect(formatPageList([1, 4, 7])).toBe("Pages 1, 4, 7");
  });

  it("mixes runs and gaps", () => {
    expect(formatPageList([582, 583, 584, 590])).toBe("Pages 582–584, 590");
  });

  it("uses the singular for one page", () => {
    expect(formatPageList([7])).toBe("Page 7");
  });

  it("sorts and de-duplicates whatever it is given", () => {
    expect(formatPageList([3, 1, 2, 2])).toBe("Pages 1–3");
  });

  it("returns nothing for nothing, so a caller can omit the line", () => {
    expect(formatPageList([])).toBe("");
  });
});

describe("describeSessionType", () => {
  it("calls Sabaq memorization and everything else revision", () => {
    // The distinction the history could not previously make.
    expect(describeSessionType("Sabaq")).toBe("Memorization");
    expect(describeSessionType("Sabqi")).toBe("Revision");
    expect(describeSessionType("Manzil")).toBe("Revision");
    expect(describeSessionType("Recovery")).toBe("Revision");
  });
});
