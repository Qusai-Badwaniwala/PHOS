"use client";
import React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { NumberStepper } from "@/components/ui/number-stepper";
import { Switch } from "@/components/ui/switch";
import { ExpectationsPanel } from "./expectations-panel";
import {
  completeOnboarding,
  previewOnboarding,
  type OnboardingAnswers,
  type OnboardingPreview,
} from "@/lib/api/settings";
import { EXAM_LADDER, withBasePath } from "@/shared/constants";
import { TOTAL_JUZ } from "@/shared/types";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
const ORDERS = [
  ["Standard", "From the beginning", "Juz 1 → 30"],
  ["Juz30First", "Begin with Juz 30", "Then Juz 1 → 29"],
  ["ExamOrder", "Follow the exam ladder", "Juz 30 → 26, then 1 → 25"],
  ["Reverse", "From the end", "Juz 30 → 1"],
  ["Custom", "My own order", "Start with 1 → 30; arrange it in Settings"],
] as const;
const PACES = [
  [0.25, "A page every 4 days"],
  [0.33, "A page every 3 days"],
  [0.5, "A page every 2 days"],
  [1, "About a page a day"],
  [2, "About 2 pages a day"],
  [3, "3 pages a day or more"],
] as const;
const STEPS = ["Welcome", "Your order", "Your Hifz", "Your pace", "Ready"];
export function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = React.useState(0);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [preview, setPreview] = React.useState<OnboardingPreview | null>(null);
  const heading = React.useRef<HTMLHeadingElement>(null);
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
  React.useEffect(() => {
    window.scrollTo(0, 0);
    heading.current?.focus({ preventScroll: true });
  }, [step]);
  React.useEffect(() => {
    let current = true;
    void previewOnboarding(
      answers.memorizationOrder,
      answers.juzAlreadyMemorized,
      answers.extraPagesMemorized,
    )
      .then((result) => {
        if (current) setPreview(result);
      })
      .catch(() => {
        if (current) setPreview(null);
      });
    return () => {
      current = false;
    };
  }, [answers.memorizationOrder, answers.juzAlreadyMemorized, answers.extraPagesMemorized]);
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
  const title = [
    "Keep what you know.",
    "Where will you begin?",
    "What do you already hold?",
    "Make room for your Hifz.",
    "Your starting point is ready.",
  ][step];
  return (
    <div className="mx-auto max-w-4xl px-5 pt-8 pb-36 sm:px-10 sm:pt-14">
      <header className="mb-8 flex items-center justify-between">
        <span className="folio-title text-xl tracking-[.06em]">PHOS</span>
        <span className="text-muted-foreground text-sm">
          {step + 1} / 5 · {STEPS[step]}
        </span>
      </header>
      <div className="mb-10 flex gap-2" aria-hidden="true">
        {STEPS.map((label, i) => (
          <span key={label} className={`h-px flex-1 ${i <= step ? "bg-primary" : "bg-border"}`} />
        ))}
      </div>
      <div className="onboarding-step" key={step}>
        {step === 0 && (
          <Image
            src={withBasePath("/icons/icon-192.png")}
            width={96}
            height={96}
            alt="PHOS — an open book within an arch"
            className="mb-7 rounded-xl"
            priority
          />
        )}
        <h1
          ref={heading}
          tabIndex={-1}
          className="folio-title text-3xl leading-tight outline-none sm:text-4xl"
        >
          {title}
        </h1>
        {step === 0 && (
          <div className="mt-6 space-y-7">
            <p className="text-muted-foreground max-w-xl text-lg">
              A quiet companion for memorization and retention. Open your Mushaf. PHOS helps you
              choose what to learn, what to revisit, and what needs care.
            </p>
            <div className="grid gap-5 border-y py-6 sm:grid-cols-3">
              {[
                ["Sabaq", "Your next new pages."],
                ["Sabaqi", "Keep recent pages close."],
                ["Manzil", "Return to what you know."],
              ].map(([label, copy]) => (
                <div key={label}>
                  <h2 className="font-serif text-xl">{label}</h2>
                  <p className="text-muted-foreground mt-1 text-sm">{copy}</p>
                </div>
              ))}
            </div>
            <p className="text-muted-foreground text-sm">
              Use a 604-page Madinah / Misri Mushaf. Your record stays on this device. No account or
              connection is needed after installation.
            </p>
            <details>
              <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">
                What PHOS can help with
              </summary>
              <ExpectationsPanel className="mt-4" />
            </details>
          </div>
        )}
        {step === 1 && (
          <div className="mt-6 space-y-5">
            <p className="text-muted-foreground">
              Choose the order you follow, including your teacher’s plan. You can change future
              scheduling without losing learned pages.
            </p>
            <div className="divide-y border-y">
              {ORDERS.map(([value, label, note]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => patch({ memorizationOrder: value })}
                  aria-pressed={answers.memorizationOrder === value}
                  className={`flex min-h-20 w-full items-center justify-between gap-4 px-3 py-4 text-left transition-colors ${answers.memorizationOrder === value ? "bg-accent" : "hover:bg-muted"}`}
                >
                  <span>
                    <span className="block font-medium">{label}</span>
                    <span className="text-muted-foreground mt-1 block text-sm">{note}</span>
                  </span>
                  {answers.memorizationOrder === value && (
                    <Check size={18} className="text-primary" />
                  )}
                </button>
              ))}
            </div>
            {answers.memorizationOrder === "ExamOrder" && (
              <p className="text-muted-foreground text-sm">
                The first three exams cover Juz 30, then 28–30, then 26–30. This order begins with
                those Juz.
              </p>
            )}
            {answers.memorizationOrder === "Custom" && (
              <p className="text-muted-foreground text-sm">
                For setup, your existing Hifz will be counted from Juz 1. You can arrange all 30 Juz
                in Settings → Roadmap afterward. Choose a preset here if it better describes your
                existing Hifz.
              </p>
            )}
          </div>
        )}
        {step === 2 && (
          <div className="mt-6 space-y-7">
            <p className="text-muted-foreground">
              Count complete Juz along the order you just chose, then any pages into the next. PHOS
              will begin with this estimate and learn from your recall.
            </p>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="juz-memorized" className="mb-2 block font-medium">
                  Complete Juz memorized
                </label>
                <NumberStepper
                  id="juz-memorized"
                  value={answers.juzAlreadyMemorized}
                  onChange={(value) => patch({ juzAlreadyMemorized: value })}
                  min={0}
                  max={TOTAL_JUZ}
                  step={1}
                  suffix="Juz"
                  aria-label="Complete Juz memorized"
                />
              </div>
              <div>
                <label htmlFor="extra-pages" className="mb-2 block font-medium">
                  Pages into the next Juz
                </label>
                <NumberStepper
                  id="extra-pages"
                  value={answers.extraPagesMemorized}
                  onChange={(value) => patch({ extraPagesMemorized: value })}
                  min={0}
                  max={30}
                  step={1}
                  suffix="pages"
                  aria-label="Extra pages into the next Juz"
                />
              </div>
            </div>
            {preview && (
              <div className="border-primary border-l-2 pl-5" aria-live="polite">
                <p className="font-serif text-2xl">
                  {preview.pagesAlreadyMemorized} pages already memorized
                </p>
                {preview.ranges.length > 0 && (
                  <p className="text-muted-foreground mt-2 text-sm">
                    {preview.ranges
                      .map((r) =>
                        r.start === r.end ? `Page ${r.start}` : `Pages ${r.start}–${r.end}`,
                      )
                      .join(", ")}{" "}
                    · Juz {preview.juzCovered.join(", ")}
                  </p>
                )}
                {preview.nextPage && (
                  <p className="mt-3 text-sm">
                    Next new page: {preview.nextPage.pageNumber} · {preview.nextPage.surah} · Juz{" "}
                    {preview.nextPage.juzNumber}
                  </p>
                )}
              </div>
            )}
            <p className="text-muted-foreground text-sm">
              This seeds your starting record. Changing the roadmap later changes future
              assignments; it does not replace this starting record.
            </p>
          </div>
        )}
        {step === 3 && (
          <div className="mt-6 space-y-7">
            <p className="text-muted-foreground">
              Use the time you actually have on a normal day. Revision continues between new pages.
            </p>
            <div>
              <label htmlFor="daily-minutes" className="mb-2 block font-medium">
                Minutes available on a normal day
              </label>
              <NumberStepper
                id="daily-minutes"
                value={answers.dailyAvailableMinutes}
                onChange={(value) => patch({ dailyAvailableMinutes: value })}
                min={5}
                max={960}
                step={5}
                suffix="minutes"
                aria-label="Minutes available each day"
              />
            </div>
            <fieldset>
              <legend className="mb-3 font-medium">How long does one page usually take you?</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {PACES.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={answers.comfortableDailyPages === value}
                    onClick={() => patch({ comfortableDailyPages: value })}
                    className={`min-h-12 rounded-md border px-4 py-3 text-left text-sm transition-colors ${answers.comfortableDailyPages === value ? "border-primary bg-accent" : "hover:bg-muted"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-muted-foreground mt-3 text-sm">
                A page every two days gives you one whole page every other day. PHOS adapts from
                your actual study.
              </p>
            </fieldset>
            <div className="folio-row">
              <div>
                <p className="font-medium">I already follow a schedule</p>
                <p className="text-muted-foreground text-sm">
                  From a teacher, an institute, or your own plan.
                </p>
              </div>
              <Switch
                checked={answers.followsExistingSchedule}
                onCheckedChange={(value) => patch({ followsExistingSchedule: value })}
                aria-label="I already follow a schedule"
              />
            </div>
            <div className="folio-row">
              <div>
                <p className="font-medium">Start revision straight away</p>
                <p className="text-muted-foreground text-sm">
                  Revisit your existing Hifz from day one.
                </p>
              </div>
              <Switch
                checked={answers.revisionStartsImmediately}
                onCheckedChange={(value) => patch({ revisionStartsImmediately: value })}
                aria-label="Start revision straight away"
              />
            </div>
            <details>
              <summary className="min-h-11 cursor-pointer py-3 font-medium">
                Exams you have already passed · optional
              </summary>
              <div className="mt-2 divide-y">
                {EXAM_LADDER.map((definition) => (
                  <label key={definition.stage} className="flex min-h-12 items-center gap-3 py-3">
                    <input
                      type="checkbox"
                      checked={answers.passedExamStages.includes(definition.stage)}
                      onChange={() =>
                        patch({
                          passedExamStages: answers.passedExamStages.includes(definition.stage)
                            ? answers.passedExamStages.filter((stage) => stage !== definition.stage)
                            : [...answers.passedExamStages, definition.stage].sort((a, b) => a - b),
                        })
                      }
                    />
                    <span className="text-sm">{definition.label}</span>
                  </label>
                ))}
              </div>
              <p className="text-muted-foreground mt-3 text-sm">
                You can add past exams with dates from Exams later.
              </p>
            </details>
          </div>
        )}
        {step === 4 && (
          <div className="mt-6 space-y-7">
            <p className="text-muted-foreground">
              PHOS will protect what you already know while making room for new memorization.
            </p>
            <dl className="divide-y border-y">
              {[
                ["Starting Hifz", `${preview?.pagesAlreadyMemorized ?? 0} pages`],
                [
                  "Memorization order",
                  ORDERS.find((order) => order[0] === answers.memorizationOrder)?.[1] ??
                    answers.memorizationOrder,
                ],
                ["Daily time", `${answers.dailyAvailableMinutes} minutes`],
                [
                  "Starting pace",
                  PACES.find((pace) => pace[0] === answers.comfortableDailyPages)?.[1] ?? "",
                ],
                [
                  "Revision",
                  answers.revisionStartsImmediately ? "From day one" : "After new study",
                ],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 py-4">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-right font-medium">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="text-muted-foreground text-sm">
              Today brings your next assignment into focus. My Hifz holds your overview and study
              record. Exams has the ladder and your own exams. More holds Settings, backups, and the
              guide.
            </p>
            <details>
              <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">
                Revision choices, goals, and exams
              </summary>
              <div className="text-muted-foreground mt-3 space-y-4 text-sm">
                <p>
                  Adaptive revision chooses pages that need attention. You can choose a traditional
                  fixed cycle in Settings → Revision. New memorization uses the same pacing in
                  either mode.
                </p>
                <p>
                  A goal is optional. Choose a target and date in Settings → Goal. PHOS estimates
                  from your observed pace after about a week, without changing your schedule to
                  chase the date.
                </p>
                <p>
                  A scheduled exam covers its scope across the remaining days and pauses ordinary
                  revision outside it. After you mark it passed, PHOS explains what needs attention.
                </p>
              </div>
            </details>
            <h2 className="border-t pt-5 text-base font-semibold">
              Your progress stays on this device
            </h2>
            <p className="text-muted-foreground text-sm">
              Clearing this browser&apos;s data would erase it. Protect your record with an exported
              file. Device backups alone cannot recover data if this browser’s storage is cleared.
            </p>
            {error && (
              <p role="alert" className="text-destructive">
                {error}
              </p>
            )}
          </div>
        )}
      </div>
      <footer className="chrome fixed inset-x-0 bottom-0 z-20 border-t px-5 pt-4 pb-[max(20px,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <Button
            variant="ghost"
            onClick={() => setStep((current) => current - 1)}
            disabled={step === 0 || pending}
          >
            <ArrowLeft size={16} className="mr-2" />
            Back
          </Button>
          {step < 4 ? (
            <Button onClick={() => setStep((current) => current + 1)}>
              {step === 0 ? "Get started" : "Continue"}
              <ArrowRight size={16} className="ml-3" />
            </Button>
          ) : (
            <Button disabled={pending} onClick={() => void finish()}>
              {pending ? "Setting up…" : "Start using PHOS"}
              <ArrowRight size={16} className="ml-3" />
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
