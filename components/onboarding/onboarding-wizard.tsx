"use client";

import React from "react";
import { ContentCard } from "@/components/shared/content-card";
import { Button } from "@/components/ui/button";
import { NumberStepper } from "@/components/ui/number-stepper";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExpectationsPanel } from "./expectations-panel";
import { WELCOME_SUBTITLE, WELCOME_TITLE } from "./onboarding-copy";
import {
  completeOnboarding,
  previewOnboarding,
  type OnboardingAnswers,
  type OnboardingPreview,
} from "@/lib/api/settings";
import { InstallGuide } from "@/components/shared/install-guide";
import { EXAM_LADDER } from "@/shared/constants";
import { TOTAL_JUZ } from "@/shared/types";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  GraduationCap,
  HardDrive,
  Loader2,
  RotateCcw,
  Target,
} from "lucide-react";

const ORDER_LABELS: Record<string, string> = {
  Standard: "Juz 1 → 30 (standard)",
  Juz30First: "Juz 30 first, then 1 → 29",
  ExamOrder: "Exam order — Juz 30 → 26, then 1 → 25",
  Reverse: "Juz 30 → 1 (reverse)",
  Custom: "A custom order I will set myself",
};

/**
 * A second line for orders whose shape is not obvious from the label.
 *
 * `ExamOrder` in particular looks arbitrary until you know it is built
 * around the exam ladder, and somebody who does not intend to sit exams
 * should be able to tell at a glance that it is not for them.
 */
const ORDER_NOTES: Record<string, string> = {
  ExamOrder:
    "Shaped around the exam ladder — the first three exams cover Juz 30, then 28–30, then 26–30, so those come first. Choose this if you intend to sit exams from the start.",
};

/**
 * Memorization pace, offered the way people actually describe it.
 *
 * Asking for "pages per day" forced anyone slower than a page a day to
 * express themselves as a decimal — 0.4 — which is both unnatural and,
 * before the pacing fix, silently rounded up to a full page daily.
 * Internally these are still pages per day; the user never sees a
 * fraction.
 */
const PACE_OPTIONS: readonly { label: string; pagesPerDay: number }[] = [
  { label: "A page every 4 days", pagesPerDay: 0.25 },
  { label: "A page every 3 days", pagesPerDay: 0.33 },
  { label: "A page every 2 days", pagesPerDay: 0.5 },
  { label: "About a page a day", pagesPerDay: 1 },
  { label: "About 2 pages a day", pagesPerDay: 2 },
  { label: "3 pages a day or more", pagesPerDay: 3 },
];

/**
 * Order is asked *before* amount, and that sequence is load-bearing.
 *
 * "Three Juz" only has a page count once PHOS knows which three — Juz
 * 30, 29, 28 for someone starting at the end of the Mushaf, Juz 1, 2, 3
 * for someone starting at the beginning, and those are not the same
 * number of pages. Asking amount first meant the screen had to say
 * "along your chosen order" about a choice two steps in the future, and
 * left the user converting Juz to pages in their head because PHOS
 * could not yet do it for them.
 */
const STEPS = ["Welcome", "Your order", "Your Hifz", "Your pace", "Ready"] as const;

const ORDER_STEP = STEPS.indexOf("Your order");

/**
 * The step that asks how much is already memorized and shows what that
 * answer will record.
 *
 * Named rather than written as a bare index, because the preview is
 * fetched and rendered in two different places and they must agree. The
 * preview was once fetched on the *final* step while being rendered on
 * another, so it was empty every time the user was actually looking at
 * it.
 */
const AMOUNT_STEP = STEPS.indexOf("Your Hifz");
const PACE_STEP = STEPS.indexOf("Your pace");
const READY_STEP = STEPS.indexOf("Ready");

interface OnboardingWizardProps {
  onComplete: () => void;
}

/**
 * The first-run wizard (PRODUCT_REQUIREMENTS Requirement 1), opening
 * with the expectations screen Requirement 6 asks for.
 *
 * The two requirements are deliberately one flow: a user who has just
 * been told what PHOS is not is in exactly the right frame of mind to
 * answer honestly about their own Hifz, and a separate dismissible
 * splash would mostly be clicked past.
 */
