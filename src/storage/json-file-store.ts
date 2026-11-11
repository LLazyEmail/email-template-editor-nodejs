import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { createEmptyDb, type DbData } from "./db.types.js";
import type { TemplateStore } from "./template-store.js";

export class StorageError extends Error {
  override name = "StorageError";
}

/** Stores everything in a single JSON file (same format as the previous lowdb db.json). */
export class JsonFileStore implements TemplateStore {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  /** Creates the file with an empty structure if it does not exist yet. */
  async init(): Promise<void> {
    await this.update(() => undefined);
  }

  async read(): Promise<DbData> {
    return this.load();
  }

  update<T>(mutate: (data: DbData) => T | Promise<T>): Promise<T> {
    const run = async () => {
      const data = await this.load();
      const result = await mutate(data);
      await this.save(data);
      return result;
    };
    const next = this.queue.then(run, run);
    // Keep the chain alive even if this update fails.
    this.queue = next.catch(() => undefined);
    return next;
  }

  private async load(): Promise<DbData> {
    let raw: string;
    try {
      raw = await readFile(this.filePath, "utf8");
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return createEmptyDb();
      throw err;
    }

    if (raw.trim() === "") return createEmptyDb();

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      throw new StorageError(`Storage file ${this.filePath} contains invalid JSON`, { cause: err });
    }
    return normalize(parsed);
  }

  private async save(data: DbData): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.${randomUUID()}.tmp`;
    try {
      await writeFile(tmp, JSON.stringify(data, null, 2));
      await rename(tmp, this.filePath);
    } catch (err) {
      await rm(tmp, { force: true });
      throw err;
    }
  }
}

/** Fills in missing collections so older/partial files still load. */
function normalize(parsed: unknown): DbData {
  const empty = createEmptyDb();
  if (typeof parsed !== "object" || parsed === null) return empty;

  const rt = (parsed as { recipeTemplate?: unknown }).recipeTemplate;
  if (typeof rt !== "object" || rt === null || Array.isArray(rt)) return { ...parsed, ...empty };

  const { tree, options } = rt as Partial<DbData["recipeTemplate"]>;
  return {
    ...(parsed as object),
    recipeTemplate: {
      ...rt,
      tree: Array.isArray(tree) ? tree : [],
      options: Array.isArray(options) ? options : [],
    },
  };
}
