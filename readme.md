# WAE

WAE is a full-stack WebView framework driven by a **Rust host** with **TypeScript** as the application layer. It
provides framework-agnostic `client` / `server`, communication protocols, and platform adapters; applications compose
browser, Wasm, desktop, or mobile shells by target environment. Rust handles the local host and native capabilities and
does not enter the default frontend bundle; Wasm is an explicit opt-in.

There is **no** `@wae/ui` and **no** `@wae/adapter-vanilla`. For plain TS / DOM, use `@wae/client` directly.

The current npm version is `0.0.0` (placeholder initial release): library APIs and package surfaces are aligned, but the
CLI, most adapters, and platform shells remain skeletons—do not treat them as production-ready.

## Product composition (user view)

```text
App config (@wae/wae · defineConfig)
  ├─ frontend / client (@wae/client)
  │   └─ adapter: Vue / React / Svelte / Solid (optional)
  ├─ backend (@wae/core createApp)
  │   ├─ @wae/server → Node / Deno
  │   └─ @wae/serverless → Cloudflare Workers
  ├─ communication (@wae/types · @wae/core · @wae/protocol)
  └─ host / platform
      ├─ @wae/wae-unknown-wasm32
      ├─ desktop: wae-win32-* / wae-darwin-* / wae-linux-*
      └─ mobile: wae-android-arm64 / wae-ios-arm64
```

| Concept                     | What it does                                                           | What it is not                                       |
|-----------------------------|------------------------------------------------------------------------|------------------------------------------------------|
| **client**                  | Frontend runtime: `createClient`, HTTP/action, session, bridge         | Not a UI framework                                   |
| **adapter**                 | Connects an existing `WaeClient` to Vue/React/Svelte/Solid             | Not a second runtime                                 |
| **bundler**                 | Default Vite (`wae run` starts it); set `custom` to swap Webpack, etc. | Not WAE core; swappable                              |
| **core**                    | Shared `createApp` / routes / action / RPC HTTP                        | Not a process or cloud binding                       |
| **server**                  | Node.js / Deno host entries (`/node`, `/deno`)                         | Not Cloudflare Workers                               |
| **serverless**              | Per-request edge hosts (`/cloudflare`)                                 | Must not depend on `@wae/server`                     |
| **protocol / types / core** | Cross-end messages and shared primitives                               | Not business handlers                                |
| **host (Rust)**             | Local shell ↔ frontend bridge                                          | Not a remote business backend                        |
| **platform (`@wae/wae-*`)** | Target OS/runtime distribution packages                                | Not ordinary business deps (pulled via CLI optional) |

## Package selection

| Package                                                  | When to install                                                                                    |
|----------------------------------------------------------|----------------------------------------------------------------------------------------------------|
| `@wae/wae`                                               | Need CLI and `defineConfig`                                                                        |
| `@wae/client`                                            | Any frontend (including no framework)                                                              |
| `@wae/adapter-vue` / `react` / `svelte` / `solid`        | Only when using that framework                                                                     |
| `@wae/core`                                              | Shared `createApp` / routes (all server targets)                                                   |
| `@wae/server`                                            | Node.js / Deno hosts (`/node`, `/deno`)                                                           |
| `@wae/serverless`                                        | Cloudflare Workers (`/cloudflare`)                                                                 |
| `@wae/types` / `@wae/core` / `@wae/protocol`             | Protocol/types/IDs and encode-decode                                                               |
| `@wae/wae-*`                                             | Generally **do not** install manually; pulled as `optionalDependencies` when installing `@wae/wae` |

Do not install: `@wae/ui`, `@wae/adapter-vanilla` (they do not exist and will not return).

## With Vite

**Vite is common and swappable** (similar to Tauri template habits, not baked into WAE core).

- Default: `frontend.bundler: "vite"` → `wae run` starts Vite (`vite` is an optional peer).
- Swap toolchain: `frontend.bundler: "custom"` + `frontend.devUrl`, run Webpack / Rspack yourself.

See [`@wae/wae`](projects/packages/wae/readme.md) for details.

## Choosing by target

