#!/usr/bin/env node
/** Generate `src/index.ts` with inline `loadNative()` for each `@wae/wae-*` shell. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLATFORM_NATIVE } from './platform-native-manifest.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const SHELLS = Object.entries(PLATFORM_NATIVE).map(([id, meta]) => ({
    dir: meta.dir,
    id,
    libFile: meta.lib,
    windowsFallback: id.startsWith('win32-'),
}));

function spawnFallbackBlock() {
    return `
function findWorkspaceRoot(start: string): string | null {
    let dir = start;
    for (let i = 0; i < 12; i++) {
        const cargo = path.join(dir, "Cargo.toml");
        if (fs.existsSync(cargo)) {
            const text = fs.readFileSync(cargo, "utf8");
            if (text.includes("wae-desktop") || text.includes("projects/crates/wae-desktop")) {
                return dir;
            }
        }
        const parent = path.dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }
    return null;
}

function resolveDesktopBinary(workspaceRoot: string): { cmd: string; args: string[]; cwd: string } {
    const exe = path.join(
        workspaceRoot,
        "target",
        "debug",
        process.platform === "win32" ? "wae-desktop.exe" : "wae-desktop",
    );
    if (fs.existsSync(exe)) {
        return { cmd: exe, args: [], cwd: workspaceRoot };
    }
    return {
        cmd: "cargo",
        args: ["run", "-p", "wae-desktop", "--"],
        cwd: workspaceRoot,
    };
}

function spawnDesktop(url: string, title: string): Promise<void> {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const root = findWorkspaceRoot(here);
    if (!root) {
        throw new Error(
            "找不到含 wae-desktop 的 workspace 根。请在 WAE 仓库内开发，或先 cargo build -p wae-desktop。",
        );
    }
    const { cmd, args, cwd } = resolveDesktopBinary(root);
    const fullArgs = [...args, "--url", url];
    console.log(\`[\${PACKAGE_NAME}] spawn \${cmd} \${fullArgs.join(" ")}\`);
    return new Promise((resolve, reject) => {
        const child = spawn(cmd, fullArgs, {
            cwd,
            stdio: "inherit",
            env: { ...process.env, WAE_WINDOW_TITLE: title },
            windowsHide: false,
        });
        child.on("error", reject);
        child.on("exit", (code: number | null) => {
            if (code === 0 || code === null) resolve();
            else reject(new Error(\`wae-desktop exited with code \${code}\`));
        });
    });
}
`;
}

function indexTs({ id, dir, libFile, windowsFallback }) {
    const pkg = `@wae/${dir}`;
    const winImports = windowsFallback
        ? `import { spawn } from "node:child_process";
import fs from "node:fs";
`
        : '';
    const spawnFns = windowsFallback ? spawnFallbackBlock() : '';

    const runBody = windowsFallback
        ? `    const native = loadNative();
    if (native) {
        console.log(\`[\${PACKAGE_NAME}] openDesktop \${url}\`);
        native.openDesktop({ url, title, undecorated });
        return;
    }
    await spawnDesktop(url, title);`
        : `    const native = loadNative();
    if (!native) {
        throw new Error(
            \`[\${PACKAGE_NAME}] lib/${libFile} missing. From WAE repo run: pnpm run build:native\`,
        );
    }
    console.log(\`[\${PACKAGE_NAME}] openDesktop \${url}\`);
    native.openDesktop({ url, title, undecorated });`;

    return `/** ${pkg} — native host shell (lib/${libFile}). */

import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { WaeNativeAddon } from "@wae/types";
${winImports}
const PACKAGE_NAME = "${pkg}";
const NATIVE_LIB = "${libFile}";

const require = createRequire(import.meta.url);
const nativePath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "lib", NATIVE_LIB);

let cachedNative: WaeNativeAddon | null | undefined;

function loadNative(): WaeNativeAddon | null {
    if (cachedNative !== undefined) return cachedNative;
    try {
        cachedNative = require(nativePath) as WaeNativeAddon;
        return cachedNative;
    } catch {
        cachedNative = null;
        return null;
    }
}
${spawnFns}
async function runDesktop(url: string, title: string, undecorated = false): Promise<void> {
${runBody}
}

export type StartOptions = {
    entry?: string;
    url?: string;
};

export type BuildOptions = {
    outDir?: string;
};

export type RunOptions = {
    entry?: string;
    url?: string;
    title?: string;
};

export type WaeApp = {
    close(): Promise<void>;
};

export interface WaePlatform {
    readonly id: "${id}";
    start(options: StartOptions): Promise<WaeApp>;
    build(options: BuildOptions): Promise<void>;
    run(options: RunOptions): Promise<void>;
}

export const platform: WaePlatform = {
    id: "${id}",
    async start(options) {
        const url = options.url ?? "http://127.0.0.1:5173/";
        const runPromise = runDesktop(url, "WAE");
        return {
            async close() {
                await runPromise.catch(() => {});
            },
        };
    },
    async build(_options) {},
    async run(options) {
        const url = options.url ?? "http://127.0.0.1:5173/";
        const title = options.title ?? "WAE Desktop";
        await runDesktop(url, title);
    },
};

export default platform;
`;
}

for (const shell of SHELLS) {
    const pkgRoot = path.join(ROOT, 'projects/packages', shell.dir);
    const src = path.join(pkgRoot, 'src');
    fs.mkdirSync(path.join(pkgRoot, 'lib'), { recursive: true });
    const gitkeep = path.join(pkgRoot, 'lib', '.gitkeep');
    if (!fs.existsSync(gitkeep)) fs.writeFileSync(gitkeep, '', 'utf8');

    for (const stale of ['native-loader.ts', 'desktop-run.ts']) {
        const p = path.join(src, stale);
        if (fs.existsSync(p)) fs.rmSync(p);
    }

    fs.writeFileSync(path.join(src, 'index.ts'), indexTs(shell), 'utf8');
    console.log(`synced ${shell.dir}/src/index.ts → lib/${shell.libFile}`);
}
