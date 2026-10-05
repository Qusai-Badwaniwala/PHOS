/**
 * Surah reference data for the standard 604-page Madani Mushaf.
 *
 * WHAT THIS IS, AND IS NOT
 * ------------------------
 * This is *metadata* — surah numbers, names, and the page each one
 * begins and ends on — in exactly the same category as the `juzNumber` already
 * stored on every Page. It contains **no Quran text**, which the schema
 * and the SDS both forbid PHOS from storing as a reader. The five fixed
 * reminder ayahs are separate. Study shows which surah the page belongs
 * to, so "Page 53" means something.
 *
 * WHICH MUSHAF
 * ------------
 * The page numbers below are for the 604-page Madani Mushaf (the King
 * Fahd Complex layout), which is what PHOS models throughout — its 604
 * pages and 30 Juz come from the same edition. A user whose physical
 * copy uses a different pagination will see page numbers that do not
 * match their Mushaf, and that is true of PHOS generally, not just of
 * this table.
 *
 * A cross-check that this data agrees with the rest of the app: An-Naba
 * (surah 78) begins on page 582, and the seeded Page records
 * independently place the start of Juz 30 at page 582.
 *
 * Kept as a constant rather than a database table because it is fixed
 * reference data — it never varies per user and can never be edited, so
 * a table would add a migration and a repository for no gain.
 */

export interface SurahReference {
  readonly number: number;
  /** Transliterated name, e.g. "Al-Baqarah". */
  readonly name: string;
  /** Arabic name, e.g. "البقرة". */
  readonly arabicName: string;
  /** The Mushaf page this surah begins on. */
  readonly startPage: number;
  /** Last printed page containing this surah, verified against Quran.com metadata. */
  readonly endPage: number;
}

/** All 114 surahs. Page spans verified 2026-10-05 from
 * https://api.quran.com/api/v4/chapters?language=en for the same 604-page layout. */
