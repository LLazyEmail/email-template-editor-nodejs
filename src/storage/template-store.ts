import type { DbData } from "./db.types.js";

/**
 * Persistence port. Services depend on this interface only, so the JSON file
 * implementation can be swapped for SQLite/Postgres without touching them.
 */
export interface TemplateStore {
  /** Returns a snapshot of the data. Mutating it has no effect on storage. */
  read(): Promise<DbData>;
  /**
   * Runs `mutate` against the current data and persists the result atomically.
   * Updates are serialized, so concurrent calls never lose writes.
   * The value returned by `mutate` is passed through. If `mutate` throws, nothing is written.
   */
  update<T>(mutate: (data: DbData) => T | Promise<T>): Promise<T>;
}
