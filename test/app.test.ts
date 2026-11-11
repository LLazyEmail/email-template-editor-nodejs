import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Express } from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createLogger } from "../src/common/logger.js";
import { loadConfig } from "../src/config/env.js";
import type { DbData, TreeNode } from "../src/storage/db.types.js";
import { JsonFileStore } from "../src/storage/json-file-store.js";
import type { TemplateStore } from "../src/storage/template-store.js";

const fixturesDir = path.join(import.meta.dirname, "fixtures");

let dir: string;
let dbFile: string;
let publicDir: string;
let app: Express;

function buildApp(store?: TemplateStore, env: Record<string, string> = {}): Express {
  const config = loadConfig({
    NODE_ENV: "test",
    LOG_LEVEL: "silent",
    DB_FILE: dbFile,
    PUBLIC_DIR: publicDir,
    ...env,
  });
  return createApp({
    config,
    store: store ?? new JsonFileStore(dbFile),
    logger: createLogger(config),
  });
}

async function readDb(): Promise<DbData> {
  return JSON.parse(await readFile(dbFile, "utf8")) as DbData;
}

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "api-test-"));
  dbFile = path.join(dir, "db.json");
  publicDir = path.join(dir, "public");
  const tree = JSON.parse(await readFile(path.join(fixturesDir, "treeDataExample.json"), "utf8"));
  const db: DbData = {
    recipeTemplate: {
      tree,
      options: [{ key: "el-1", title: "{{block}}", value: "<div>block</div>" }],
    },
  };
  await writeFile(dbFile, JSON.stringify(db));
  app = buildApp();
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("GET /health", () => {
  it("returns ok", async () => {
    await request(app).get("/health").expect(200, { status: "ok" });
  });
});

