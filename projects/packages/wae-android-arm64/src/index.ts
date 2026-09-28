/** @wae/wae-android-arm64 — native host shell (lib/android-arm64.node). */

import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { WaeNativeAddon } from '@wae/types';

const PACKAGE_NAME = '@wae/wae-android-arm64';
const NATIVE_LIB = 'android-arm64.node';

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

async function runDesktop(url: string, title: string, undecorated = false): Promise<void> {
    const native = loadNative();
    if (!native) {
        throw new Error(`[${PACKAGE_NAME}] lib/android-arm64.node missing. From WAE repo run: pnpm run build:native`);
    }
    console.log(`[${PACKAGE_NAME}] openDesktop ${url}`);
    native.openDesktop({ url, title, undecorated });
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
    readonly id: 'android-arm64';
    start(options: StartOptions): Promise<WaeApp>;
    build(options: BuildOptions): Promise<void>;
    run(options: RunOptions): Promise<void>;
}

export const platform: WaePlatform = {
    id: 'android-arm64',
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
        await runDesktop(url, title);
    },
};

export default platform;
