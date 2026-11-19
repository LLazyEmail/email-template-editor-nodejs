import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createLogger } from "../src/common/logger.js";
import { loadConfig } from "../src/config/env.js";
import { buildOpenApiDocument } from "../src/openapi.js";
import { createEmptyDb } from "../src/storage/db.types.js";
import { JsonFileStore } from "../src/storage/json-file-store.js";

const METHODS = ["get", "post", "put", "patch", "delete"] as const;

let dir: string;
let app: Express;

beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "openapi-test-"));
  const dbFile = path.join(dir, "db.json");
  await writeFile(dbFile, JSON.stringify(createEmptyDb()));
  const config = loadConfig({
    NODE_ENV: "test",
    LOG_LEVEL: "silent",
    DB_FILE: dbFile,
    PUBLIC_DIR: dir,
  });
  app = createApp({ config, store: new JsonFileStore(dbFile), logger: createLogger(config) });
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("OpenAPI contract", () => {
  it("committed openapi.json is up to date (run `npm run openapi` after changing routes)", async () => {
    const committed = JSON.parse(
      await readFile(path.join(import.meta.dirname, "..", "openapi.json"), "utf8"),
    ) as unknown;

    expect(committed).toEqual(buildOpenApiDocument());
  });

  it("is served at GET /openapi.json", async () => {
    const res = await request(app).get("/openapi.json").expect(200);

    expect(res.body).toEqual(buildOpenApiDocument());
  });

  it("documents only operations the app actually has", async () => {
    const { paths } = buildOpenApiDocument();

    for (const [route, item] of Object.entries(paths)) {
      for (const method of METHODS.filter((m) => m in item)) {
        const url = route.replace("{key}", "missing-key");
        const res = await request(app)[method](url).send({});
        const routeMissing =
          res.status === 404 &&
          String((res.body as { error?: { message?: string } }).error?.message).startsWith(
            "Route ",
          );

        expect(routeMissing, `${method.toUpperCase()} ${route}`).toBe(false);
      }
    }
  });
});
