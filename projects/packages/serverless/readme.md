# `@wae/serverless`

Cloudflare Workers and other **per-request** edge hosts. Does **not** depend on `@wae/server`.

## Install

```bash
pnpm add @wae/core@0.0.0 @wae/serverless@0.0.0
```

## Cloudflare Worker

```ts
import { createApp, route } from "@wae/core";
import { worker } from "@wae/serverless/cloudflare";

const app = createApp({
  routes: [route("GET", "/", (ctx) => ctx.text("ok"))],
});

export default worker(app);
```

`worker(app)` calls `app.fetch` directly — no `adaptFetch` layer.

## Exports

| Subpath | Role |
|---------|------|
| `.` | `readBinding`, `runWithLifecycle` |
| `./cloudflare` | `worker`, `cloudflareKv`, deprecated `createWorker` / `createCloudflareApp` aliases |
| `./cloudflare/durable-objects` | `WaeDurableObject` base |
| `./cloudflare/queues` | Queue handler types |

## Related

- App factory: [`@wae/core`](../core/readme.md)
- Node / Deno: [`@wae/server`](../server/readme.md)
