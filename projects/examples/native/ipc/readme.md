# @wae-example/native-ipc

## What this example demonstrates

Native IPC boundary: `createClient` with `env: { target: "desktop", hasNativeBridge: true }`, assumes native bridge not
pure browser HTTP backend.

## Prerequisites

- Repo root has `pnpm install`
- Node.js 22 + pnpm 10 (matches repo `packageManager`)
- Skeleton: `src/main.ts` only constructs API; no HTTP listen, browser page, or UI.

## Startup commands

From repo root:

```bash
pnpm --filter @wae-example/native-ipc run check
```

From this directory:

```bash
pnpm run check
pnpm run build   # currently prints skeleton, no deployable output
```

## Access URL

**None.** No localhost port or openable static page. Today’s acceptance is only `pnpm run check` (`tsc --noEmit`).

## Key files

- `src/main.ts` — `hasNativeBridge: true`
- `package.json`

## Request / event path (target semantics)

```text
Frontend ClientMessage
  → bridge / IPC
  → Rust host (wae-bridge)
  → native capability
  → HostMessage back to frontend
```

0.0.0 code usually stops at “construct object”; full path not run yet.

## Exercises

- Compare path diagram with `minimal/bridge-only`: “bridge → host” not HTTP `createApp` listen.
- Inspect `client.native` at type level; do not treat untrusted native messages as authorized system calls.
- **Do not** add HTTP `route` in exercises here—that mixes wrong layers.

## Differences from production apps

Production needs real postMessage transport, host authorization, shell process; this example does not open a window.

Dependencies (this example): `@wae/client`.
