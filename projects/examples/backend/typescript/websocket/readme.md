# @wae-example/backend-ts-websocket

## What this example demonstrates

Backend WebSocket intent (no WAE frontend): same generic server/serverless dependency surface. Source does not create WS
server.

## Prerequisites

- Repo root has `pnpm install`
- Node.js 22 + pnpm 10 (matches repo `packageManager`)
- Skeleton: `src/main.ts` only constructs API; no HTTP listen, browser page, or UI.

## Startup commands

From repo root:

```bash
pnpm --filter @wae-example/backend-ts-websocket run check
```

From this directory:

```bash
pnpm run check
pnpm run build   # currently prints skeleton, no deployable output
```

## Access URL

**None.** No localhost port or openable static page. Today’s acceptance is only `pnpm run check` (`tsc --noEmit`).

## Key files

- `src/main.ts`
- `package.json`

## Request / event path (target semantics)

```text
WS client
  → backend upgrade or separate WS listener (target)
  → frame handling
  → push back
(today only createServer placeholder)
```

0.0.0 code usually stops at “construct object”; full path not run yet.

## Exercises

- Complete HTTP `route` self-test first; then check how your runtime (Node/Deno) coexists WS with `fetch` app.
- Contrast `fullstack/websocket`: no `@wae/client` here.
- Avoid claiming empty `createApp()` supports WS.

## Differences from production apps

Production needs connection management and horizontal scale; this example has no listener.

Dependencies (this example): `@wae/server`, `@wae/serverless`.
