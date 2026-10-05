import { MemoryEngine } from "@/engines/memory";
import {
  BrowserPageRepository,
  BrowserRecallEventRepository,
  BrowserSessionRepository,
  getDatabase,
} from "@/repositories/browser";
import type { RecallOutcome, MemoryUpdateResult } from "@/shared/types";
/** Composition boundary: Memory Engine remains the sole author of every memory change. */
export async function commitBrowserStudy(outcome: RecallOutcome): Promise<MemoryUpdateResult> {
  const db = await getDatabase();
  const tx = db.transaction(["pages", "sessions", "recallEvents", "sessionItems"], "readwrite");
  // Attach rejection handling before any request can abort the transaction.
  const done = tx.done;
  void done.catch(() => undefined);
  try {
    const session = await tx.objectStore("sessions").get(outcome.sessionId);
    if (!session || session.completedAt) throw new Error("The study session is no longer open.");
    if (session.studyDraft && !session.studyDraft.pageIds.includes(outcome.pageId))
      throw new Error("The page is outside this committed assignment.");
    const items = await tx.objectStore("sessionItems").index("sessionId").getAll(outcome.sessionId);
    if (items.some((item) => item.pageId === outcome.pageId))
      throw new Error(
        "This page was already recorded. Reload or retry to continue from saved work.",
      );
    const memory = new MemoryEngine({
      pageRepository: new BrowserPageRepository(tx),
      recallEventRepository: new BrowserRecallEventRepository(tx),
    });
    const result = await memory.applyRecallResult(outcome);
    await new BrowserSessionRepository(tx).addSessionItem({
      sessionId: outcome.sessionId,
      pageId: outcome.pageId,
      order: items.length,
    });
    await done;
    return result;
  } catch (error) {
    try {
      tx.abort();
    } catch {
      /* The request may already have aborted it. */
    }
    await done.catch(() => undefined);
    throw error;
  }
}
