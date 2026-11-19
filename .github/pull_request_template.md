## What

<!-- What changed, in a few bullets. -->

## Why

<!-- The problem or issue this solves. Link it: Closes #123 -->

## How to verify

<!-- Commands you ran, requests a reviewer can send. -->

## Checklist

- [ ] One concern per PR
- [ ] `npm run lint`, `npm run typecheck`, `npm run format:check` pass
- [ ] `npm test` passes; new behavior has a test
- [ ] Routes or schemas changed → `npm run openapi` run, `openapi.json` and the README endpoint table updated
- [ ] Breaking API change → matching PR in email-template-editor-reactjs linked
