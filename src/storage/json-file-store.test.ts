import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { JsonFileStore, StorageError } from "./json-file-store.js";

describe("JsonFileStore", () => {
  let dir: string;
  let file: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "json-store-"));
    file = path.join(dir, "db.json");
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("init creates the file with an empty structure", async () => {
    await new JsonFileStore(file).init();
    expect(JSON.parse(await readFile(file, "utf8"))).toEqual({
      recipeTemplate: { tree: [], options: [] },
    });
  });

  it("fills in missing collections of an existing file", async () => {
    await writeFile(file, JSON.stringify({ recipeTemplate: { tree: [] } }));
    const data = await new JsonFileStore(file).read();
    expect(data.recipeTemplate.options).toEqual([]);
  });

  it("persists updates and returns the mutator's result", async () => {
    const store = new JsonFileStore(file);
    const result = await store.update((data) => {
      data.recipeTemplate.options.push({ key: "k", title: "t", value: "v" });
      return "done";
    });
    expect(result).toBe("done");
    expect((await new JsonFileStore(file).read()).recipeTemplate.options).toHaveLength(1);
  });

  it("does not write anything when the mutator throws", async () => {
    const store = new JsonFileStore(file);
    await store.init();
    await expect(
      store.update((data) => {
        data.recipeTemplate.options.push({ key: "k", title: "t", value: "v" });
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect((await store.read()).recipeTemplate.options).toEqual([]);
  });

  it("serializes concurrent updates without losing writes", async () => {
    const store = new JsonFileStore(file);
    await Promise.all(
      Array.from({ length: 25 }, (_, i) =>
        store.update((data) => {
          data.recipeTemplate.options.push({ key: String(i), title: "t", value: "v" });
        }),
      ),
    );
    expect((await store.read()).recipeTemplate.options).toHaveLength(25);
    expect((await readdir(dir)).filter((name) => name.endsWith(".tmp"))).toEqual([]);
  });

  it("keeps working after a failed update", async () => {
    const store = new JsonFileStore(file);
    await expect(store.update(() => Promise.reject(new Error("fail")))).rejects.toThrow("fail");
    await store.update((data) => {
      data.recipeTemplate.options.push({ key: "k", title: "t", value: "v" });
    });
    expect((await store.read()).recipeTemplate.options).toHaveLength(1);
  });

  it("raises StorageError for a corrupted file", async () => {
    await writeFile(file, "{not json");
    await expect(new JsonFileStore(file).read()).rejects.toBeInstanceOf(StorageError);
  });
});
