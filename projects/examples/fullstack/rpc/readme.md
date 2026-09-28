# @wae-example/fullstack-rpc

## What this example demonstrates

Full-stack RPC / action intent: same entry file constructs both `createClient` and `createApp` with `actions` / `rpc`,
showing “client and server contract in one repo placeholder”.

## Prerequisites

- Repo root has `pnpm install`
- Node.js 22 + pnpm 10 (matches repo `packageManager`)
- Skeleton: `src/main.ts` only constructs API; no HTTP listen, browser page, or UI.

## Startup commands

From repo root:

```bash
pnpm --filter @wae-example/fullstack-rpc run check
```

From this directory:

```bash
pnpm run check
pnpm run build   # currently prints skeleton, no deployable output
```

## Access URL

**None.** No localhost port or openable static page. Today’s acceptance is only `pnpm run check` (`tsc --noEmit`).

## Key files

- `src/main.ts` — both `createClient` + `createApp` (`actions` / `rpc`)
- `package.json` — client / server / serverless

## Request / event path (target semantics)

```text
client.server.action / fetch
  → HTTP (or future isomorphic call)
  → `createApp` action / rpc handler
  → Response
  → client decode (action expects JSON)
```

0.0.0 code usually stops at “construct object”; full path not run yet.

## Exercises

- Add server `route`, self-test with `app.fetch`; then align client `server.action` to the same path.
- Client and server in one file is skeleton convenience; production should split packages.
- Compare with `minimal/*`: here both sides appear.

## Differences from production apps

Production splits frontend/backend projects, real ports, and auth; this example sends no requests and does not listen.

Dependencies (this example): `@wae/client`, `@wae/server`, `@wae/serverless`.
