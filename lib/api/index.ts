/**
 * The adapter layer between PHOS's engines and its screens.
 *
 * Each module here takes engine results (`shared/dto`) and reshapes
 * them into the presentation DTOs in `types/dto.ts` that components
 * consume. It was named `lib/api` when the engines were reached over
 * HTTP, and the name is kept because its job did not change when they
 * moved into the browser: it is still the one layer that knows both
 * vocabularies.
 *
 * `client.ts` (`PHOSApiError`, `apiRequest`, `simulateDelay`) and
 * `http.ts` (`apiFetch`) were deleted along with the API they spoke to.
 * Errors now arrive as the engines' own `DomainException`s, which the
 * hooks already handled — they only ever checked `instanceof Error`.
 */
export { getDashboardData } from "./dashboard";
export { getSession, startSession, completeSession, finishSessionLater } from "./session";
export { getRevision, startRevision, completeRevision, finishRevisionLater } from "./revision";
export type { CompletionProgress } from "./activeSession";
export { getAnalytics } from "./analytics";
export { getHistory } from "./history";
export {
  getBackupStatus,
  createBackup,
  deleteBackup,
  restoreBackup,
  exportData,
  importData,
} from "./backup";
export {
  getSettings,
  savePreferences,
  saveTheme,
  resetSettings,
  resetAllData,
  completeOnboarding,
  getRoadmap,
  updateRoadmap,
  getDailyStudyMinutes,
} from "./settings";
