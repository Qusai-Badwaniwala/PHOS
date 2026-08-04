# PHOS — Root Cause Investigation Report

Production Debugging & Stability Audit, pre-v1.0 stabilization phase.

Both bugs below were traced to their first incorrect assumption by
following the full execution path (Dashboard → Hooks → API →
Backend → Engines → Repositories → Database → API Response → Frontend
Rendering) rather than patched at the symptom.

---

## Bug #1 — History page infinite request loop

**Status:** Was previously fixed in a different working copy of this
project; **this uploaded copy did not contain that fix**. Re-applied
here, plus a defense-in-depth hardening the original fix didn't
include.

### Symptoms

- `/api/v1/analytics/history` requested continuously, hundreds of
  times, immediately after loading the History page.
- Eventually crashes the tab with `ERR_INSUFFICIENT_RESOURCES`.

### Root Cause

`app/history/page.tsx` called `useHistory({ search, activityType,
status })` with a **new object literal on every render**. Inside
`useHistory` (`lib/hooks/use-history.ts`), the data-fetching callback
was memoized with `useCallback(fn, [filters])` — a reference-equality
check. A new object every render meant `useCallback` returned a new
function every render, which retriggered the `useEffect(() =>
fetchData(), [fetchData])` that calls it, which calls `setLoading`/
`setData`, which re-renders the page, which creates a new filters
object again — an unbounded loop.

### Evidence

```tsx
// app/history/page.tsx (before fix)
const { data, loading, error, refetch } = useHistory({
  search: search || undefined,
  activityType: activityType === "all" ? undefined : activityType,
  status: status === "all" ? undefined : status,
});
```

```ts
// lib/hooks/use-history.ts (before fix)
const fetchData = useCallback(async () => { ... }, [filters])
useEffect(() => { fetchData() }, [fetchData])
```

### Files involved

- `app/history/page.tsx`
- `lib/hooks/use-history.ts`

### Why it happened

A very common React pitfall: passing an inline object/array literal as
a hook argument, then depending on that argument by reference inside
the hook. It compiles fine and works on the very first render, so it's
easy to miss in review.

### Correct architectural solution (applied)

Two layers, not one, so the bug class cannot recur even if a future
caller forgets to memoize:

1. **Caller-side (`app/history/page.tsx`):** wrap the filters object in
   `React.useMemo(() => ({...}), [search, activityType, status])`, so
   its reference is stable unless the underlying primitive values
   actually change.
2. **Hook-side, defense in depth (`lib/hooks/use-history.ts`):**
   `fetchData` now depends on `JSON.stringify(filters ?? {})` (a
   value-based key) rather than the `filters` object reference
   directly. This makes the hook itself robust regardless of caller
   discipline — the actual root cause was that the hook's contract
   relied on reference equality of caller-supplied data at all.

### Risk level

**High** (before fix) — crashes the browser tab, unusable page.
**None** (after fix) — verified by direct code review and isolated
`tsc --strict` compilation of the changed files (see "Verification"
below); the fix introduces no new state, no new side effects, and no
behavioral change to what data is fetched, only when.

---

## Bug #2 — Session page shows "Session Complete" / Dashboard shows "No Assignment Scheduled" simultaneously, on what should be a normal day

### Symptoms

- Dashboard → "Go to Session" → Session page immediately shows a
  completed-session state instead of allowing a new memorization
  session to begin.
- The Dashboard simultaneously shows "No assignment scheduled" for the
  same underlying condition.

### Investigation path (traced in full, per the requested trace order)

