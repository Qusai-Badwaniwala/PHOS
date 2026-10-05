# `client/operations`

The operations that used to be `app/api/v1/**/route.ts`.

## What these are

Each function here is one former HTTP endpoint with the HTTP removed.
The boundary is the same: validate the input, call the engines, and map
the result through `shared/mappers`. Subsequent corrections are documented
in `docs/LOGIC-AUDIT.md`. What
is gone is the request parsing, the response envelope, and the status
code — three things that only ever existed because the call crossed a
network.

They are kept as a distinct layer rather than folded into `lib/api/*`
so that the boundary the SDS draws still exists in the code: `lib/api`
adapts engine results into the frontend's presentation DTOs
(`types/dto.ts`), and these decide _what the engines are asked_. A
reviewer comparing this directory against the deleted routes can check
the migration endpoint by endpoint.

## Validation, and what happened to it

The routes validated every field because a request could arrive from
anywhere. In-process, most of that is now the type system's job, and
re-checking a value TypeScript already guarantees is noise.

Validation was kept wherever the value is _not_ compile-time
guaranteed:

- identifiers read back out of `localStorage`, which can be stale or
  edited;
- numbers that originate in a form or in stored settings
  (`availableStudyMinutes`, onboarding answers, page counts);
- the roadmap's Juz sequence, whose completeness rule is a domain rule
  rather than a wire-format rule;
- the Danger Zone's typed confirmation.

Validation was dropped only where the argument is a TypeScript enum or
a typed DTO the compiler already enforces.

## Transaction commands

`client/commit-study.ts` composes existing Memory Engine study calculations with
transaction-bound repositories. `client/commit-setup.ts` does the same for onboarding,
outside work, roadmap commands and one-time repair markers. No engine formula moves
into the presentation layer. A failed command retains the previous complete record.

Record replacement validates first. Restore and progress reset verify a local safety
copy; the separately confirmed full application reset intentionally clears restore
points and returns to onboarding. Only PHOS stores and PHOS assignment/theme keys
are cleared, never origin-wide storage. Other PHOS windows receive a best-effort
record-replacement notification and reload their cached view.

## What was not ported

Five endpoints existed but no PHOS screen ever called them:
`GET /pages`, `GET /pages/juz/{n}`, `GET /pages/{n}`,
`GET /analytics/session/{id}`, and `GET /analytics/progress?type=progress`.
They were part of a public API surface that no longer exists — there is
nothing for an external client to call — so they were removed rather
than carried forward as functions nothing invokes.
