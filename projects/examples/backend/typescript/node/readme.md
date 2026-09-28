# @wae-example/backend-ts-node

## What this example demonstrates

Node backend: `@wae/core` + `@wae/server/node`. `src/main.ts` calls `serve(app)` (listens on port 3000 by default).

## Prerequisites

- Repo root `pnpm install`
- Node.js 22 + pnpm 10

## Startup

```bash
pnpm --filter @wae-example/backend-ts-node run check
node projects/examples/backend/typescript/node/src/main.ts
```

## Request path

```text
createApp → serve(app) [@wae/server/node] → node:http → app.fetch
```

Dependencies: `@wae/core`, `@wae/server`.
