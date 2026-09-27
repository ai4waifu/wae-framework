# `wae-napi`

Rust **cdylib** exposed to Node via Node-API (`napi-rs`).

Built into each `@wae/wae-*` platform package as `lib/<platform>-<toolchain>.node` (not a separate npm package).

| Export (native)                                                       | Role                                                          |
|-----------------------------------------------------------------------|---------------------------------------------------------------|
| `hostVersion()`                                                       | Crate version                                                 |
| `handleClientMessage(json)`                                           | Protocol router (no WebView)                                  |
| `openDesktop({ url, title?, undecorated? })`                          | Blocking desktop shell                                        |
| `checkProductUpdate` / `downloadProductUpdate` / `applyProductUpdate` | Product updater via [`wae-updater`](../wae-updater/readme.md) |

Build for the current host:

```bash
pnpm run build:native
# or
pnpm --filter @wae/wae-win32-x64 run build:native
```

Does not replace `@wae/wae` CLI; consumed by `@wae/wae-*` shells only.
