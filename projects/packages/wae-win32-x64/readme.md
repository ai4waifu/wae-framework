# `@wae/wae-win32-x64`

Windows x64 desktop shell. Native addon: **`lib/win32-x64-msvc.node`** (WebView2 + Win32 via `wae-napi`).

```bash
pnpm --filter @wae/wae-win32-x64 run build:native   # compile .node into lib/
pnpm --filter @wae-example/integration-vue-app exec wae run --platform win32-x64
```

`src/index.ts` loads `lib/win32-x64-msvc.node` inline; falls back to `wae-desktop` binary in the WAE repo during
development.
