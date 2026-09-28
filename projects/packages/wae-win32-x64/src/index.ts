/** @wae/wae-win32-x64 — native host shell (lib/win32-x64-msvc.node). */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { WaeNativeAddon } from '@wae/types';

const PACKAGE_NAME = '@wae/wae-win32-x64';
const NATIVE_LIB = 'win32-x64-msvc.node';

const require = createRequire(import.meta.url);
const nativePath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'lib', NATIVE_LIB);

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

function findWorkspaceRoot(start: string): string | null {
    let dir = start;
    for (let i = 0; i < 12; i++) {
        const cargo = path.join(dir, 'Cargo.toml');
        if (fs.existsSync(cargo)) {
            const text = fs.readFileSync(cargo, 'utf8');
            if (text.includes('wae-desktop') || text.includes('projects/crates/wae-desktop')) {
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
    const exe = path.join(workspaceRoot, 'target', 'debug', process.platform === 'win32' ? 'wae-desktop.exe' : 'wae-desktop');
    if (fs.existsSync(exe)) {
        return { cmd: exe, args: [], cwd: workspaceRoot };
    }
    return {
        cmd: 'cargo',
        args: ['run', '-p', 'wae-desktop', '--'],
        cwd: workspaceRoot,
    };
}

function spawnDesktop(url: string, title: string): Promise<void> {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const root = findWorkspaceRoot(here);
    if (!root) {
        throw new Error('找不到含 wae-desktop 的 workspace 根。请在 WAE 仓库内开发，或先 cargo build -p wae-desktop。');
    }
    const { cmd, args, cwd } = resolveDesktopBinary(root);
    const fullArgs = [...args, '--url', url];
    console.log(`[${PACKAGE_NAME}] spawn ${cmd} ${fullArgs.join(' ')}`);
    return new Promise((resolve, reject) => {
        const child = spawn(cmd, fullArgs, {
            cwd,
            stdio: 'inherit',
            env: { ...process.env, WAE_WINDOW_TITLE: title },
            windowsHide: false,
        });
        child.on('error', reject);
        child.on('exit', (code: number | null) => {
            if (code === 0 || code === null) resolve();
            else reject(new Error(`wae-desktop exited with code ${code}`));
        });
    });
}

async function runDesktop(url: string, title: string, undecorated = false): Promise<void> {
    const native = loadNative();
    if (native) {
        console.log(`[${PACKAGE_NAME}] openDesktop ${url}`);
        native.openDesktop({ url, title, undecorated });
        return;
    }
    await spawnDesktop(url, title);
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
    undecorated?: boolean;
};

function envFlag(name: string): boolean {
    const value = process.env[name];
    return value === '1' || value === 'true' || value === 'TRUE' || value === 'yes';
}

export type WaeApp = {
    close(): Promise<void>;
};

export interface WaePlatform {
    readonly id: 'win32-x64';
    start(options: StartOptions): Promise<WaeApp>;
    build(options: BuildOptions): Promise<void>;
    run(options: RunOptions): Promise<void>;
}

export const platform: WaePlatform = {
    id: 'win32-x64',
    async start(options) {
        const url = options.url ?? 'http://127.0.0.1:5173/';
        const runPromise = runDesktop(url, 'WAE');
        return {
            async close() {
                await runPromise.catch(() => {});
            },
        };
    },
    async build(_options) {},
    async run(options) {
        const url = options.url ?? 'http://127.0.0.1:5173/';
        const title = options.title ?? 'WAE Desktop';
        const undecorated = options.undecorated ?? envFlag('WAE_UNDECORATED');
        await runDesktop(url, title, undecorated);
    },
};

export default platform;
