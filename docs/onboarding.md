# Contributor onboarding

Read [HANDOFF.md](HANDOFF.md), [REIMAGINED.md](REIMAGINED.md), and [VERIFICATION.md](VERIFICATION.md).
The product is complete; this branch is a functioning alternative frontend awaiting
adoption, not a set of unfinished bootstrap sprints.

Prerequisites: Git, Node 24 (see `.nvmrc`), npm 11.

```bash
npm install
npm run dev
npm run gate
```

No environment secrets, Prisma setup, SQLite service, or database URL are needed.
First launch seeds the browser record. Use a different preview port for a clean
onboarding journey. Use `npm run build` and `npm run preview` for production PWA tests.

The editor uses `.editorconfig`, Prettier, and `eslint.config.mjs`. Read the relevant
version-matched Next guide from `node_modules/next/dist/docs` before framework changes.
Business logic belongs to the five engines; components call adapters. Preserve data,
old-compatible absent fields, and the working checkout when making changes.
