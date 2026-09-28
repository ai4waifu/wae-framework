/** Shared native addon paths for `@wae/wae-*` platform shells. */

export const PLATFORM_NATIVE = {
    'win32-x64': {
        dir: 'wae-win32-x64',
        lib: 'win32-x64-msvc.node',
        triple: 'x86_64-pc-windows-msvc',
        ciOs: 'windows-latest',
    },
    'win32-arm64': {
        dir: 'wae-win32-arm64',
        lib: 'win32-arm64-msvc.node',
        triple: 'aarch64-pc-windows-msvc',
        ciOs: 'windows-latest',
    },
    'darwin-x64': {
        dir: 'wae-darwin-x64',
        lib: 'darwin-x64.node',
        triple: 'x86_64-apple-darwin',
        ciOs: 'macos-latest',
    },
    'darwin-arm64': {
        dir: 'wae-darwin-arm64',
        lib: 'darwin-arm64.node',
        triple: 'aarch64-apple-darwin',
        ciOs: 'macos-latest',
    },
    'linux-x64': {
        dir: 'wae-linux-x64',
        lib: 'linux-x64-gnu.node',
        triple: 'x86_64-unknown-linux-gnu',
        ciOs: 'ubuntu-latest',
    },
    'linux-arm64': {
        dir: 'wae-linux-arm64',
        lib: 'linux-arm64-gnu.node',
        triple: 'aarch64-unknown-linux-gnu',
        ciOs: 'ubuntu-latest',
    },
    'android-arm64': {
        dir: 'wae-android-arm64',
        lib: 'android-arm64.node',
        triple: 'aarch64-linux-android',
        ciOs: null,
    },
    'ios-arm64': {
        dir: 'wae-ios-arm64',
        lib: 'ios-arm64.node',
        triple: 'aarch64-apple-ios',
        ciOs: null,
    },
};

/** Desktop/mobile shells published with a prebuilt `lib/*.node`. */
export const PUBLISH_NATIVE_PLATFORMS = Object.keys(PLATFORM_NATIVE);

export function platformDir(platformId) {
    const entry = PLATFORM_NATIVE[platformId];
    if (!entry) throw new Error(`unknown platform id: ${platformId}`);
    return entry.dir;
}

export function libFileName(platformId) {
    return PLATFORM_NATIVE[platformId].lib;
}

export function rustTriple(platformId) {
    return PLATFORM_NATIVE[platformId].triple;
}

export function libPath(root, platformId) {
    const { dir, lib } = PLATFORM_NATIVE[platformId];
    return `${root}/projects/packages/${dir}/lib/${lib}`;
}

/** CI matrix rows: one runner OS builds every triple that lists that `ciOs`. */
export function ciPublishMatrix() {
    const byOs = new Map();
    for (const [platformId, meta] of Object.entries(PLATFORM_NATIVE)) {
        if (!meta.ciOs) continue;
        const row = byOs.get(meta.ciOs) ?? { os: meta.ciOs, platforms: [] };
        row.platforms.push(platformId);
        byOs.set(meta.ciOs, row);
    }
    return [...byOs.values()];
}
