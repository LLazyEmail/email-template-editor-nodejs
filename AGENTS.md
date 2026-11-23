# AI Agent Guide — email-template-editor-nodejs

> **Audience:** AI coding agents (Claude Code, Cursor, Copilot, Codex) and people working on this repository.
> **Purpose:** enough context to make safe, consistent changes without rediscovering the layout.

REST API for the [email template editor](https://github.com/LLazyEmail/email-template-editor-reactjs). It stores a tree of template parts and a library of reusable elements, and renders the tree into one HTML email. Read [`README.md`](README.md) for configuration, the endpoint table and Docker.

**Stack:** Node 24 (`.nvmrc`), TypeScript 6 (strict, ESM, `NodeNext`), Express 5, zod 4, pino, Vitest + Supertest, ESLint 10 + typescript-eslint, Prettier.

## Commands

```bash
npm run dev          # http://localhost:9000, hot reload (tsx)
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run format       # Prettier (format:check runs in CI)
npm test             # unit + HTTP integration tests
npm run build        # compile to dist/
npm run openapi      # regenerate openapi.json after changing a route or schema
```

## Architecture

```
request → helmet → cors → request-id → pino-http → json → static
        → router      src/modules/<m>/<m>.router.ts      routes + validate({ body, params }) with zod
        → controller  src/modules/<m>/<m>.controller.ts  HTTP only: read req, write res
        → service     src/modules/<m>/<m>.service.ts     business rules, throws AppError
        → store       src/storage/template-store.ts      interface; JsonFileStore (db.json)
        → not-found → error-handler                      one JSON error shape for everything
```

- `src/routes.ts` is the composition root: it wires store → services → controllers → routers and serves `/health` and `/openapi.json`.
- `src/openapi.ts` builds the OpenAPI 3.1 document from the same zod schemas the routers use.
- `src/config/env.ts` validates environment variables with zod; invalid config stops the server at startup.

## API contract

- **Source of truth:** [`openapi.json`](openapi.json), generated from the zod schemas and served at `GET /openapi.json`. `test/openapi.test.ts` fails if the committed file is stale or documents a route the app does not have.
- The frontend's request types (`src/api/main.types.ts` in the frontend repo) must match it. A breaking change here needs a matching frontend PR.
- Errors are always `{ error: { code, message, details?, requestId } }` (see `src/common/middleware/error-handler.ts`).
- Keys in paths are URL-encoded by the client.

## Rules

- Validate every body and path parameter with a zod schema in `<module>.schemas.ts` through `validate()`. Controllers trust `req.body` / `req.params` after that.
- Services throw `AppError` subclasses (`ValidationError`, `NotFoundError`, `ConflictError`, or `AppError(status, CODE, message)`); never write responses from a service.
- Persistence only through the `TemplateStore` interface. Do not read or write `db.json` elsewhere.
- No `console.*` (ESLint `no-console`); log with the request logger `req.log` or the injected `logger`.
- ESM with `.js` extensions in relative imports (`NodeNext`). `import type` for types (`consistent-type-imports`).
- Tests: HTTP behavior in `test/*.test.ts` with Supertest against `createApp()` and a temp `db.json`; pure logic next to the code (`*.test.ts`). Never touch the real `db.json` from tests.
- Keep `README.md`'s endpoint table in sync with `openapi.json`.

## Agent tooling

- `.claude/settings.json`: common checks run without a prompt; `.env` is not readable. Personal overrides go to `.claude/settings.local.json` (git-ignored).
- PostToolUse hook `.claude/hooks/format-and-lint.sh`: Prettier and `eslint --fix` after each edit; remaining ESLint errors go back to the agent.
- Skill `add-endpoint`: the full checklist for a new or changed route.

## Workflow

1. Branch from `main`. One concern per PR.
2. Make the change and add or update tests.
3. `npm run lint && npm run typecheck && npm run format:check && npm test && npm run build`; `npm run openapi` if routes or schemas changed.
4. Open a PR using `.github/pull_request_template.md`.

## Things to avoid

- Do not commit `.env` or real data in `db.json` (it is sample data that seeds the Docker image).
- Do not add routes without schemas, tests and an `openapi.json` update.
- Do not change the error shape or route paths without a matching frontend change.
- Do not upgrade to TypeScript 7 yet: typescript-eslint does not support it. Renovate (`renovate.json`) holds `typescript` at `<7` and `@types/node` at the `.nvmrc` major.
