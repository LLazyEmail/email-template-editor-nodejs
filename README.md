# email-template-editor-nodejs

REST API for the [LLazyEmail email template editor](https://github.com/LLazyEmail/email-template-editor-reactjs).
It stores a tree of template parts and reusable elements, and renders the tree into a single HTML email.

Stack: Node 22, TypeScript (strict), Express 5, zod, pino, Vitest + Supertest.

## Quick start

```bash
npm install
cp .env.example .env   # optional, defaults work out of the box
npm run dev            # http://localhost:9000, hot reload, pretty logs
```

| Script              | What it does                               |
| ------------------- | ------------------------------------------ |
| `npm run dev`       | Run from sources with hot reload (`tsx`)   |
| `npm run build`     | Compile to `dist/`                         |
| `npm start`         | Run the compiled server (`dist/server.js`) |
| `npm test`          | Unit + HTTP integration tests (Vitest)     |
| `npm run typecheck` | `tsc --noEmit`                             |
| `npm run lint`      | ESLint                                     |
| `npm run format`    | Prettier (`format:check` is used in CI)    |

## Architecture

```
HTTP request
  → middleware: helmet → cors → request-id → pino-http → json body → static files
  → router        (src/modules/*/*.router.ts)      routes + zod validation
  → controller    (src/modules/*/*.controller.ts)  HTTP only: read req, write res
  → service       (src/modules/*/*.service.ts)     business rules, throws AppError
  → store         (src/storage/template-store.ts)  persistence interface
                   └ JsonFileStore                 db.json, atomic + serialized writes
  → not-found → error-handler                      one JSON error format for everything
```

```
src/
  server.ts            bootstrap, graceful shutdown (SIGTERM/SIGINT)
  app.ts               createApp({ config, store, logger }): middleware chain
  routes.ts            composition root: store → services → controllers → routers
  config/env.ts        environment variables, validated with zod
  common/              errors, logger, middleware (request-id, validate, not-found, error-handler)
  storage/             TemplateStore interface + JsonFileStore
  modules/
    tree/              template tree CRUD
    elements/          reusable elements CRUD
    generate/          tree → HTML rendering
test/                  HTTP integration tests + fixtures
```

Dependencies are passed through constructors and wired in `routes.ts`, so every layer can be tested in isolation and the store can be swapped (for example for SQLite or Postgres) by implementing `TemplateStore`.

## Configuration

| Variable      | Default       | Description                                                      |
| ------------- | ------------- | ---------------------------------------------------------------- |
| `PORT`        | `9000`        | HTTP port                                                        |
| `DB_FILE`     | `./db.json`   | JSON storage file (created if missing)                           |
| `PUBLIC_DIR`  | `./public`    | Static files; generated templates go to `<PUBLIC_DIR>/generated` |
| `CORS_ORIGIN` | `*`           | `*` or a comma-separated list of allowed origins                 |
| `BODY_LIMIT`  | `50mb`        | Max JSON body size                                               |
| `LOG_LEVEL`   | `info`        | `fatal` … `trace`, or `silent`                                   |
| `NODE_ENV`    | `development` | `development` enables pretty logs and stack traces in 500 errors |

Invalid values stop the server at startup with a clear message.

## API

| Method | Path               | Body                       | Success                     | Errors        |
| ------ | ------------------ | -------------------------- | --------------------------- | ------------- |
| GET    | `/health`          | –                          | 200 `{ "status": "ok" }`    |               |
| GET    | `/tree`            | –                          | 200 `TreeNode[]`            |               |
| PUT    | `/tree`            | `{ treeData: TreeNode[] }` | 204                         | 400, 409      |
| POST   | `/tree/nodes`      | `{ parentKey, item }`      | 201 `TreeNode`              | 400, 404, 409 |
| PATCH  | `/tree/nodes/:key` | `{ title?, value? }`       | 204                         | 400, 404      |
| DELETE | `/tree/nodes/:key` | –                          | 204                         | 404           |
| GET    | `/elements`        | –                          | 200 `Element[]`             |               |
| POST   | `/elements`        | `{ key, title, value }`    | 201 `Element`               | 400, 409      |
| PATCH  | `/elements/:key`   | `{ title?, value? }`       | 204                         | 400, 404      |
| DELETE | `/elements/:key`   | –                          | 204                         | 404           |
| POST   | `/generate`        | –                          | 200 `{ "url": "http://…" }` | 422           |

`TreeNode` is `{ key, title, value, children?: TreeNode[] }` and `Element` is `{ key, title, value }`. All fields are strings. Keys in paths must be URL-encoded.

`POST /generate` renders the tree (each child's `title` placeholder inside its parent's `value` is replaced with the child's rendered value), writes it to `<PUBLIC_DIR>/generated/nmtgTemplate.html` and returns its URL.

### Errors

Every error uses the same shape. `requestId` matches the `X-Request-Id` response header and the server logs.

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "location": "body",
        "path": "title",
        "message": "Invalid input: expected string, received undefined"
      }
    ],
    "requestId": "8d466a15-a7bb-4aa8-8a46-35eb14f97905"
  }
}
```

| Status | `code`                                     |
| ------ | ------------------------------------------ |
| 400    | `VALIDATION_ERROR`, `INVALID_JSON`         |
| 404    | `NOT_FOUND` (resource or route)            |
| 409    | `CONFLICT` (duplicate key)                 |
| 413    | `PAYLOAD_TOO_LARGE`                        |
| 422    | `TREE_EMPTY`                               |
| 500    | `INTERNAL_ERROR` (details are only logged) |

### Migrating from v1 routes

| v1                                 | v2                           |
| ---------------------------------- | ---------------------------- |
| `GET /template-tree`               | `GET /tree`                  |
| `POST /save-template-tree`         | `PUT /tree`                  |
| `POST /add-node-tree`              | `POST /tree/nodes`           |
| `POST /update-node-tree`           | `PATCH /tree/nodes/:key`     |
| `POST /delete-node-tree`           | `DELETE /tree/nodes/:key`    |
| `POST /generate` (returned string) | `POST /generate` → `{ url }` |
| `GET /all-elements`                | `GET /elements`              |
| `POST /add-element`                | `POST /elements`             |
| `PUT /element`                     | `PATCH /elements/:key`       |
| `DELETE /delete-element/:key`      | `DELETE /elements/:key`      |

## Docker

Production image (multi-stage, non-root, healthcheck on `/health`):

```bash
docker build -t email-template-editor-nodejs .
docker run -d -p 9000:9000 -v email-template-data:/app/data email-template-editor-nodejs
```

Data lives in `/app/data/db.json`. Mount a volume there so it survives container re-creation. The image is seeded with the repository's `db.json`.

Development with hot reload:

```bash
docker compose up -d
docker compose logs -f
```
