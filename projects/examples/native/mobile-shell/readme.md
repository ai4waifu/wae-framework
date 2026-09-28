# @wae-example/native-mobile-shell

## What this example demonstrates

Mobile shell intent directory. Note: current `src/main.ts` still has `target: "desktop"` (same as other native
skeletons), **not** mobile yet—trust source over directory name.

## Prerequisites

- Repo root has `pnpm install`
- Node.js 22 + pnpm 10 (matches repo `packageManager`)
- Skeleton: `src/main.ts` only constructs API; no HTTP listen, browser page, or UI.
- Honest status: env string does not reflect mobile; directory and package name express intent only.

## Startup commands

From repo root:

```bash
pnpm --filter @wae-example/native-mobile-shell run check
```

From this directory:

```bash
pnpm run check
pnpm run build   # currently prints skeleton, no deployable output
```

## Access URL

**None.** No localhost port or openable static page. Today’s acceptance is only `pnpm run check` (`tsc --noEmit`).

## Key files

- `src/main.ts` — today still desktop + `hasNativeBridge`
- `package.json`

## Request / event path (target semantics)

```text
Mobile shell
  → WebView
  → bridge → host
  → mobile system capabilities (target)
```

0.0.0 code usually stops at “construct object”; full path not run yet.

## Exercises

- Change `env.target` to documented mobile value if types allow; run `check` and observe constraints.
- Contrast `frontend/mobile` (page) with this directory (shell / bridge).
- Path practice should stay bridge→host, not HTTP `createApp` listen.

## Differences from production apps

Production needs Android/iOS shells and store distribution; this example does not run on device.

Dependencies (this example): `@wae/client`.
