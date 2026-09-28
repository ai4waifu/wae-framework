# @wae-example/fullstack-ssr

## What this example demonstrates

SSR intent: server renders HTML, client hydrates. Dual construction skeleton only; **no** template engine or framework
SSR adapter.

## Prerequisites

- Repo root has `pnpm install`
- Node.js 22 + pnpm 10 (matches repo `packageManager`)
- Skeleton: `src/main.ts` only constructs API; no HTTP listen, browser page, or UI.
- Adapter docs say framework SSR mostly unsupported; this example does not prove SSR works.

## Startup commands

From repo root:

```bash
pnpm --filter @wae-example/fullstack-ssr run check
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
Request
  → `createApp` renders HTML (target)
  → Response text/html
  → browser hydrate → createClient takes over interaction
```

0.0.0 code usually stops at “construct object”; full path not run yet.

## Exercises

- Return `new Response("<html>…</html>", { headers: { "content-type": "text/html" } })` from a `route`, inspect body via
  `app.fetch`.
- Separate “server emits HTML” from “integration adapter client injection”—two layers.
- Do not call nonexistent `wae ssr` CLI.

## Differences from production apps

Production needs framework SSR pipeline, caching, streaming; this example has no HTML output.

Dependencies (this example): `@wae/client`, `@wae/server`, `@wae/serverless`.
