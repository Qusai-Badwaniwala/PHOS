# Infrastructure architecture

PHOS is a **static browser application**. Next 16 exports it to `out/`; React 19
runs its frontend and five engines on the device. There are no API routes, cloud
services, Prisma models, database URLs, or server secrets in the active runtime.

Tailwind 4 defines the independently authored folio system. Radix provides dialog,
select, and tab behavior. Motion provides restrained route continuity. Local font
subsets are bundled into the complete offline cache.

IndexedDB version 2 has pages, sessions, session items, recall events, settings,
roadmap entries, exams, and backups. Portable snapshots cover the seven record
stores; backups are deliberately separate and survive a replacement. Transactional
study composition uses the existing Memory Engine with transaction-bound repositories.

The build emits a content-derived precache manifest. The worker keeps an entire
build together, supports the deployment scope, waits for explicit activation, and
preserves one previous build for existing tabs. Applying an update checks for open
study before reloading the requesting tab.

ESLint flat config, Prettier, TypeScript, Vitest/fake-indexeddb, Jest/Testing Library,
static build, and artifact verification run locally and in CI. GitHub Pages uses
`PHOS_BASE_PATH` and `.nojekyll`. No deployment is implied by a local successful build.
