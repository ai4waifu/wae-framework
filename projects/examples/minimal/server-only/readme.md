# @wae-example/minimal-server-only

## What this example demonstrates

Minimal server boundary: only `createApp()` (or deprecated `createServer()`), no `@wae/client`, no Node/Deno/Cloudflare host binding.

## Prerequisites

- Repo root has `pnpm install`
- Node.js 22 + pnpm 10 (matches repo `packageManager`)
- Skeleton: `src/main.ts` only constructs API; no HTTP listen, browser page, or UI.

## Startup commands

From repo root:

```bash
pnpm --filter @wae-example/minimal-server-only run check
```

From this directory:

```bash
pnpm run check
pnpm run build   # currently prints skeleton, no deployable output
```

## Access URL

**None.** No localhost port or openable static page. Today’s acceptance is only `pnpm run check` (`tsc --noEmit`).

## Key files

- `src/main.ts` — `createApp()` then `void app`
- `package.json` — depends only on `@wae/server`

## Request / event path (target semantics)

```text
createApp({ routes? })
  → WaeApp.fetch(Request)
  → Response
(this example does not call fetch or listen)
```

0.0.0 code usually stops at “construct object”; full path not run yet.

## Exercises

- Declare routes with `route("GET", "/hello", …)`, then `app.fetch(new Request("http://x/hello"))` and assert JSON.
- Compare with the server snippet in root README “What you can verify in ten minutes”.
- For process listen, see `backend/typescript/node`; do not fake `wae dev` in this directory.

## Differences from production apps

Production declares full routes / middleware and connects via `@wae/server/node` or `@wae/serverless/cloudflare`. This example stops at
platform-agnostic `createApp`.

Dependencies (this example): `@wae/server`.
