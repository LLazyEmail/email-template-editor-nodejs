import { z } from "zod";
import {
  createElementBodySchema,
  updateElementBodySchema,
} from "./modules/elements/elements.schemas.js";
import {
  addNodeBodySchema,
  saveTreeBodySchema,
  treeNodeSchema,
  updateNodeBodySchema,
} from "./modules/tree/tree.schemas.js";

/**
 * OpenAPI 3.1 description of the REST API, built from the same zod schemas the routers validate
 * with, so the contract cannot drift from the code. Served at GET /openapi.json and committed as
 * openapi.json (`npm run openapi`); a test fails when the committed file is out of date.
 */

const elementSchema = z.object({ key: z.string(), title: z.string(), value: z.string() });

const generateResponseSchema = z.object({
  url: z.string().describe("Absolute URL of the generated HTML file"),
});

const errorResponseSchema = z.object({
  error: z.object({
    code: z.string().describe("Machine-readable code, e.g. VALIDATION_ERROR, NOT_FOUND"),
    message: z.string(),
    details: z.unknown().optional().describe("Validation issues for VALIDATION_ERROR"),
    requestId: z.string().optional().describe("Same as the X-Request-Id response header"),
  }),
});

const healthSchema = z.object({ status: z.literal("ok") });

/** Named schemas; each becomes #/components/schemas/<name>. */
const components = {
  TreeNode: treeNodeSchema,
  Element: elementSchema,
  SaveTreeBody: saveTreeBodySchema,
  AddNodeBody: addNodeBodySchema,
  UpdateNodeBody: updateNodeBodySchema,
  CreateElementBody: createElementBodySchema,
  UpdateElementBody: updateElementBodySchema,
  GenerateResponse: generateResponseSchema,
  ErrorResponse: errorResponseSchema,
  Health: healthSchema,
} satisfies Record<string, z.ZodType>;

type SchemaName = keyof typeof components;

const ref = (name: SchemaName) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema: object) => ({ content: { "application/json": { schema } } });

const ERROR_TEXT = {
  400: "Invalid request (VALIDATION_ERROR, INVALID_JSON)",
  404: "Not found (NOT_FOUND)",
  409: "Key already exists (CONFLICT)",
  413: "Body too large (PAYLOAD_TOO_LARGE)",
  422: "Template tree is empty (TREE_EMPTY)",
} as const;

const errors = (...statuses: (keyof typeof ERROR_TEXT)[]) =>
  Object.fromEntries(
    statuses.map((status) => [
      String(status),
      { description: ERROR_TEXT[status], ...json(ref("ErrorResponse")) },
    ]),
  );

const body = (name: SchemaName) => ({ required: true, ...json(ref(name)) });
const noContent = { "204": { description: "Done" } };

const keyParam = (what: string) => ({
  name: "key",
  in: "path",
  required: true,
  description: `${what} key, URL-encoded`,
  schema: { type: "string", minLength: 1 },
});

function componentSchemas(): Record<string, unknown> {
  const registry = z.registry<{ id: string }>();
  for (const [id, schema] of Object.entries(components)) registry.add(schema, { id });

  const { schemas } = z.toJSONSchema(registry, {
    // Request bodies are the main use; fields with defaults (value: "") are optional on input.
    io: "input",
    uri: (id) => `#/components/schemas/${id}`,
  });

  // OpenAPI component schemas do not carry their own $schema / $id.
  return Object.fromEntries(
    Object.entries(schemas).map(([id, schema]) => {
      const rest: Record<string, unknown> = { ...schema };
      delete rest.$schema;
      delete rest.$id;
      return [id, rest];
    }),
  );
}

export function buildOpenApiDocument() {
  return {
    openapi: "3.1.0",
    info: {
      title: "Email template editor API",
      version: "2.0.0",
      description:
        "Stores the template tree and the library of reusable elements, and renders the tree into one HTML email. Errors always have the ErrorResponse shape.",
    },
    servers: [{ url: "http://localhost:9000", description: "Local development" }],
    paths: {
      "/health": {
        get: {
          summary: "Liveness check",
          responses: { "200": { description: "Up", ...json(ref("Health")) } },
        },
      },
      "/openapi.json": {
        get: {
          summary: "This document",
          responses: { "200": { description: "OpenAPI 3.1 document" } },
        },
      },
      "/tree": {
        get: {
          summary: "Get the whole template tree",
          responses: {
            "200": {
              description: "Root nodes",
              ...json({ type: "array", items: ref("TreeNode") }),
            },
          },
        },
        put: {
          summary: "Replace the whole template tree",
          requestBody: body("SaveTreeBody"),
          responses: { ...noContent, ...errors(400, 409, 413) },
        },
      },
      "/tree/nodes": {
        post: {
          summary: "Add a node under a parent",
          requestBody: body("AddNodeBody"),
          responses: {
            "201": { description: "The added node", ...json(ref("TreeNode")) },
            ...errors(400, 404, 409, 413),
          },
        },
      },
      "/tree/nodes/{key}": {
        parameters: [keyParam("Tree node")],
        patch: {
          summary: "Change a node's title and/or value",
          requestBody: body("UpdateNodeBody"),
          responses: { ...noContent, ...errors(400, 404) },
        },
        delete: {
          summary: "Delete a node and its children",
          responses: { ...noContent, ...errors(404) },
        },
      },
      "/elements": {
        get: {
          summary: "List library elements",
          responses: {
            "200": {
              description: "All elements",
              ...json({ type: "array", items: ref("Element") }),
            },
          },
        },
        post: {
          summary: "Add a library element",
          requestBody: body("CreateElementBody"),
          responses: {
            "201": { description: "The added element", ...json(ref("Element")) },
            ...errors(400, 409, 413),
          },
        },
      },
      "/elements/{key}": {
        parameters: [keyParam("Element")],
        patch: {
          summary: "Change an element's title and/or value",
          requestBody: body("UpdateElementBody"),
          responses: { ...noContent, ...errors(400, 404) },
        },
        delete: {
          summary: "Delete an element",
          responses: { ...noContent, ...errors(404) },
        },
      },
      "/generate": {
        post: {
          summary: "Render the tree into an HTML file and return its URL",
          responses: {
            "200": { description: "Link to the generated file", ...json(ref("GenerateResponse")) },
            ...errors(422),
          },
        },
      },
    },
    components: { schemas: componentSchemas() },
  };
}
