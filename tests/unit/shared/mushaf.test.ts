import { describe, expect, it } from "vitest";
import {
  primarySurahForPage,
  SURAHS,
  surahLabelForRange,
  surahsStartingOnPage,
} from "@/shared/constants";

/**
 * Guards on the Surah reference table.
 *
 * Wrong Quran metadata is worse than none: a user told to open
 * "Al-Baqarah" who finds something else loses trust in every other
 * number PHOS shows them. These check the table's internal consistency
 * and its agreement with the rest of the application.
 */
describe("Surah reference data", () => {
  it("has all 114 surahs, numbered 1 to 114 in order", () => {
    expect(SURAHS).toHaveLength(114);
    SURAHS.forEach((surah, index) => {
      expect(surah.number).toBe(index + 1);
    });
  });

  it("never goes backwards through the Mushaf", () => {
    for (let i = 1; i < SURAHS.length; i += 1) {
      expect(SURAHS[i]!.startPage).toBeGreaterThanOrEqual(SURAHS[i - 1]!.startPage);
    }
  });

  it("stays inside the 604-page Mushaf PHOS models", () => {
    expect(SURAHS[0]!.startPage).toBe(1);
    for (const surah of SURAHS) {
      expect(surah.startPage).toBeGreaterThanOrEqual(1);
      expect(surah.startPage).toBeLessThanOrEqual(604);
    }
  });

  it("gives every surah both a transliterated and an Arabic name", () => {
    for (const surah of SURAHS) {
      expect(surah.name.trim().length).toBeGreaterThan(0);
      // Arabic block, so a missing translation cannot pass as one.
      expect(surah.arabicName).toMatch(/[؀-ۿ]/);
    }
  });

  it("agrees with the seeded Juz boundaries", () => {
    // Independent cross-check: the Page records place the start of
    // Juz 30 at page 582, and An-Naba (78) opens Juz 30. If either
    // dataset were wrong, these would disagree.
    const anNaba = SURAHS.find((surah) => surah.number === 78);
    expect(anNaba?.startPage).toBe(582);

    // Likewise Al-Fatihah and Al-Baqarah anchor the first pages.
    expect(primarySurahForPage(1)?.name).toBe("Al-Fatihah");
    expect(primarySurahForPage(2)?.name).toBe("Al-Baqarah");
  });
});

describe("primarySurahForPage", () => {
  it("names the surah a reader is moving into", () => {
    // Al-Baqarah runs 2–49; Aal-Imran opens on 50. Page 53 is inside
    // Aal-Imran, which is precisely the context "Page 53" alone fails
    // to give.
    expect(primarySurahForPage(49)?.name).toBe("Al-Baqarah");
    expect(primarySurahForPage(53)?.name).toBe("Aal-Imran");
    expect(primarySurahForPage(604)?.name).toBe("An-Nas");
  });

  it("returns the latest surah to begin when several share a page", () => {
    // Page 604 opens Al-Ikhlas, Al-Falaq and An-Nas.
    expect(surahsStartingOnPage(604)).toHaveLength(3);
    expect(primarySurahForPage(604)?.number).toBe(114);
  });

  it("returns null below the first page rather than guessing", () => {
    expect(primarySurahForPage(0)).toBeNull();
  });
});

describe("surahLabelForRange", () => {
  it("names a single surah when the range stays inside it", () => {
    expect(surahLabelForRange(3, 10)).toBe("Al-Baqarah");
    expect(surahLabelForRange(50, 60)).toBe("Aal-Imran");
  });

  it("names both ends when the range crosses surahs", () => {
    expect(surahLabelForRange(582, 593)).toBe("An-Naba – Al-Fajr");
  });
});
