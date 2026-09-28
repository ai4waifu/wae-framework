# @wae-example/minimal-client-only

## What this example demonstrates

Minimal frontend boundary: only `import { createClient } from "@wae/client"` and construct an instance. No
`@wae/server`, adapter, or native bridge.

## Prerequisites

- Repo root has `pnpm install`
- Node.js 22 + pnpm 10 (matches repo `packageManager`)
- Skeleton: `src/main.ts` only constructs API; no HTTP listen, browser page, or UI.

## Startup commands

From repo root:

```bash
pnpm --filter @wae-example/minimal-client-only run check
```

From this directory:

```bash
pnpm run check
pnpm run build   # currently prints skeleton, no deployable output
```

## Access URL

**None.** No localhost port or openable static page. Today’s acceptance is only `pnpm run check` (`tsc --noEmit`).

## Key files

- `src/main.ts` — `createClient({ server: { baseUrl: "/api" } })`
- `package.json` — depends only on `@wae/client`

## Request / event path (target semantics)

```text
createClient({ server: { baseUrl } })
  → WaeClient (this example sends no HTTP / action)
```

0.0.0 code usually stops at “construct object”; full path not run yet.

## Exercises

- Change `baseUrl` and see if types still pass `check`.
- Read `@wae/client` `server.fetch` / `server.action` signatures; try real requests on **your own** HTTP server.
- **Do not** add `createApp` server routes here—that belongs to `minimal/server-only` and fullstack.

## Differences from production apps

Production also configures real origin, error handling, optional `@wae/adapter-*`, and static hosting or shell. This
directory intentionally stays “client only”.

Dependencies (this example): `@wae/client`.
