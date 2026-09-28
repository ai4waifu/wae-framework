# packages

All publishable `@wae/*` npm packages in a flat directory (when directory name ≠ package name, use `name` from
`package.json`).

| Directory                           | npm package               | Role                                |
|-------------------------------------|---------------------------|-------------------------------------|
| `wae`                               | `@wae/wae`                | CLI · `defineConfig`                |
| `commander`                         | `@wae/commander`          | CLI command tree (Commander.js)     |
| `client`                            | `@wae/client`             | Framework-agnostic frontend runtime |
| `adapter-vue` … `adapter-solid`     | `@wae/adapter-*`          | Framework injection                 |
| `types` / `core` / `protocol`       | `@wae/types` etc.         | Communication layer                 |
| `server`                            | `@wae/server`             | Node / Deno hosts (`/node`, `/deno`) |
| `serverless`                        | `@wae/serverless`         | Edge hosts (`/cloudflare`)          |
| `wae-unknown-wasm32`                | `@wae/wae-unknown-wasm32` | Wasm client (explicit opt-in)       |
| `wae-win32-x64` etc.                | `@wae/wae-*`              | Desktop / mobile platform shells    |

```bash
pnpm --filter @wae/wae run build
pnpm run check:boundary
```
