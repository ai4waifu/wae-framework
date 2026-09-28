# @wae-example/backend-ts-cloudflare

## What this example demonstrates

Cloudflare Workers: `@wae/core` + `@wae/serverless/cloudflare`. Exports `worker(app)`.

## Prerequisites

- Repo root `pnpm install`
- Node.js 22 + pnpm 10

## Startup

```bash
pnpm --filter @wae-example/backend-ts-cloudflare run check
```

## Request path

```text
createApp → worker(app) [@wae/serverless/cloudflare] → fetch(request, env, ctx)
```

Dependencies: `@wae/core`, `@wae/serverless`.
