import {
  canReadFormat,
  juzNumberForPage,
  MINIMUM_CYCLE_LENGTH_DAYS,
  MAXIMUM_CYCLE_LENGTH_DAYS,
} from "@/shared/constants";
import {
  ConfidenceLevel,
  ExamStatus,
  MemorizationOrder,
  MemorizationLevel,
  MemoryState,
  SessionType,
  WorkloadCategory,
} from "@/shared/types";
import {
  computeChecksum,
  serializeSnapshot,
  type PhosSnapshot,
  type StoredSettings,
} from "@/repositories/browser";

export interface PortablePreview {
  snapshot: PhosSnapshot | null;
  errors: string[];
  warnings: string[];
  exportedAt: string | null;
}

const date = (value: unknown) => typeof value === "string" && Number.isFinite(Date.parse(value));
const nullableDate = (value: unknown) => value === null || date(value);
const id = (value: unknown) => typeof value === "string" && value.length > 0 && value.length <= 200;
const number = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;
const integer = (value: unknown, min: number, max: number) =>
  number(value) && Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
const member = (value: unknown, values: object) => Object.values(values).includes(value);

/** Shared by preview and apply: no row is written before the entire file is checked. */
export async function preparePortableRestore(contents: string): Promise<PortablePreview> {
  const errors: string[] = [];
  const warnings: string[] = [];
  let data: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(contents);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    data = parsed as Record<string, unknown>;
  } catch {
    return { snapshot: null, errors: ["File is not valid JSON."], warnings, exportedAt: null };
  }
  if (typeof data.applicationVersion !== "string")
    errors.push('Missing or invalid "applicationVersion".');
  if (!canReadFormat(data.formatVersion as number | undefined))
    errors.push(
      `Unsupported data format ${String(data.formatVersion)}. Update PHOS before restoring this file.`,
    );
  if (
    data.snapshot !== undefined &&
    (!data.snapshot || typeof data.snapshot !== "object" || Array.isArray(data.snapshot))
  )
    return { snapshot: null, errors: ["Invalid snapshot record."], warnings, exportedAt: null };
  const raw = (data.snapshot ?? data) as Record<string, unknown>;
  for (const name of ["pages", "sessions", "sessionItems", "recallEvents"]) {
    if (!Array.isArray(raw[name])) errors.push(`Missing or invalid "${name}".`);
  }
  if (!raw.settings || typeof raw.settings !== "object" || Array.isArray(raw.settings))
    errors.push('Missing or invalid "settings".');
  for (const name of [
    "pages",
    "sessions",
    "sessionItems",
    "recallEvents",
    "roadmapEntries",
    "exams",
  ]) {
    const rows = raw[name];
    if (
      rows !== undefined &&
      (!Array.isArray(rows) ||
        rows.some((row) => !row || typeof row !== "object" || Array.isArray(row)))
    )
      errors.push(`Invalid records in ${name}.`);
  }
  if (errors.length) return { snapshot: null, errors, warnings, exportedAt: null };
  const settings = raw.settings as StoredSettings;
  const snapshot = raw as unknown as PhosSnapshot;
  // Domain and storage date fields have the same JSON representation. Full replacement
  // retains source ids, so item/event references cannot become foreign-device orphans.
  snapshot.roadmapEntries ??= [];
  snapshot.exams ??= [];
  if (!data.snapshot) {
    if (!data.roadmapEntries)
      warnings.push(
        "This older export has no custom sequence or paused Juz. They cannot be recovered; the restored order uses the default sequence.",
      );
    if (!data.exams)
      warnings.push(
        "This older export has no exams. Exam records on this device will be replaced with an empty exam history.",
      );
    snapshot.settings = {
      dateFormat: "mdy",
      timeFormat: "12h",
      reducedMotion: false,
      compactMode: false,
      sessionShowTimer: true,
      sessionShowProgress: true,
      sessionConfirmCompletion: false,
      revisionShowProgress: true,
      onboardingCompletedAt: null,
      memorizationLevel: "Beginner",
      pagesAlreadyMemorized: 0,
      dailyAvailableMinutes: 30,
      comfortableDailyPages: 1,
      followsExistingSchedule: false,
      revisionStartsImmediately: true,
      memorizationOrder: "Standard",
      ...(settings as Partial<StoredSettings>),
    } as StoredSettings;
    for (const page of snapshot.pages)
      if (page.firstStudiedAt === undefined) page.firstStudiedAt = null;
  }
  const duplicate = (rows: { id: string }[], name: string) => {
    if (
      rows.some((row) => !row || !id(row.id)) ||
      new Set(rows.map((row) => row?.id)).size !== rows.length
    )
      errors.push(`${name} have missing or duplicate identifiers.`);
  };
  const pageIds = new Set(snapshot.pages.map((page) => page?.id));
  const sessionIds = new Set(snapshot.sessions.map((session) => session?.id));
  duplicate(snapshot.pages, "Pages");
  duplicate(snapshot.sessions, "Sessions");
  duplicate(snapshot.sessionItems, "Session items");
  duplicate(snapshot.recallEvents, "Recall events");
  if (
    snapshot.pages.length !== 604 ||
    new Set(snapshot.pages.map((page) => page?.pageNumber)).size !== 604
  )
    errors.push("The file must contain each of the 604 Mushaf pages exactly once.");
  if (
    snapshot.pages.some(
      (page) =>
        !page ||
        !integer(page.pageNumber, 1, 604) ||
        page.juzNumber !== juzNumberForPage(page.pageNumber) ||
        !member(page.memoryState, MemoryState) ||
        !number(page.memoryStrength) ||
        !number(page.memoryStability) ||
        !number(page.difficulty) ||
        !nullableDate(page.firstStudiedAt) ||
        !nullableDate(page.lastReviewedAt) ||
        !nullableDate(page.lastSuccessfulRecallAt) ||
        !date(page.createdAt) ||
        !date(page.updatedAt),
    )
  )
    errors.push("A page has invalid memory values, Juz or dates.");
  if (
    snapshot.sessions.some(
      (session) =>
        !session ||
        !member(session.sessionType, SessionType) ||
        !date(session.startedAt) ||
        !nullableDate(session.completedAt) ||
        !(session.durationSeconds === null || number(session.durationSeconds)) ||
        !date(session.createdAt),
    )
  )
    errors.push("A session has invalid type, duration or dates.");
  if (snapshot.sessions.filter((session) => session?.completedAt === null).length > 1)
    errors.push("The file contains more than one open study session.");
  if (
    snapshot.sessionItems.some(
      (item) =>
        !item ||
        !pageIds.has(item.pageId) ||
        !sessionIds.has(item.sessionId) ||
        !integer(item.order, 0, 604),
    ) ||
    new Set(snapshot.sessionItems.map((item) => `${item?.sessionId}:${item?.pageId}`)).size !==
      snapshot.sessionItems.length
  )
    errors.push("Session items contain invalid or duplicate page references.");
  if (
    snapshot.recallEvents.some(
      (event) =>
        !event ||
        !pageIds.has(event.pageId) ||
        !sessionIds.has(event.sessionId) ||
        !date(event.timestamp) ||
        typeof event.successfulRecall !== "boolean" ||
        !member(event.confidence, ConfidenceLevel) ||
        !number(event.durationSeconds),
    )
  )
    errors.push("A recall event has invalid page/session references, feedback or dates.");
  const prefs = snapshot.settings!;
  if (
    !id(prefs.id) ||
    !["system", "light", "dark"].includes(prefs.theme) ||
    !number(prefs.ayahRotationFrequency) ||
    !integer(prefs.dailyAvailableMinutes, 1, 1440) ||
    !number(prefs.comfortableDailyPages) ||
    prefs.comfortableDailyPages > 604 ||
    !member(prefs.memorizationOrder, MemorizationOrder) ||
    !date(prefs.createdAt) ||
    !date(prefs.updatedAt) ||
    !nullableDate(prefs.onboardingCompletedAt)
  )
    errors.push("The file contains invalid settings.");
  for (const key of [
    "reducedMotion",
    "compactMode",
    "sessionShowTimer",
    "sessionShowProgress",
    "sessionConfirmCompletion",
    "revisionShowProgress",
    "followsExistingSchedule",
    "revisionStartsImmediately",
  ] as const)
    if (typeof prefs[key] !== "boolean") errors.push(`Invalid setting: ${key}.`);
  if (
    !member(prefs.memorizationLevel, MemorizationLevel) ||
    !integer(prefs.pagesAlreadyMemorized, 0, 604) ||
    prefs.comfortableDailyPages <= 0 ||
    prefs.comfortableDailyPages > 20
  )
    errors.push("Invalid onboarding or study pace settings.");
  if (prefs.goalTargetPages != null && !integer(prefs.goalTargetPages, 1, 604))
    errors.push("Invalid goal page target.");
  if (prefs.goalTargetDate != null && !date(prefs.goalTargetDate))
    errors.push("Invalid goal date.");
  if ((prefs.goalTargetPages == null) !== (prefs.goalTargetDate == null))
    errors.push("The goal must contain both a page target and a date.");
  if (prefs.revisionMode !== undefined && !["Adaptive", "Traditional"].includes(prefs.revisionMode))
    errors.push("Invalid revision mode.");
  if (
    prefs.cycleLengthDays !== undefined &&
    !integer(prefs.cycleLengthDays, MINIMUM_CYCLE_LENGTH_DAYS, MAXIMUM_CYCLE_LENGTH_DAYS)
  )
    errors.push("Invalid revision cycle length.");
  if (!["mdy", "dmy"].includes(prefs.dateFormat) || !["12h", "24h"].includes(prefs.timeFormat))
    errors.push("Invalid date or time format.");
  for (const key of [
    "cycleStartedAt",
    "lastExportedAt",
    "revisionBlocksRepairedAt",
    "estimatedDatesRepairedAt",
  ] as const)
    if (prefs[key] != null && !date(prefs[key])) errors.push(`Invalid date: ${key}.`);
  if (!Array.isArray(snapshot.roadmapEntries) || ![0, 30].includes(snapshot.roadmapEntries.length))
    errors.push("The roadmap must contain all 30 Juz, or be absent in an older file.");
  else if (snapshot.roadmapEntries.length) {
    duplicate(snapshot.roadmapEntries, "Roadmap entries");
    if (
      new Set(snapshot.roadmapEntries.map((row) => row.juzNumber)).size !== 30 ||
      new Set(snapshot.roadmapEntries.map((row) => row.position)).size !== 30 ||
      snapshot.roadmapEntries.some(
        (row) =>
          !integer(row.juzNumber, 1, 30) ||
          !integer(row.position, 0, 29) ||
          typeof row.paused !== "boolean",
      )
    )
      errors.push("The custom sequence or paused Juz are invalid.");
  }
  if (!Array.isArray(snapshot.exams)) errors.push("Invalid exam records.");
  else {
    duplicate(snapshot.exams, "Exams");
    if (
      snapshot.exams.some(
        (exam) =>
          !exam ||
          !member(exam.status, ExamStatus) ||
          !(exam.stage === null || integer(exam.stage, 1, 8)) ||
          !Array.isArray(exam.juzNumbers) ||
          !exam.juzNumbers.length ||
          exam.juzNumbers.some((juz) => !integer(juz, 1, 30)) ||
          new Set(exam.juzNumbers).size !== exam.juzNumbers.length ||
          !nullableDate(exam.examDate) ||
          (exam.status === "Scheduled" && exam.examDate === null) ||
          !date(exam.scheduledAt) ||
          !nullableDate(exam.passedAt) ||
          !date(exam.createdAt) ||
          !date(exam.updatedAt) ||
          typeof exam.includeNewMemorization !== "boolean",
      )
    )
      errors.push("An exam contains invalid scope, status or dates.");
  }
  for (const session of snapshot.sessions) {
    if (
      session.studyDraft &&
      (!Array.isArray(session.studyDraft.pageIds) ||
        session.studyDraft.pageIds.some((pageId) => !pageIds.has(pageId)) ||
        !Array.isArray(session.studyDraft.weakPageIds) ||
        session.studyDraft.weakPageIds.some(
          (pageId) => !session.studyDraft!.pageIds.includes(pageId),
        ) ||
        typeof session.studyDraft.paused !== "boolean")
    )
      errors.push("Invalid saved study assignment.");
    const items = session.studyDraft?.items;
    if (
      items !== undefined &&
      (!Array.isArray(items) ||
        items.some(
          (item) =>
            !item ||
            !pageIds.has(item.pageId) ||
            !integer(item.pageNumber, 1, 604) ||
            !member(item.workloadCategory, WorkloadCategory) ||
            !number(item.estimatedDurationSeconds) ||
            !session.studyDraft?.pageIds.includes(item.pageId),
        ))
    )
      errors.push("Invalid committed study items.");
    if (
      session.studyDraft &&
      new Set(session.studyDraft.pageIds).size !== session.studyDraft.pageIds.length
    )
      errors.push("Duplicate pages in a saved assignment.");
    if (
      Array.isArray(items) &&
      (new Set(items.map((item) => item.pageId)).size !== items.length ||
        items.some(
          (item) =>
            snapshot.pages.find((page) => page.id === item.pageId)?.pageNumber !==
              item.pageNumber || !integer(item.recommendedOrder, 0, 603),
        ))
    )
      errors.push("The saved assignment does not match its Mushaf pages.");
  }
  if (data.snapshot) {
    if (
      typeof data.checksum !== "string" ||
      (await computeChecksum(serializeSnapshot(snapshot))) !== data.checksum
    )
      errors.push("The file's integrity checksum does not match its contents.");
  }
  return {
    snapshot: errors.length ? null : snapshot,
    errors: [...new Set(errors)],
    warnings,
    exportedAt: date(data.exportedAt) ? (data.exportedAt as string) : null,
  };
}
