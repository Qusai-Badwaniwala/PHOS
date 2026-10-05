import { seedIfEmpty } from "@/repositories/browser";
import { runPendingRepairs } from "./operations/migrations";

let opening: Promise<void> | null = null;

/** Settings and the first screen wait for the same seed/repair sequence. Failed
 * storage opens can be retried without presenting defaults as saved choices. */
export function initializeRecord(): Promise<void> {
  if (!opening) {
    opening = seedIfEmpty()
      .then(async () => {
        await runPendingRepairs();
      })
      .catch((error) => {
        opening = null;
        throw error;
      });
  }
  return opening;
}
