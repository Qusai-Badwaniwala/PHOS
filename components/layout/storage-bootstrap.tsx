"use client";

import { useEffect } from "react";
import { ensurePersistentStorage } from "@/client/storage";
import { seedIfEmpty } from "@/repositories/browser";
import { migrationOps } from "@/client/operations";

/**
 * The two things PHOS has to do once, before the user's first action.
 *
 * 1. Ask the browser to keep the data. See `client/storage.ts` for why
 *    the default — "clear it whenever convenient" — is the wrong policy
 *    for a Hifz record.
 * 2. Open and seed the database, so the 604 pages of the Mushaf exist
 *    before any screen asks for them.
 * 3. Run any outstanding one-time repair to data an older version of
 *    PHOS wrote. Everything is stored on the user's own device, so a
 *    corrected rule can only reach existing records here — there is no
 *    server to migrate and no reasonable way to ask people to delete
 *    their Hifz and start again.
 *
 * Neither blocks rendering. Seeding is idempotent and every repository
 * awaits the same connection promise, so a screen that loads first
 * simply waits for the same work rather than racing it — this component
 * only starts it earlier than the first screen would.
 *
 * Kept as its own client component so `app/layout.tsx` stays a server
 * component; making the whole layout a client component to run two
 * effects would push every page's shell into the client bundle.
 */
export function StorageBootstrap() {
  useEffect(() => {
    void ensurePersistentStorage();
    // Seeding first: a repair reads pages, so they must exist. Both are
    // idempotent and both swallow their own failures, so neither can
    // stop a screen rendering.
    void seedIfEmpty().then(() => migrationOps.runPendingRepairs());
  }, []);

  return null;
}
