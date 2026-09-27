# host/desktop

Desktop **WebView host** binary `wae-desktop` (crate `wae-desktop`).

**Dev-only** helper: started by `@wae/wae-win32-*` during `wae run`, loading frontend `devUrl` (usually Vite). It is
**not** the shipped product and has **no** self-update path.

End-user updates go through [`wae-updater`](../wae-updater/readme.md) on the **`wae build` product** (native `wae-napi`
addon in `lib/`).

```bash
cargo run -p wae-desktop -- --url http://127.0.0.1:5173/
```

Windows requires [WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/) installed.
