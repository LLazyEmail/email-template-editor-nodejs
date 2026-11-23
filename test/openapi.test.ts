import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Router, type Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi, type MockInstance } from "vitest";
import { createApp } from "../src/app.js";
import { createLogger } from "../src/common/logger.js";
import { loadConfig } from "../src/config/env.js";
import { buildOpenApiDocument } from "../src/openapi.js";
import { createEmptyDb } from "../src/storage/db.types.js";
import { JsonFileStore } from "../src/storage/json-file-store.js";

const METHODS = ["get", "post", "put", "patch", "delete"] as const;

let dir: string;
let app: Express;
let buildApp: () => Express;

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
  buildApp = () =>
    createApp({ config, store: new JsonFileStore(dbFile), logger: createLogger(config) });
  app = buildApp();
});

interface RouteLayer {
  route?: { path: string; methods: Record<string, boolean> };
  handle: unknown;
}
interface RouterLike {
  stack: RouteLayer[];
}
const isRouter = (handle: unknown): handle is RouterLike =>
  typeof handle === "function" && Array.isArray((handle as Partial<RouterLike>).stack);

/**
 * Lists every route as "METHOD /path" in OpenAPI form (`:key` → `{key}`).
 * Express 5 does not keep a router's mount path, so `use` records which router was mounted where.
 * Reads `router.stack` and `layer.route` (Express internals, unchanged since Express 4): if an
 * Express upgrade changes them, the sanity check in the test below fails instead of passing empty.
 */
function listRoutes(root: RouterLike, use: MockInstance): string[] {
  const mountPath = (parent: RouterLike, child: RouterLike): string => {
    const i = use.mock.calls.findIndex(
      (args, n) => use.mock.contexts[n] === parent && args.includes(child),
    );
    const path: unknown = use.mock.calls[i]?.[0];
    return typeof path === "string" ? path : "/";
  };
  const join = (...parts: string[]) =>
    `/${parts.join("/")}`.replace(/\/+/g, "/").replace(/(.)\/$/, "$1");

  const walk = (router: RouterLike, prefix: string): string[] =>
    router.stack.flatMap((layer) => {
      if (layer.route) {
        const path = join(prefix, layer.route.path).replace(/:(\w+)/g, "{$1}");
        return Object.keys(layer.route.methods).map((method) => `${method.toUpperCase()} ${path}`);
      }
      return isRouter(layer.handle)
        ? walk(layer.handle, join(prefix, mountPath(router, layer.handle)))
        : [];
    });

  return walk(root, "/");
}

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

  it("documents every route the app has (add new routes to buildOpenApiDocument())", () => {
    const use = vi.spyOn(Router.prototype as { use: (...args: unknown[]) => unknown }, "use");
    const routes = listRoutes((buildApp() as unknown as { router: RouterLike }).router, use);

    const { paths } = buildOpenApiDocument();
    const documented = Object.entries(paths).flatMap(([route, item]) =>
      METHODS.filter((m) => m in item).map((m) => `${m.toUpperCase()} ${route}`),
    );

    // Sanity check: an empty or wrong list means Express internals changed, not that all is well.
    expect(routes).toContain("PATCH /tree/nodes/{key}");
    expect(routes.filter((route) => !documented.includes(route))).toEqual([]);
  });
});
