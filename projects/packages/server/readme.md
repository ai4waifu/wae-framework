# `@wae/server`

Node.js / Deno **long-lived** server hosts. Shared HTTP app logic lives in `@wae/core` (`createApp`).

## Install

```bash
pnpm add @wae/core@0.0.0 @wae/server@0.0.0
```

## Node

```ts
import { createApp, route } from "@wae/core";
import { serve } from "@wae/server/node";

const app = createApp({
  routes: [route("GET", "/hello", (ctx) => ctx.json({ ok: true }))],
});

await serve(app, { port: 3000 });
```

## Deno

```ts
import { createApp } from "@wae/core";
import { serve } from "@wae/server/deno";

const app = createApp();
export default { fetch: serve(app) };
```

## Exports

| Subpath | Role |
|---------|------|
| `.` | Re-exports `@wae/core` app types (`createApp`, `route`, …) for convenience |
| `./node` | `serve(app)` for Node.js / Bun |
| `./deno` | `serve(app)` → Fetch handler; calls `Deno.serve` when available |

## Related

- App factory: [`@wae/core`](../core/readme.md)
- Workers: [`@wae/serverless`](../serverless/readme.md)