export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = React.useState(0);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [preview, setPreview] = React.useState<OnboardingPreview | null>(null);

  const [answers, setAnswers] = React.useState<OnboardingAnswers>({
    memorizationOrder: "Standard",
    juzAlreadyMemorized: 0,
    extraPagesMemorized: 0,
    dailyAvailableMinutes: 30,
    comfortableDailyPages: 0.5,
    followsExistingSchedule: false,
    revisionStartsImmediately: true,
    passedExamStages: [],
  });

  const patch = (update: Partial<OnboardingAnswers>) =>
    setAnswers((current) => ({ ...current, ...update }));

  // Fetched from the order step onward, so the amount step already has
  // its answer rendered rather than flashing in. Re-fetched whenever any
  // of the three inputs changes, so switching order updates the page
  // count in place. A failed preview is silent: it explains the answer
  // rather than producing it — `completeOnboarding` derives the page
  // count itself — so losing it must never block finishing setup.
  const previewing = step === ORDER_STEP || step === AMOUNT_STEP;
  React.useEffect(() => {
    if (!previewing) return;
    let current = true;
    void previewOnboarding(
      answers.memorizationOrder,
      answers.juzAlreadyMemorized,
      answers.extraPagesMemorized,
    )
      .then((result) => {
        if (current) setPreview(result);
      })
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [
    previewing,
    answers.memorizationOrder,
    answers.juzAlreadyMemorized,
    answers.extraPagesMemorized,
  ]);

  const finish = async () => {
    setPending(true);
    setError(null);
    try {
      await completeOnboarding(answers);
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your answers.");
      setPending(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center px-4 py-8">
      <ContentCard className="w-full">
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Step {step + 1} of {STEPS.length} · {STEPS[step]}
          </p>
          <div className="mt-2 flex gap-1" aria-hidden="true">
            {STEPS.map((label, index) => (
              <div
                key={label}
                className={`h-1 flex-1 rounded-full ${index <= step ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
        </div>

        {step === 0 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold">{WELCOME_TITLE}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{WELCOME_SUBTITLE}</p>
            </div>
            <ExpectationsPanel />
          </div>
        )}

        {step === AMOUNT_STEP && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold">How much of that have you already done?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                An estimate is fine. This only sets PHOS&apos;s first picture of where you are — it
                adjusts to how you actually memorize, and nothing here locks you in.
              </p>
            </div>

            {/*
              Asked in Juz because that is how people hold the answer.
              Nobody knows their Hifz as a page count, and Juz are not a
              uniform length, so asking for pages made the user do real
              arithmetic before they could answer at all. PHOS does the
              conversion instead, against the order chosen on the
              previous step, and shows its working below.
            */}
            <div className="space-y-2">
              <label htmlFor="juz-memorized" className="text-sm font-medium">
                Complete Juz memorized
              </label>
              <NumberStepper
                id="juz-memorized"
                value={answers.juzAlreadyMemorized}
                onChange={(juzAlreadyMemorized) => patch({ juzAlreadyMemorized })}
                min={0}
                max={TOTAL_JUZ}
                step={1}
                suffix="Juz"
                aria-label="Complete Juz memorized"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="extra-pages" className="text-sm font-medium">
                And any pages into the next Juz{" "}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <NumberStepper
                id="extra-pages"
                value={answers.extraPagesMemorized}
                onChange={(extraPagesMemorized) => patch({ extraPagesMemorized })}
                min={0}
                max={30}
                step={1}
                suffix="pages"
                aria-label="Extra pages into the next Juz"
              />
              <p className="text-xs text-muted-foreground">
                Leave this at zero if you finished on a Juz boundary.
              </p>
            </div>

            {preview && preview.pagesAlreadyMemorized > 0 && (
              <div className="rounded-md border border-border bg-muted/50 p-4 text-sm">
                <p className="font-medium text-foreground">
                  That comes to{" "}
                  <span className="text-primary">{preview.pagesAlreadyMemorized} pages</span>
                </p>
                <p className="mt-2 text-muted-foreground">
                  PHOS will mark{" "}
                  <span className="font-medium text-foreground">
                    {preview.ranges
                      .map((r) =>
                        r.start === r.end ? `page ${r.start}` : `pages ${r.start}–${r.end}`,
                      )
                      .join(", ")}
                  </span>
                  {preview.juzCovered.length > 0 && <> (Juz {preview.juzCovered.join(", ")})</>} as
                  already memorized, and schedule them for revision rather than as new work.
                </p>
                {preview.nextPage && (
                  <p className="mt-2 text-muted-foreground">
                    Your next new page will be{" "}
                    <span className="font-medium text-foreground">
                      page {preview.nextPage.pageNumber}
                      {preview.nextPage.surah ? ` · ${preview.nextPage.surah}` : ""}
                      {` · Juz ${preview.nextPage.juzNumber}`}
                    </span>
                    .
                  </p>
                )}
              </div>
            )}

            <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">You can change everything here later.</p>
              <p className="mt-1">
                These answers only give PHOS somewhere to start. As you study, it learns from your
                real recall and adjusts — what you tell it today never limits what it expects of you
                later.
              </p>
            </div>
          </div>
        )}

        {step === PACE_STEP && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold">How much time do you have?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                PHOS plans within the time you actually have, rather than assuming an ideal day.
              </p>
            </div>

            {/*
              Exams already passed.

              Recorded here rather than only on the Exams screen because
              somebody arriving with three stages behind them would
              otherwise meet a roadmap that acts as though none of it
              happened — and many will never open a screen they have no
              reason to think concerns them.

              These do not gate or unlock anything. A stage still opens
              on memorization alone; this only stops PHOS being wrong
              about the user's history.
            */}
            <div className="space-y-2">
              <span className="text-sm font-medium">
                Exams you have already passed{" "}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </span>
              <div className="space-y-1.5 rounded-md border border-border p-3">
                {EXAM_LADDER.map((definition) => {
                  const checked = answers.passedExamStages.includes(definition.stage);
                  return (
                    <label key={definition.stage} className="flex items-center gap-2.5 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          patch({
                            passedExamStages: checked
                              ? answers.passedExamStages.filter((n) => n !== definition.stage)
                              : [...answers.passedExamStages, definition.stage].sort(
                                  (a, b) => a - b,
                                ),
                          })
                        }
                      />
                      <span>{definition.label}</span>
                    </label>
                  );
                })}
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Leave these empty if you have not sat any. You can add exams later, with dates, from
                the Exams screen.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="daily-minutes" className="text-sm font-medium">
                Minutes available on a normal day
              </label>
              <NumberStepper
                id="daily-minutes"
                value={answers.dailyAvailableMinutes}
                onChange={(dailyAvailableMinutes) => patch({ dailyAvailableMinutes })}
                min={5}
                max={960}
                step={5}
                suffix="minutes"
                aria-label="Minutes available each day"
              />
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium">How long does one page usually take you?</span>
              <div className="grid gap-2 sm:grid-cols-2">
                {PACE_OPTIONS.map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => patch({ comfortableDailyPages: option.pagesPerDay })}
                    aria-pressed={answers.comfortableDailyPages === option.pagesPerDay}
                    className={`rounded-md border p-3 text-left text-sm transition-colors ${
                      answers.comfortableDailyPages === option.pagesPerDay
                        ? "border-primary bg-accent"
                        : "hover:bg-accent/50"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Half a page a day means PHOS gives you a new page every other day, not half a page
                to stare at. Revision continues every day either way, and this adjusts as PHOS
                learns your real pace.
              </p>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">I already follow a schedule</p>
                <p className="text-xs text-muted-foreground">
                  From a teacher, an institute, or your own plan.
                </p>
              </div>
              <Switch
                checked={answers.followsExistingSchedule}
                onCheckedChange={(followsExistingSchedule) => patch({ followsExistingSchedule })}
                aria-label="I already follow a schedule"
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Start revision straight away</p>
                <p className="text-xs text-muted-foreground">
                  Begin revising what you already know from day one.
                </p>
              </div>
              <Switch
                checked={answers.revisionStartsImmediately}
                onCheckedChange={(revisionStartsImmediately) =>
                  patch({ revisionStartsImmediately })
                }
                aria-label="Start revision straight away"
              />
            </div>
          </div>
        )}

        {step === ORDER_STEP && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold">In what order will you memorize?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Many people begin with Juz 30. Others start at Juz 1, or follow their teacher&apos;s
                plan. You can change this later without losing any progress.
              </p>
            </div>

            <Select
              value={answers.memorizationOrder}
              onValueChange={(memorizationOrder) => patch({ memorizationOrder })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose an order" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ORDER_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {ORDER_NOTES[answers.memorizationOrder] && (
              <p className="text-xs leading-relaxed text-muted-foreground">
                {ORDER_NOTES[answers.memorizationOrder]}
              </p>
            )}
          </div>
        )}

        {step === READY_STEP && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold">You&apos;re ready</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                A few things worth a minute before you begin.
              </p>
            </div>

            {/*
              Installing is a genuine recommendation, not an upsell:
              PHOS's central design argument is that it should fade into
              the background, and its own window with no tabs or address
              bar is the closest a web application gets to that. The
              guide only offers what the current browser can actually
              do.
            */}
            <InstallGuide />

            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <div className="flex gap-3">
                <BookOpen
                  className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-medium">Read the guide when you have a moment</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    The About page holds the whole thinking behind PHOS — why revision is treated as
                    half of memorization, the research the scheduling draws on, what PHOS
                    deliberately refuses to do, and answers to the questions people ask most. It is
                    worth ten minutes, though not today.
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    You will find it in the sidebar under{" "}
                    <span className="font-medium text-foreground">About</span>, whenever you want
                    it.
                  </p>
                </div>
              </div>
            </div>

            {/*
              Said here, on the last screen before someone starts
              trusting PHOS with years of work, rather than only in the
              guide. Someone who never opens About should still know
              where their Hifz record lives and what would erase it —
              telling them afterwards would be too late to be useful.
            */}
            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <div className="flex gap-3">
                <HardDrive
                  className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-medium">Your progress stays on this device</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    PHOS has no accounts and no server. Everything you record is stored in this
                    browser, on this device, and is never sent anywhere — so nobody can see it, and
                    nobody can recover it for you. Clearing this browser&apos;s data would erase it.
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Once you have made progress worth keeping, use{" "}
                    <span className="font-medium text-foreground">Backup → Export</span> to save a
                    file somewhere safe. That file is also how you would move PHOS to a new phone or
                    computer.
                  </p>
                </div>
              </div>
            </div>

            {/*
              Mentioned once, and framed as optional both times.
              Somebody who never sets a goal loses nothing, and an
              opening wizard that presents one as expected would make an
              empty field feel like an unfinished task before the user
              has memorized a single page.
            */}
            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <div className="flex gap-3">
                <Target
                  className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-medium">If you have a goal, you can tell PHOS</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Under <span className="font-medium text-foreground">Settings → Goal</span> you
                    can name the Juz you want memorized and by when — chosen from your own order, so
                    it means what you expect. PHOS will then tell you where your real pace is
                    heading, measured from what you actually do rather than from the answers you
                    gave a moment ago.
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Entirely optional. PHOS schedules exactly the same way with or without one, and
                    it will never chase you about a date.
                  </p>
                </div>
              </div>
            </div>

            {/*
              Exams are mentioned here because the one thing a user must
              know *before* booking one is that PHOS pauses the rest of
              their revision. Discovering that after the fact — a
              Dashboard whose usual revision has simply vanished — reads
              as a fault, and this is the last screen where saying so
              costs nothing.
            */}
            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <div className="flex gap-3">
                <GraduationCap
                  className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-medium">If you sit Hifz exams</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    The Dashboard carries an exam roadmap — Juz 30, then 28–30, then 26–30, and on
                    to the whole Quran. Give one a date and PHOS divides the entire scope evenly
                    across the days remaining, so nothing is left unrevised. You can also set your
                    own exam over any Juz you choose.
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    While an exam is scheduled, PHOS pauses revision outside its scope so nothing
                    competes for your attention, and tells you what fell behind once you mark it
                    passed.
                  </p>
                </div>
              </div>
            </div>

            {/*
              Named here because a student whose teacher sets a Manzil
              cycle will otherwise assume PHOS cannot do what they need
              and stop using it on the first day. Framed as a choice
              rather than a fallback: it is how most Hifz is taught.
            */}
            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <div className="flex gap-3">
                <RotateCcw
                  className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-medium">If you follow a fixed revision cycle</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    By default PHOS chooses your revision each day, putting the pages closest to
                    being forgotten first. If you would rather rotate through everything you have
                    memorized on a set schedule — the way most institutions teach — you can switch
                    to that under{" "}
                    <span className="font-medium text-foreground">
                      Settings → How revision is chosen
                    </span>
                    .
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Either way, new memorization is paced the same. It only changes how revision is
                    picked.
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
        )}

        <div className="mt-8 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => setStep((current) => Math.max(0, current - 1))}
            disabled={step === 0 || pending}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((current) => current + 1)}>
              {step === 0 ? "Get started" : "Continue"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={finish} disabled={pending}>
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {pending ? "Setting up…" : "Start using PHOS"}
            </Button>
          )}
        </div>
      </ContentCard>
    </div>
  );
}
