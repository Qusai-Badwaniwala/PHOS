import { pagesOps } from "@/client/operations";
import type { LogMemorizedInput, LogMemorizedResult } from "@/client/operations/pages";

export type { LogMemorizedResult };

/**
 * Records memorization the user completed outside PHOS
 * (PRODUCT_REQUIREMENTS Requirement 9).
 *
 * Either specific `pageNumbers` or a `count` of pages taken from the
 * next unstudied entries in the user's memorization order.
 *
 * A pass-through: unlike the other adapters in this directory there is
 * no presentation shape to convert into — the UI shows the three counts
 * exactly as the operation reports them. It stays here so components
 * keep importing from one place.
 */
export async function logMemorizedOutside(input: LogMemorizedInput): Promise<LogMemorizedResult> {
  return pagesOps.logMemorizedOutside(input);
}
