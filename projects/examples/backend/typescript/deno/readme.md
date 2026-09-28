# @wae-example/backend-ts-deno

## What this example demonstrates

Deno surface: `@wae/core` + `@wae/server/deno`. Exports `{ fetch }` wired to `app.fetch`.

## Prerequisites

- Repo root `pnpm install`
- Node.js 22 for `tsc`; Deno for runtime

## Startup

```bash
pnpm --filter @wae-example/backend-ts-deno run check
```

## Request path

```text
createApp → serve(app) [@wae/server/deno] → Deno.serve / fetch export
```

Dependencies: `@wae/core`, `@wae/server`.