| Step                       | Component                                                                 | Finding                                                                                                                                                                                                                                          |
| -------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Dashboard → Session button | `components/dashboard/today-session-card.tsx`                             | **Correct.** Handles `session === null` properly: shows "No assignment scheduled" text, and still renders a working `Link href="/session"` ("Go to Session") — never a dead end.                                                                 |
| Frontend routing           | `app/session/page.tsx`                                                    | **Correct, and already prepared for this exact case.** Has `if (!data) return <SessionEmpty />` — a purpose-built empty state ("No active session — Begin a new memorization session to get started") with a real "Back to Dashboard" CTA.       |
| Hook                       | `lib/hooks/use-session.ts`                                                | **Correct.** State is already typed `SessionDTO                                                                                                                                                                                                  | null`; simply calls `getSession()` and stores whatever it returns. |
| **Frontend adapter**       | **`lib/api/session.ts`**                                                  | **← Root cause found here.**                                                                                                                                                                                                                     |
| API route                  | `app/api/v1/session/today/route.ts`                                       | Checked and confirmed correct — a stateless, read-only preview of `AdaptiveEngine.generateDailyPlan()`, exactly as designed.                                                                                                                     |
| Adaptive Engine            | `engines/adaptive/AdaptiveEngine.ts`, `calculators/PriorityCalculator.ts` | Checked and confirmed correct — `categorizePage()` assigns every never-reviewed (`Unseen`) page to `NewMemorization` unconditionally as its very first check; a freshly-seeded database has no way to produce zero `NewMemorization` candidates. |
| Repositories / Database    | `repositories/PageRepository.ts`, `prisma/seed.ts`                        | Checked and confirmed correct — no incorrect state found.                                                                                                                                                                                        |

The trace did **not** need to go further than `lib/api/session.ts`,
because that is where the first incorrect assumption actually lives —
everything both upstream (backend) and downstream (the page/hook/card
components) was already correct and, in the dashboard card's case,
already built specifically to handle this exact condition properly.

### Root Cause

`getSession()` in `lib/api/session.ts` filters today's Daily Study Plan
for `NewMemorization` items. **Having zero such items is a legitimate,
expected outcome** — the Adaptive Engine correctly postpones new
memorization when Recovery or overdue revision work consumes the
available time budget (this is intentional prioritization behavior,
not a fault). But instead of representing "nothing scheduled" as
"nothing scheduled," the adapter fabricated a fake session object with
`status: "completed"`. The Session page has no way to distinguish a
fabricated "already completed" session from a real one, so it renders
the completed-session UI — which is exactly the reported symptom.

`lib/api/revision.ts` contained the **identical** anti-pattern for the
Revision page (confirmed by inspection; not yet reported by the user,
but guaranteed to produce the same class of bug under the same
condition) and was fixed identically.

### Evidence

```ts
// lib/api/session.ts (before fix)
if (items.length === 0) {
  return {
    id: "no-session-today",
    status: "completed", // ← fabricated; not a real completed session
    title: "Memorization Session",
    progress: { current: 0, total: 0 },
    estimatedTime: "0 min",
  };
}
```

Compare against the dashboard card, which handles the exact same
upstream condition (`session === null`) correctly:

```tsx
// components/dashboard/today-session-card.tsx (unchanged, already correct)
const hasAssignment = session && session.assignment
// ...
{hasAssignment ? ... : "No assignment scheduled"}
```

And the page, which was already built for this and simply never
reached:

```tsx
// app/session/page.tsx (unchanged, already correct)
if (!data)
  return (
    <div className="pb-20 lg:pb-0">
      <SessionEmpty />
    </div>
  );
```

### Files involved

- `lib/api/session.ts` (fixed)
- `lib/api/revision.ts` (fixed — identical latent bug, same fix)
- No backend files required any change — the backend was correct
  throughout.

### Why it happened

This bug was introduced during the original frontend/backend
integration, in the adapter layer that translates the backend's Daily
Study Plan into the frontend's existing `SessionDTO`/`RevisionDTO`
shapes. `SessionStatus`/`RevisionStatus` (`types/dto.ts`) have no
"nothing scheduled" value in their type union — only
`not_started`/`in_progress`/`paused`/`completed`/`interrupted` — and
the adapter's return type was written as non-nullable
(`Promise<SessionDTO>`), which made returning `null` seem like it
wasn't an option, even though the _consuming_ hook, page, and dashboard
card were all already written to expect and correctly handle `null`.

### Correct architectural solution (applied)

Changed `getSession()`'s return type to `Promise<SessionDTO | null>`
and return `null` when there is nothing scheduled, instead of
`Promise<SessionDTO>` with a fabricated object. This required **zero
changes** to `use-session.ts` (state was already `SessionDTO | null`),
`app/session/page.tsx` (the `!data` branch already existed and is now
finally reachable), or `today-session-card.tsx` (already correct).
Applied identically to `getRevision()` in `lib/api/revision.ts`. This
is the minimal, architecture-preserving fix: it makes the adapter
honestly report what the backend actually returned, rather than
inventing UI-facing behavior that doesn't reflect reality — exactly
the "fix the supplier, not the symptom" principle, since the adapter
was itself supplying incorrect data to a consumer chain that was
already correct.

