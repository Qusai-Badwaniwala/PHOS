# Development workflow

Read [HANDOFF.md](HANDOFF.md) and [REIMAGINED.md](REIMAGINED.md) first.
Work in an isolated branch/worktree for significant changes. Never clear a user's
browser record to get a clean test fixture; use a new preview port.

```bash
npm install
npm run dev
npm run format
npm run gate
```

`gate` covers formatting, lint, types, Vitest, Jest, production build, and precache
verification. Add a meaningful regression for data integrity or state-transition
repairs. Verify failure before correction where feasible. Avoid tests that merely
repeat presentation implementation. Use real-browser complete journeys in the
production export; `next dev` cannot prove offline behavior or update safety.

```bash
npm run build
npm run preview
```

Validate 320px and 390px phone widths, tablet and desktop adaptations, both themes,
keyboard/focus, reduced motion, reload, export/restore, and waiting updates when
changes affect them. Physical-device claims require physical-device evidence.

For `/PHOS` deployment, set `PHOS_BASE_PATH=/PHOS` while building and running
`scripts/verify-base-path.mjs`. Rebuild without it before serving a root preview.
Do not force dependency downgrades to hide an advisory. Keep durable documentation
aligned with the implementation and state any unresolved validation boundary.