export const SURAHS: readonly SurahReference[] = [
  { number: 1, name: "Al-Fatihah", arabicName: "الفاتحة", startPage: 1, endPage: 1 },
  { number: 2, name: "Al-Baqarah", arabicName: "البقرة", startPage: 2, endPage: 49 },
  { number: 3, name: "Aal-Imran", arabicName: "آل عمران", startPage: 50, endPage: 76 },
  { number: 4, name: "An-Nisa", arabicName: "النساء", startPage: 77, endPage: 106 },
  { number: 5, name: "Al-Ma'idah", arabicName: "المائدة", startPage: 106, endPage: 127 },
  { number: 6, name: "Al-An'am", arabicName: "الأنعام", startPage: 128, endPage: 150 },
  { number: 7, name: "Al-A'raf", arabicName: "الأعراف", startPage: 151, endPage: 176 },
  { number: 8, name: "Al-Anfal", arabicName: "الأنفال", startPage: 177, endPage: 186 },
  { number: 9, name: "At-Tawbah", arabicName: "التوبة", startPage: 187, endPage: 207 },
  { number: 10, name: "Yunus", arabicName: "يونس", startPage: 208, endPage: 221 },
  { number: 11, name: "Hud", arabicName: "هود", startPage: 221, endPage: 235 },
  { number: 12, name: "Yusuf", arabicName: "يوسف", startPage: 235, endPage: 248 },
  { number: 13, name: "Ar-Ra'd", arabicName: "الرعد", startPage: 249, endPage: 255 },
  { number: 14, name: "Ibrahim", arabicName: "إبراهيم", startPage: 255, endPage: 261 },
  { number: 15, name: "Al-Hijr", arabicName: "الحجر", startPage: 262, endPage: 267 },
  { number: 16, name: "An-Nahl", arabicName: "النحل", startPage: 267, endPage: 281 },
  { number: 17, name: "Al-Isra", arabicName: "الإسراء", startPage: 282, endPage: 293 },
  { number: 18, name: "Al-Kahf", arabicName: "الكهف", startPage: 293, endPage: 304 },
  { number: 19, name: "Maryam", arabicName: "مريم", startPage: 305, endPage: 312 },
  { number: 20, name: "Ta-Ha", arabicName: "طه", startPage: 312, endPage: 321 },
  { number: 21, name: "Al-Anbiya", arabicName: "الأنبياء", startPage: 322, endPage: 331 },
  { number: 22, name: "Al-Hajj", arabicName: "الحج", startPage: 332, endPage: 341 },
  { number: 23, name: "Al-Mu'minun", arabicName: "المؤمنون", startPage: 342, endPage: 349 },
  { number: 24, name: "An-Nur", arabicName: "النور", startPage: 350, endPage: 359 },
  { number: 25, name: "Al-Furqan", arabicName: "الفرقان", startPage: 359, endPage: 366 },
  { number: 26, name: "Ash-Shu'ara", arabicName: "الشعراء", startPage: 367, endPage: 376 },
  { number: 27, name: "An-Naml", arabicName: "النمل", startPage: 377, endPage: 385 },
  { number: 28, name: "Al-Qasas", arabicName: "القصص", startPage: 385, endPage: 396 },
  { number: 29, name: "Al-Ankabut", arabicName: "العنكبوت", startPage: 396, endPage: 404 },
  { number: 30, name: "Ar-Rum", arabicName: "الروم", startPage: 404, endPage: 410 },
  { number: 31, name: "Luqman", arabicName: "لقمان", startPage: 411, endPage: 414 },
  { number: 32, name: "As-Sajdah", arabicName: "السجدة", startPage: 415, endPage: 417 },
  { number: 33, name: "Al-Ahzab", arabicName: "الأحزاب", startPage: 418, endPage: 427 },
  { number: 34, name: "Saba", arabicName: "سبأ", startPage: 428, endPage: 434 },
  { number: 35, name: "Fatir", arabicName: "فاطر", startPage: 434, endPage: 440 },
  { number: 36, name: "Ya-Sin", arabicName: "يس", startPage: 440, endPage: 445 },
  { number: 37, name: "As-Saffat", arabicName: "الصافات", startPage: 446, endPage: 452 },
  { number: 38, name: "Sad", arabicName: "ص", startPage: 453, endPage: 458 },
  { number: 39, name: "Az-Zumar", arabicName: "الزمر", startPage: 458, endPage: 467 },
  { number: 40, name: "Ghafir", arabicName: "غافر", startPage: 467, endPage: 476 },
  { number: 41, name: "Fussilat", arabicName: "فصلت", startPage: 477, endPage: 482 },
  { number: 42, name: "Ash-Shura", arabicName: "الشورى", startPage: 483, endPage: 489 },
  { number: 43, name: "Az-Zukhruf", arabicName: "الزخرف", startPage: 489, endPage: 495 },
  { number: 44, name: "Ad-Dukhan", arabicName: "الدخان", startPage: 496, endPage: 498 },
  { number: 45, name: "Al-Jathiyah", arabicName: "الجاثية", startPage: 499, endPage: 502 },
  { number: 46, name: "Al-Ahqaf", arabicName: "الأحقاف", startPage: 502, endPage: 506 },
  { number: 47, name: "Muhammad", arabicName: "محمد", startPage: 507, endPage: 510 },
  { number: 48, name: "Al-Fath", arabicName: "الفتح", startPage: 511, endPage: 515 },
  { number: 49, name: "Al-Hujurat", arabicName: "الحجرات", startPage: 515, endPage: 517 },
  { number: 50, name: "Qaf", arabicName: "ق", startPage: 518, endPage: 520 },
  { number: 51, name: "Adh-Dhariyat", arabicName: "الذاريات", startPage: 520, endPage: 523 },
  { number: 52, name: "At-Tur", arabicName: "الطور", startPage: 523, endPage: 525 },
  { number: 53, name: "An-Najm", arabicName: "النجم", startPage: 526, endPage: 528 },
  { number: 54, name: "Al-Qamar", arabicName: "القمر", startPage: 528, endPage: 531 },
  { number: 55, name: "Ar-Rahman", arabicName: "الرحمن", startPage: 531, endPage: 534 },
  { number: 56, name: "Al-Waqi'ah", arabicName: "الواقعة", startPage: 534, endPage: 537 },
  { number: 57, name: "Al-Hadid", arabicName: "الحديد", startPage: 537, endPage: 541 },
  { number: 58, name: "Al-Mujadila", arabicName: "المجادلة", startPage: 542, endPage: 545 },
  { number: 59, name: "Al-Hashr", arabicName: "الحشر", startPage: 545, endPage: 548 },
  { number: 60, name: "Al-Mumtahanah", arabicName: "الممتحنة", startPage: 549, endPage: 551 },
  { number: 61, name: "As-Saff", arabicName: "الصف", startPage: 551, endPage: 552 },
  { number: 62, name: "Al-Jumu'ah", arabicName: "الجمعة", startPage: 553, endPage: 554 },
  { number: 63, name: "Al-Munafiqun", arabicName: "المنافقون", startPage: 554, endPage: 555 },
  { number: 64, name: "At-Taghabun", arabicName: "التغابن", startPage: 556, endPage: 557 },
  { number: 65, name: "At-Talaq", arabicName: "الطلاق", startPage: 558, endPage: 559 },
  { number: 66, name: "At-Tahrim", arabicName: "التحريم", startPage: 560, endPage: 561 },
  { number: 67, name: "Al-Mulk", arabicName: "الملك", startPage: 562, endPage: 564 },
  { number: 68, name: "Al-Qalam", arabicName: "القلم", startPage: 564, endPage: 566 },
  { number: 69, name: "Al-Haqqah", arabicName: "الحاقة", startPage: 566, endPage: 568 },
  { number: 70, name: "Al-Ma'arij", arabicName: "المعارج", startPage: 568, endPage: 570 },
  { number: 71, name: "Nuh", arabicName: "نوح", startPage: 570, endPage: 571 },
  { number: 72, name: "Al-Jinn", arabicName: "الجن", startPage: 572, endPage: 573 },
  { number: 73, name: "Al-Muzzammil", arabicName: "المزمل", startPage: 574, endPage: 575 },
  { number: 74, name: "Al-Muddaththir", arabicName: "المدثر", startPage: 575, endPage: 577 },
  { number: 75, name: "Al-Qiyamah", arabicName: "القيامة", startPage: 577, endPage: 578 },
  { number: 76, name: "Al-Insan", arabicName: "الإنسان", startPage: 578, endPage: 580 },
  { number: 77, name: "Al-Mursalat", arabicName: "المرسلات", startPage: 580, endPage: 581 },
  { number: 78, name: "An-Naba", arabicName: "النبأ", startPage: 582, endPage: 583 },
  { number: 79, name: "An-Nazi'at", arabicName: "النازعات", startPage: 583, endPage: 584 },
  { number: 80, name: "Abasa", arabicName: "عبس", startPage: 585, endPage: 585 },
  { number: 81, name: "At-Takwir", arabicName: "التكوير", startPage: 586, endPage: 586 },
  { number: 82, name: "Al-Infitar", arabicName: "الانفطار", startPage: 587, endPage: 587 },
  { number: 83, name: "Al-Mutaffifin", arabicName: "المطففين", startPage: 587, endPage: 589 },
  { number: 84, name: "Al-Inshiqaq", arabicName: "الانشقاق", startPage: 589, endPage: 589 },
  { number: 85, name: "Al-Buruj", arabicName: "البروج", startPage: 590, endPage: 590 },
  { number: 86, name: "At-Tariq", arabicName: "الطارق", startPage: 591, endPage: 591 },
  { number: 87, name: "Al-A'la", arabicName: "الأعلى", startPage: 591, endPage: 592 },
  { number: 88, name: "Al-Ghashiyah", arabicName: "الغاشية", startPage: 592, endPage: 592 },
  { number: 89, name: "Al-Fajr", arabicName: "الفجر", startPage: 593, endPage: 594 },
  { number: 90, name: "Al-Balad", arabicName: "البلد", startPage: 594, endPage: 594 },
  { number: 91, name: "Ash-Shams", arabicName: "الشمس", startPage: 595, endPage: 595 },
  { number: 92, name: "Al-Layl", arabicName: "الليل", startPage: 595, endPage: 596 },
  { number: 93, name: "Ad-Duha", arabicName: "الضحى", startPage: 596, endPage: 596 },
  { number: 94, name: "Ash-Sharh", arabicName: "الشرح", startPage: 596, endPage: 596 },
  { number: 95, name: "At-Tin", arabicName: "التين", startPage: 597, endPage: 597 },
  { number: 96, name: "Al-Alaq", arabicName: "العلق", startPage: 597, endPage: 597 },
  { number: 97, name: "Al-Qadr", arabicName: "القدر", startPage: 598, endPage: 598 },
  { number: 98, name: "Al-Bayyinah", arabicName: "البينة", startPage: 598, endPage: 599 },
  { number: 99, name: "Az-Zalzalah", arabicName: "الزلزلة", startPage: 599, endPage: 599 },
  { number: 100, name: "Al-Adiyat", arabicName: "العاديات", startPage: 599, endPage: 600 },
  { number: 101, name: "Al-Qari'ah", arabicName: "القارعة", startPage: 600, endPage: 600 },
  { number: 102, name: "At-Takathur", arabicName: "التكاثر", startPage: 600, endPage: 600 },
  { number: 103, name: "Al-Asr", arabicName: "العصر", startPage: 601, endPage: 601 },
  { number: 104, name: "Al-Humazah", arabicName: "الهمزة", startPage: 601, endPage: 601 },
  { number: 105, name: "Al-Fil", arabicName: "الفيل", startPage: 601, endPage: 601 },
  { number: 106, name: "Quraysh", arabicName: "قريش", startPage: 602, endPage: 602 },
  { number: 107, name: "Al-Ma'un", arabicName: "الماعون", startPage: 602, endPage: 602 },
  { number: 108, name: "Al-Kawthar", arabicName: "الكوثر", startPage: 602, endPage: 602 },
  { number: 109, name: "Al-Kafirun", arabicName: "الكافرون", startPage: 603, endPage: 603 },
  { number: 110, name: "An-Nasr", arabicName: "النصر", startPage: 603, endPage: 603 },
  { number: 111, name: "Al-Masad", arabicName: "المسد", startPage: 603, endPage: 603 },
  { number: 112, name: "Al-Ikhlas", arabicName: "الإخلاص", startPage: 604, endPage: 604 },
  { number: 113, name: "Al-Falaq", arabicName: "الفلق", startPage: 604, endPage: 604 },
  { number: 114, name: "An-Nas", arabicName: "الناس", startPage: 604, endPage: 604 },
];