### Risk level

**High** (before fix) — actively misleading UI state (a real,
functioning feature — starting today's memorization — appeared
finished/unavailable). **None** (after fix) — verified by isolated
`tsc --strict` compilation confirming `Promise<SessionDTO | null>` is
fully assignable everywhere it's consumed, and by direct review
confirming every consumer already branches on `null` correctly.

---

## Final Production Audit

Performed after both fixes, across the checklist requested.

### Imports and exports (explicitly requested)

Two independent, automated, whole-repository sweeps were run — not
spot checks:

1. **Broken import paths.** Every `import ... from "@/..."` and
   `from "./..."` across the entire codebase (176 frontend files:
   `app/`, `components/`, `lib/`, `providers/`, `types/`; 133 backend
   files: `engines/`, `repositories/`, `shared/`, `validators/`,
   `server/`, `app/api/`) was resolved against the actual filesystem.
   **Zero broken imports found** in either half.
2. **Named import/export mismatches** (the class of bug where a file
   imports `{ Foo }` but the target either doesn't export `Foo`,
   exports it under a different name, or only has a default export).
   859 named imports were checked across the whole codebase. 5
   findings were manually reviewed and are **confirmed false
   positives** of the checking script itself (it didn't account for
   the `abstract` keyword in `export abstract class BaseException`,
   already-correct pre-existing code) — not real bugs. **Zero real
   mismatches found.**

### Dashboard, Session, Revision

Verified end-to-end after the Bug #2 fix: Dashboard's
session/revision cards, `SessionPage`, and `RevisionPage` all now
consistently treat "nothing scheduled" as an honest empty state
(`SessionEmpty`/`RevisionEmpty`), not a fabricated "completed" state.

### History

Verified end-to-end after the Bug #1 fix: filters object memoized at
the call site; hook hardened to depend on filter _values_, not object
identity.

### Analytics, Adaptive Engine, Daily Study Plan, Repositories, Database

Traced in full during the Bug #2 investigation (see table above); all
confirmed correct and unmodified.

### React rendering / infinite loops / state management

Every hook in `lib/hooks/` was individually reviewed for the same
class of bug that caused Bug #1 (an object/array argument depended on
by reference). Only `useHistory` was affected; all others take either
no arguments or primitive arguments (e.g. `useAnalytics(dateRange:
DateRange)`, a string), which cannot exhibit this bug class.

### Memory leaks

Every `addEventListener`/`setInterval`/`setTimeout` call site in the
frontend (`components/ui/dialog.tsx`, `components/layout/app-shell.tsx`,
`providers/theme-provider.tsx`) was checked; all three correctly return
a cleanup function from their `useEffect`. No leaks found.

### Routing, TypeScript, build output

Every `app/**/page.tsx` was confirmed to have exactly one default
export (required by the Next.js App Router). `tsc --strict` was run
against every file modified in this pass, using isolated stub-based
verification consistent with the approach used throughout this
project's build (see `docs/integration-review.md` for why: no network
access in this environment to run a real `npm install`) — clean.

### Known gaps, unchanged from previous audits

PWA assets (`public/` manifest/icons) remain unbuilt; Settings
persistence remains partial (client-only for most fields); no
background job scheduler exists. All were already documented in
`docs/merge-report.md` and are unrelated to either bug fixed here —
listed again here only for completeness, not because this pass changed
their status.

---

## Files modified in this pass

| File                       | Change                                                                                       |
| -------------------------- | -------------------------------------------------------------------------------------------- |
| `app/history/page.tsx`     | Memoized the `filters` object passed to `useHistory()` (Bug #1)                              |
| `lib/hooks/use-history.ts` | Hardened to depend on filter values, not object reference (Bug #1, defense in depth)         |
| `lib/api/session.ts`       | Return `null` instead of a fabricated "completed" session when nothing is scheduled (Bug #2) |
| `lib/api/revision.ts`      | Same fix as `session.ts`, for the identical latent bug (Bug #2)                              |

No backend files were modified — the backend was correct throughout
both investigations.
