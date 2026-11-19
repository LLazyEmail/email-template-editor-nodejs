import { writeFile } from "node:fs/promises";
import path from "node:path";
import { buildOpenApiDocument } from "../src/openapi.js";

// Regenerates openapi.json from the zod schemas. Run after changing a route or a schema.
const file = path.join(import.meta.dirname, "..", "openapi.json");
await writeFile(file, `${JSON.stringify(buildOpenApiDocument(), null, 2)}\n`);
process.stdout.write(`Wrote ${path.relative(process.cwd(), file)}\n`);
