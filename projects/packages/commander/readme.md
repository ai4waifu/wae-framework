# `@wae/commander`

Reusable WAE CLI command tree built on [Commander.js](https://github.com/tj/commander.js).

- Defines subcommands: `run`, `dev`, `build`, `create`, …
- Does **not** import Vite, platform packages, or native addons
- `@wae/wae` injects handlers (`run`, `stub`)

**Product updates** are **not** a CLI concern: upgrade `@wae/wae` via npm. **Shipped apps** (`wae build` products) use
the Rust [`wae-updater`](../../crates/wae-updater/readme.md) crate against **your app's** GitHub Releases (native
`wae-napi` addon in `lib/`).

```ts
import { runWaeCli } from "@wae/commander";

await runWaeCli(process.argv.slice(2), {
  run: (options, mode) => cmdRun(options, { mode }),
  build: (options) => cmdBuild(options),
});
```

`@wae/wae` is the reference consumer: Commander parses flags once, handlers receive `WaeRunOptions` / `WaeBuildOptions`.
