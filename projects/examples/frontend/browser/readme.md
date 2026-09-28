# @wae-example/frontend-browser

## What this example demonstrates

Browser-shaped frontend placeholder: `@wae/client` for a normal web page, default browser bridge, no desktop/mobile
native shell assumed.

## Prerequisites

- Repo root has `pnpm install`
- Node.js 22 + pnpm 10 (matches repo `packageManager`)
- Skeleton: `src/main.ts` only constructs API; no HTTP listen, browser page, or UI.

## Startup commands

From repo root:

```bash
pnpm --filter @wae-example/frontend-browser run check
```

From this directory:

```bash
pnpm run check
pnpm run build   # currently prints skeleton, no deployable output
```

## Access URL

**None.** No localhost port or openable static page. Today’s acceptance is only `pnpm run check` (`tsc --noEmit`).

## Key files

- `src/main.ts` — only `createClient({ server: { baseUrl: "/api" } })`
- `package.json`

## Request / event path (target semantics)

```text
createClient (browser)
  → browser bridge / HTTP
  → remote `createApp` server (not included in this example)
  → Response → client decode
```

0.0.0 code usually stops at “construct object”; full path not run yet.

## Exercises

- Keep `env` without `hasNativeBridge`; confirm difference from `native/*` examples is in type comments.
- When you have a static page + remote API, swap `baseUrl` to a real origin and try `server.fetch`.
- For UI frameworks go to `integration/*`; do not add adapters here.

## Differences from production apps

Production has HTML/Vite entry, real pages, and CDN; this example has no page or port.

Dependencies (this example): `@wae/client`.
