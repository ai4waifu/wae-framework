# @wae-example/fullstack-auth

## What this example demonstrates

Full-stack auth intent: client + server co-located placeholder for session / cookie / token handlers. Source like other
fullstack examples is dual construction only.

## Prerequisites

- Repo root has `pnpm install`
- Node.js 22 + pnpm 10 (matches repo `packageManager`)
- Skeleton: `src/main.ts` only constructs API; no HTTP listen, browser page, or UI.

## Startup commands

From repo root:

```bash
pnpm --filter @wae-example/fullstack-auth run check
```

From this directory:

```bash
pnpm run check
pnpm run build   # currently prints skeleton, no deployable output
```

## Access URL

**None.** No localhost port or openable static page. Today’s acceptance is only `pnpm run check` (`tsc --noEmit`).

## Key files

- `src/main.ts` — `createClient` + `createApp`
- `package.json`

## Request / event path (target semantics)

```text
Login form / client
  → POST /auth/… (target)
  → server validates → Set-Cookie / token
  → later requests carry credentials → protected routes
```

0.0.0 code usually stops at “construct object”; full path not run yet.

## Exercises

- Design one public `route` and one protected `route`; simulate with `app.fetch` + hand-written Header first.
- Read `@wae/client` session-related types if any; do not assume full OAuth exists.
- Versus `fullstack/rpc`: auth is cross-cutting, not another transport.

## Differences from production apps

Production has real IdP, key rotation, CSRF; this example has no login page or cookie implementation.

Dependencies (this example): `@wae/client`, `@wae/server`, `@wae/serverless`.
