---
name: add-endpoint
description: "Add or change a REST endpoint of the email template editor API. Use when adding a route, changing a request or response shape, or adding a feature module under src/modules."
---

# Add or change an endpoint

Follow the layers in order. Look at `src/modules/elements/` as the reference module.

1. **Schema** — `src/modules/<m>/<m>.schemas.ts`: zod schemas for the body and path params, plus `z.infer` types. Trim and require keys (`z.string().trim().min(1)`).
2. **Service** — `<m>.service.ts`: the business rule. Read and write through `TemplateStore` (`store.read()` / `store.update()`). Throw `NotFoundError`, `ConflictError` or `AppError(status, "CODE", message)`; never touch `req`/`res`.
3. **Controller** — `<m>.controller.ts`: arrow-function methods that read the validated `req`, call the service and set the status (`201` + body for create, `204` for update/delete).
4. **Router** — `<m>.router.ts`: `validate({ body, params })` before the controller method.
5. **Wire it** — new module: construct it in `src/routes.ts`.
6. **Contract** — add the operation to `buildOpenApiDocument()` in `src/openapi.ts` (register new named schemas in `components`), then `npm run openapi` to regenerate `openapi.json`.
7. **Tests**
   - HTTP: `test/app.test.ts` with Supertest — success status and body, 400 for invalid input, 404/409 where they apply, and that `db.json` changed as expected.
   - Pure logic (helpers): `*.test.ts` next to the code.
   - `test/openapi.test.ts` fails until `openapi.json` is regenerated and catches documented routes that do not exist.
8. **Docs** — the endpoint table in `README.md`.
9. **Frontend** — if the shape or path changed, the frontend's `src/api/main.ts` and `main.types.ts` need a matching PR in `email-template-editor-reactjs`.

## Check

```bash
npm run lint && npm run typecheck && npm run format:check && npm test && npm run build
```
