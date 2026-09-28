# examples — Learning paths by use case

These examples show **how WAE composes**, not buckets by framework name. Frameworks appear only under `integration/`.

**Overall status (0.0.0)**: Most examples are still API construction + `pnpm run check`. **Pages you can open**:
`integration/vue-app` · `integration/react-app` (`pnpm exec wae run`). `wae create` / `build` etc. remain skeletons.

`minimal/protocol-only` and `minimal/bridge-only`, plus `backend/rust/*`, **have no** example package project: the
former are documentation guides; the latter are README-only.

## What you want to do → where to go

| Goal                                                | Directory                                                                                                                                                                                                                      |
|-----------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Minimal client                                      | [`minimal/client-only`](minimal/client-only/readme.md)                                                                                                                                                                         |
| Minimal server                                      | [`minimal/server-only`](minimal/server-only/readme.md)                                                                                                                                                                         |
| Protocol encode/decode only                         | [`minimal/protocol-only`](minimal/protocol-only/readme.md) (no code yet)                                                                                                                                                       |
| Bridge only                                         | [`minimal/bridge-only`](minimal/bridge-only/readme.md) (no code yet)                                                                                                                                                           |
| Browser frontend                                    | [`frontend/browser`](frontend/browser/readme.md)                                                                                                                                                                               |
| Desktop / mobile / WebView / Wasm frontend          | [`frontend/desktop`](frontend/desktop/readme.md) · [`mobile`](frontend/mobile/readme.md) · [`webview`](frontend/webview/readme.md) · [`wasm`](frontend/wasm/readme.md)                                                         |
| Full-stack RPC                                      | [`fullstack/rpc`](fullstack/rpc/readme.md)                                                                                                                                                                                     |
| Auth / SSR / WS / realtime / upload                 | [`fullstack/auth`](fullstack/auth/readme.md) · [`ssr`](fullstack/ssr/readme.md) · [`websocket`](fullstack/websocket/readme.md) · [`realtime`](fullstack/realtime/readme.md) · [`file-upload`](fullstack/file-upload/readme.md) |
| Node / Deno / Cloudflare / plain fetch / WS backend | [`backend/typescript/*`](backend/typescript/node/readme.md)                                                                                                                                                                    |
| Rust service placeholders                           | [`backend/rust/*`](backend/rust/http/readme.md) (docs only)                                                                                                                                                                    |
| Desktop shell / mobile shell / IPC / FS / windows   | [`native/*`](native/ipc/readme.md)                                                                                                                                                                                             |
| Vue / React / Svelte / Solid injection boundary     | [`integration/vue`](integration/vue/readme.md) etc.                                                                                                                                                                            |
| **Vue / React pages runnable with `wae run`**       | [`integration/vue-app`](integration/vue-app/) · [`integration/react-app`](integration/react-app/)                                                                                                                              |

## Recommended order

1. `minimal/client-only` + `minimal/server-only` — separate the two layers
2. `fullstack/rpc` — see how client and server share a directory placeholder
3. `backend/typescript/node` or `cloudflare` — see deployment adapter dependency surface
4. `integration/<your framework>` — adapters only inject, they do not start a second runtime
5. `native/ipc` — then enter bridge → host, not HTTP server

## Directory map

```text
frontend/      Frontend runtime shapes (browser / desktop / mobile / webview / wasm)
fullstack/     client + server composition intent
backend/       Backends without WAE frontend (typescript/ · rust/)
native/        Shell · IPC · system capabilities (via host, not `createApp` HTTP listen)
integration/   Framework is the variable
minimal/       Single-capability boundaries
```

## Common commands

```bash
# Repo root: run tsc on all examples with package.json
pnpm --filter "./projects/examples/**" run check
```
