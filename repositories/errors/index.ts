/**
 * The errors a repository may raise, independent of what is storing the
 * data.
 *
 * `translatePrismaError` used to live here, turning Prisma's error
 * codes into these types. It went with Prisma: IndexedDB reports
 * failures as `DOMException`s that the browser repositories raise as
 * these same types directly, so there is nothing left to translate.
 */
export * from "./EntityNotFoundError";
export * from "./DuplicateEntityError";
export * from "./ConstraintViolationError";
export * from "./DatabaseUnavailableError";
export * from "./PersistenceFailureError";