/**
 * The surah a page is read as belonging to.
 *
 * A page can carry the end of one surah and the beginning of the next —
 * page 604 alone starts three. The surah that *begins latest* on or
 * before the page is returned, which is the one a reader is moving into
 * and the one they would name if asked what they are on.
 *
 * Use `surahsOnPage()` when the full picture matters.
 */
export function primarySurahForPage(pageNumber: number): SurahReference | null {
  let match: SurahReference | null = null;
  for (const surah of SURAHS) {
    if (surah.startPage <= pageNumber) match = surah;
    else break;
  }
  return match;
}

/** Every surah that begins on this page, in order. Usually empty or one; three at most. */
export function surahsStartingOnPage(pageNumber: number): readonly SurahReference[] {
  return SURAHS.filter((surah) => surah.startPage === pageNumber);
}

/**
 * Every surah any part of which falls on this page.
 *
 * Some surahs end on the page before the next begins; others share a
 * boundary page. Use the actual end page, not an assumed overlap.
 * This is what makes short-surah pages usable: page 602 returns
 * Quraysh, Al-Ma'un and Al-Kawthar, which is how a person would
 * describe that day's work — nobody memorizes two-thirds of a page.
 */
export function surahsOnPage(pageNumber: number): readonly SurahReference[] {
  return SURAHS.filter((surah) => surah.startPage <= pageNumber && pageNumber <= surah.endPage);
}