- **Browser frontend only**: `@wae/client` + optional adapter; `wae run` starts Vite (no `@wae/wae-*` platform package).
- **Node HTTP service**: `@wae/core` + `@wae/server/node` (`serve` listens via `node:http`).
- **Deno**: `@wae/core` + `@wae/server/deno`.
- **Cloudflare Worker**: `@wae/core` + `@wae/serverless/cloudflare` (`worker(app)`).
- **Wasm client**: `@wae/wae-unknown-wasm32`; build/load details in that package README (placeholder API today).
- **Desktop WebView**: `target: "desktop"` + matching `@wae/wae-win32-*` / `darwin-*` / `linux-*` + Rust host; native
  binaries not yet in npm.
- **Mobile shell**: `@wae/wae-android-arm64` / `@wae/wae-ios-arm64` + host; also placeholders.

## What you can verify in ten minutes

### A. `wae run` (Vue / React page)

```bash
pnpm install
pnpm --filter @wae/wae run build
pnpm --filter @wae-example/integration-vue-app exec wae run --port 5173
# In another terminal:
pnpm --filter @wae-example/integration-react-app exec wae run --port 5174
```

Open the Local URL printed in the terminal; you should see a title and a "ping client" button.

### B. Library API (no process needed)

```ts
import {createApp, route} from "@wae/core";

const app = createApp({
    routes: [route("GET", "/hello", (ctx) => ctx.json({ok: true}))],
});
await app.fetch(new Request("http://x/hello")); // → JSON
```

```bash
pnpm run check:boundary
pnpm run check:host-http
pnpm run check:create
pnpm run check:server-bundle
pnpm run check:deploy-target-deps
pnpm run check:wrangler
pnpm run check:publish
pnpm run check:publish-flow
pnpm run check:ts
pnpm exec wae help
```

`wae create` and `wae build` are wired for web apps with `deployTarget` host bundling. `preview` / `check` / `test` / `generate` remain skeletons.

## How requests flow

**Browser ↔ remote server (HTTP)**

```text
createClient → server.fetch / action
  → HTTP
  → createApp route handler
  → Response
  → client decode (action expects JSON)
```

**Frontend ↔ Rust host (WebView / native)**

```text
ClientMessage (@wae/protocol)
  → bridge / IPC
  → host (wae-bridge)
  → HostMessage (domPatch / rpc / error)
```

**Worker deployment**

```text
createApp → worker(app) [@wae/serverless/cloudflare]
  → runtime fetch(request, env, ctx)
```

## Repository layout

```text
wae/
  projects/
    crates/      # Rust: wae-types · wae-bridge · wae-desktop
    packages/    # npm: all @wae/* libraries and platform shells
    examples/    # Examples by use case (not published)
```

## Which README to read next

| What you want to do      | Read                                                     |
|--------------------------|----------------------------------------------------------|
| Overview                 | [`projects`](projects/readme.md)                         |
| Project config / CLI     | [`packages/wae`](projects/packages/wae/readme.md)        |
| Frontend runtime         | [`@wae/client`](projects/packages/client/readme.md)      |
| Framework integration    | [`packages`](projects/packages/readme.md)                |
| Server side              | [`@wae/server`](projects/packages/server/readme.md)      |
| Communication & protocol | [`packages/types`](projects/packages/types/readme.md)    |
| Rust host                | [`projects/crates`](projects/crates/readme.md)           |
| Platform packages        | [`packages`](projects/packages/readme.md) (`wae-*` dirs) |
| Runnable examples        | [`examples`](projects/examples/readme.md)                |

## Repository checks and publishing

```bash
pnpm run check:boundary
pnpm run check:host-http
pnpm run check:host-cloudflare-kv
pnpm run check:host-deno
pnpm run check:host-websocket
pnpm run check:create
pnpm run check:server-bundle
pnpm run check:deploy-target-deps
pnpm run check:wrangler
pnpm run check:publish
pnpm run check:publish-flow
pnpm run fmt:check
pnpm run publish:dry
```

`0.0.0` publish scope: product surface, communication, backend adapters, framework adapters, all `@wae/wae-*`. Examples
are not published.
