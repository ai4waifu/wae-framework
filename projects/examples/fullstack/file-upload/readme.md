# @wae-example/fullstack-file-upload

## What this example demonstrates

File upload intent: client submits multipart/body, server receives and responds. Source does not handle `FormData` or
disk writes.

## Prerequisites

- Repo root has `pnpm install`
- Node.js 22 + pnpm 10 (matches repo `packageManager`)
- Skeleton: `src/main.ts` only constructs API; no HTTP listen, browser page, or UI.

## Startup commands

From repo root:

```bash
pnpm --filter @wae-example/fullstack-file-upload run check
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
client FormData / body
  → POST /upload (target)
  → `createApp` handler reads body
  → store or echo metadata → JSON Response
```

0.0.0 code usually stops at “construct object”; full path not run yet.

## Exercises

- Write a `route` reading `request.arrayBuffer()` or `formData()`, feed `new Request(..., { method:"POST", body })` via
  `app.fetch`.
- Document size limits and MIME—even in comments.
- Versus `fullstack/rpc`: upload cares about body shape, not just JSON action.

## Differences from production apps

Production has object storage, virus scan, resumable upload; this example has no file persistence.

Dependencies (this example): `@wae/client`, `@wae/server`, `@wae/serverless`.