/**
 * True when a page carries several surahs, i.e. where naming the page
 * alone is a poor description of the work.
 *
 * Twelve pages of Juz 30 hold two or three surahs each. Elsewhere in
 * the Mushaf a page is almost always a fragment of one long surah,
 * where the page number *is* the natural unit.
 */
export function isSurahDensePage(pageNumber: number): boolean {
  return surahsOnPage(pageNumber).length > 1;
}

/** Total pages in the Madani Mushaf PHOS models. */
export const TOTAL_MUSHAF_PAGES = 604;

/**
 * Juz boundaries, as the last page number belonging to each Juz
 * (index 0 = Juz 1).
 *
 * Publicly documented reference structure describing how the 604
 * printed pages divide across the 30 Juz — not Quran text and not
 * derived data. Juz 1 is conventionally 21 pages (Al-Fatihah plus the
 * opening of Al-Baqarah), most are 20, and Juz 30 is 23, totalling
 * exactly 604.
 *
 * Lives here rather than in `prisma/seed.ts` so the server seed and the
 * browser's first-run seeding read the same table. Two copies of a
 * boundary map is exactly the kind of duplication that drifts silently.
 */
export const JUZ_END_PAGE: readonly number[] = [
  21, 41, 61, 81, 101, 121, 141, 161, 181, 201, 221, 241, 261, 281, 301, 321, 341, 361, 381, 401,
  421, 441, 461, 481, 501, 521, 541, 561, 581, 604,
];

/** Which Juz a page belongs to. Throws rather than guess for an out-of-range page. */
export function juzNumberForPage(pageNumber: number): number {
  const juzIndex = JUZ_END_PAGE.findIndex((endPage) => pageNumber <= endPage);
  if (juzIndex === -1) {
    throw new Error(`Page number ${pageNumber} falls outside the known Juz boundaries.`);
  }
  return juzIndex + 1;
}

/**
 * A short label for a page range, e.g. "Al-Baqarah" or
 * "An-Naba – Al-Fajr" when the range crosses surahs.
 */
export function surahLabelForRange(startPage: number, endPage: number): string {
  const first = primarySurahForPage(startPage);
  const last = primarySurahForPage(endPage);
  if (!first) return "";
  if (!last || first.number === last.number) return first.name;
  return `${first.name} – ${last.name}`;
}
