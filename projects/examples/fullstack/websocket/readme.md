# @wae-example/fullstack-websocket

## What this example demonstrates

Full-stack WebSocket intent: client and server co-located, target is bidirectional frames not just HTTP
request/response. Source has no WebSocket API yet.

## Prerequisites

- Repo root has `pnpm install`
- Node.js 22 + pnpm 10 (matches repo `packageManager`)
- Skeleton: `src/main.ts` only constructs API; no HTTP listen, browser page, or UI.

## Startup commands

From repo root:

```bash
pnpm --filter @wae-example/fullstack-websocket run check
```

From this directory:

```bash
pnpm run check
pnpm run build   # currently prints skeleton, no deployable output
```

## Access URL

**None.** No localhost port or openable static page. Today’s acceptance is only `pnpm run check` (`tsc --noEmit`).

## Key files

- `src/main.ts` — still HTTP-oriented dual construction
- `package.json`

## Request / event path (target semantics)

```text
browser WebSocket
  → upgrade / separate WS endpoint (target)
  → server frame handling
  → push back to client
```

0.0.0 code usually stops at “construct object”; full path not run yet.

## Exercises

- Get HTTP `route` + `app.fetch` working first; then check how your runtime attaches WS (Node/Deno differ).
- Contrast `backend/typescript/websocket`: no client there, here emphasizes full-stack pairing.
- Do not treat empty `createApp()` as WS listening.

## Differences from production apps

Production needs heartbeat, reconnect, auth handshake; this example has no port or frames.

Dependencies (this example): `@wae/client`, `@wae/server`, `@wae/serverless`.
