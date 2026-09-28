# @wae-example/backend-ts-fetch

## What this example demonstrates

Portable app only: `@wae/core`. No host package — call `app.fetch` directly or from your runtime.

## Prerequisites

- Repo root `pnpm install`
- Node.js 22 + pnpm 10

## Startup

```bash
pnpm --filter @wae-example/backend-ts-fetch run check
```

## Request path

```text
createApp → app.fetch(request)   // no listen, no Worker export
```

Dependencies: `@wae/core` only.