describe("tree", () => {
  it("GET /tree returns the stored tree", async () => {
    const res = await request(app).get("/tree").expect(200);
    expect(res.body[0].key).toBe("0-0");
  });

  it("PUT /tree replaces the tree", async () => {
    const treeData = [{ key: "1", title: "root", value: "<p></p>", children: [] }];
    await request(app).put("/tree").send({ treeData }).expect(204);
    expect((await readDb()).recipeTemplate.tree).toEqual(treeData);
  });

  it("PUT /tree rejects a missing treeData with 400", async () => {
    const res = await request(app).put("/tree").send({}).expect(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details[0]).toMatchObject({ location: "body", path: "treeData" });
  });

  it("PUT /tree rejects duplicate keys with 409", async () => {
    const node = { key: "dup", title: "t", value: "v" };
    await request(app)
      .put("/tree")
      .send({ treeData: [node, node] })
      .expect(409);
  });

  it("POST /tree/nodes adds a child node", async () => {
    const item = { key: "new", title: "{{new}}", value: "N", children: [] };
    const res = await request(app)
      .post("/tree/nodes")
      .send({ parentKey: "0-0-0", item })
      .expect(201);
    expect(res.body).toEqual(item);
    const parent = (await readDb()).recipeTemplate.tree[0]!.children![0]!;
    expect(parent.children!.at(-1)).toEqual(item);
  });

  it("POST /tree/nodes stores a missing child value as an empty string", async () => {
    const item = { key: "new", title: "{{new}}", children: [{ key: "child", title: "{{c}}" }] };
    const res = await request(app).post("/tree/nodes").send({ parentKey: "0-0", item }).expect(201);
    expect(res.body).toEqual({
      key: "new",
      title: "{{new}}",
      value: "",
      children: [{ key: "child", title: "{{c}}", value: "" }],
    });
  });

  it("POST /tree/nodes returns 404 for an unknown parent", async () => {
    const item = { key: "new", title: "t", value: "v" };
    const res = await request(app)
      .post("/tree/nodes")
      .send({ parentKey: "nope", item })
      .expect(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("POST /tree/nodes returns 409 when the key already exists", async () => {
    const item = { key: "0-0-0-0", title: "t", value: "v" };
    await request(app).post("/tree/nodes").send({ parentKey: "0-0", item }).expect(409);
  });

  it("PATCH /tree/nodes/:key updates title and value", async () => {
    await request(app)
      .patch("/tree/nodes/0-0-0-0")
      .send({ title: "{{oneBlock}}", value: "<b>changed</b>" })
      .expect(204);
    const node = (await readDb()).recipeTemplate.tree[0]!.children![0]!.children![0]!;
    expect(node).toMatchObject({ title: "{{oneBlock}}", value: "<b>changed</b>" });
  });

  it("PATCH /tree/nodes/:key handles URL-encoded keys", async () => {
    const key = "2023-03-12T13:59:38.929Z3";
    const item: TreeNode = { key, title: "t", value: "v" };
    await request(app).post("/tree/nodes").send({ parentKey: "0-0", item }).expect(201);
    await request(app)
      .patch(`/tree/nodes/${encodeURIComponent(key)}`)
      .send({ value: "v2" })
      .expect(204);
  });

  it("PATCH /tree/nodes/:key requires at least one field", async () => {
    await request(app).patch("/tree/nodes/0-0-0-0").send({}).expect(400);
  });

  it("PATCH /tree/nodes/:key returns 404 for an unknown node", async () => {
    await request(app).patch("/tree/nodes/nope").send({ value: "x" }).expect(404);
  });

  it("DELETE /tree/nodes/:key removes a node", async () => {
    await request(app).delete("/tree/nodes/0-0-0-2").expect(204);
    const items = (await readDb()).recipeTemplate.tree[0]!.children![0]!;
    expect(items.children!.map((n) => n.key)).toEqual(["0-0-0-0", "0-0-0-1"]);
  });

  it("DELETE /tree/nodes/:key returns 404 for an unknown node", async () => {
    await request(app).delete("/tree/nodes/nope").expect(404);
  });
});

describe("elements", () => {
  it("GET /elements lists elements", async () => {
    const res = await request(app).get("/elements").expect(200);
    expect(res.body).toEqual([{ key: "el-1", title: "{{block}}", value: "<div>block</div>" }]);
  });

  it("POST /elements creates an element and strips unknown fields", async () => {
    const element = { key: "el-2", title: "{{x}}", value: "<i>x</i>" };
    const res = await request(app)
      .post("/elements")
      .send({ ...element, extra: 1 })
      .expect(201);
    expect(res.body).toEqual(element);
    expect((await readDb()).recipeTemplate.options.at(-1)).toEqual(element);
  });

  it("POST /elements returns 409 for a duplicate key", async () => {
    await request(app).post("/elements").send({ key: "el-1", title: "t", value: "v" }).expect(409);
  });

  it("POST /elements returns 400 for an invalid body", async () => {
    const res = await request(app).post("/elements").send({ key: "" }).expect(400);
    expect(res.body.error.details.map((d: { path: string }) => d.path)).toEqual(["key", "title"]);
  });

  it("PATCH /elements/:key updates an element", async () => {
    await request(app).patch("/elements/el-1").send({ value: "<p>new</p>" }).expect(204);
    expect((await readDb()).recipeTemplate.options[0]).toEqual({
      key: "el-1",
      title: "{{block}}",
      value: "<p>new</p>",
    });
  });

  it("PATCH /elements/:key returns 404 for an unknown element", async () => {
    await request(app).patch("/elements/nope").send({ value: "x" }).expect(404);
  });

  it("DELETE /elements/:key removes an element", async () => {
    await request(app).delete("/elements/el-1").expect(204);
    expect((await readDb()).recipeTemplate.options).toEqual([]);
  });

  it("DELETE /elements/:key returns 404 for an unknown element", async () => {
    await request(app).delete("/elements/nope").expect(404);
  });
});

describe("POST /generate", () => {
  it("writes the HTML file and returns a URL that serves it", async () => {
    const res = await request(app).post("/generate").expect(200);
    const url = new URL(res.body.url);
    expect(url.pathname).toBe("/generated/nmtgTemplate.html");

    const expected = await readFile(
      path.join(fixturesDir, "treeDataExample.expected.html"),
      "utf8",
    );
    expect(await readFile(path.join(publicDir, "generated/nmtgTemplate.html"), "utf8")).toBe(
      expected,
    );

    const page = await request(app).get(url.pathname).expect(200);
    expect(page.text).toBe(expected);
  });

  it("returns 422 when the tree is empty", async () => {
    await request(app).put("/tree").send({ treeData: [] }).expect(204);
    const res = await request(app).post("/generate").expect(422);
    expect(res.body.error.code).toBe("TREE_EMPTY");
  });
});

describe("cross-cutting behaviour", () => {
  it("returns a JSON 404 for unknown routes", async () => {
    const res = await request(app).get("/nope").expect(404);
    expect(res.body.error).toMatchObject({
      code: "NOT_FOUND",
      message: "Route GET /nope not found",
    });
  });

  it("generates a request id and includes it in errors", async () => {
    const res = await request(app).get("/nope");
    const id = res.headers["x-request-id"];
    expect(id).toMatch(/^[\w-]{36}$/);
    expect(res.body.error.requestId).toBe(id);
  });

  it("reuses a valid incoming request id", async () => {
    const res = await request(app).get("/health").set("X-Request-Id", "abc-123");
    expect(res.headers["x-request-id"]).toBe("abc-123");
  });

  it("returns 400 INVALID_JSON for a malformed body", async () => {
    const res = await request(app)
      .post("/elements")
      .set("Content-Type", "application/json")
      .send("{bad")
      .expect(400);
    expect(res.body.error.code).toBe("INVALID_JSON");
  });

  it("returns 413 when the body exceeds the limit", async () => {
    const small = buildApp(undefined, { BODY_LIMIT: "1kb" });
    const res = await request(small)
      .post("/elements")
      .send({ key: "k", title: "t", value: "x".repeat(2048) })
      .expect(413);
    expect(res.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it("returns 500 without leaking internals for unexpected errors", async () => {
    const broken: TemplateStore = {
      read: () => Promise.reject(new Error("disk on fire")),
      update: () => Promise.reject(new Error("disk on fire")),
    };
    const res = await request(buildApp(broken, { NODE_ENV: "production" }))
      .get("/tree")
      .expect(500);
    expect(res.body.error).toMatchObject({
      code: "INTERNAL_ERROR",
      message: "Internal server error",
    });
    expect(JSON.stringify(res.body)).not.toContain("disk on fire");
  });

  it("allows CORS and exposes the request id header", async () => {
    const res = await request(app).get("/health").set("Origin", "http://localhost:3000");
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
    expect(res.headers["access-control-expose-headers"]).toContain("X-Request-Id");
  });

  it("restricts CORS to configured origins", async () => {
    const restricted = buildApp(undefined, { CORS_ORIGIN: "http://allowed.test" });
    const res = await request(restricted).get("/health").set("Origin", "http://evil.test");
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
