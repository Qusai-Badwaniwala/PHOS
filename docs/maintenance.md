# Maintenance and recovery

Your record lives in this browser's IndexedDB. Local restore points are verified
snapshots kept in the same storage; an exported file held elsewhere is the only
copy that survives clearing that browser's data.

Use More → Protect your record to export, preview a file restore, create a local
restore point, or restore one. File restore is full replacement, with a verified
safety copy and atomic write. It never merges history. The safety copy remains
available below the file-restore section. Compatible legacy files are accepted and
show warnings for information absent from their older format.

Reset progress is guarded by typed confirmation. It creates a verified safety copy,
then clears study/exams and resets all pages in one transaction. Settings, roadmap,
and local backups remain recoverable. Reset settings is a separate action; export
first if you want to preserve a copy of current preferences too.

New releases are checked on launch, foreground return, restored connection and at
ten-minute intervals while visible. Updates wait until Apply update is chosen. An active study blocks activation and
can be resumed. Keep a connection until the offline shell is saved. Offline setup
failure offers Retry; there is no need to clear site data or delete personal history.

For an engineering issue, inspect the browser/preview logs and run `npm run gate`.
Read [VERIFICATION.md](VERIFICATION.md) for known toolchain and device boundaries.
Do not recommend Prisma commands or `.env` changes: they belong to historical builds.
