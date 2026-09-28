import type { ClientPlatformId } from './product.js';

/** Platform ids that ship a native `.node` under `lib/` in `@wae/wae-*`. */
export type NativeShellPlatformId = Exclude<ClientPlatformId, 'web' | 'unknown-wasm32'>;

/** Published native addon basename: `lib/<name>`. */
export const PLATFORM_NATIVE_LIB_FILE: Record<NativeShellPlatformId, string> = {
    'win32-x64': 'win32-x64-msvc.node',
    'win32-arm64': 'win32-arm64-msvc.node',
    'darwin-x64': 'darwin-x64.node',
    'darwin-arm64': 'darwin-arm64.node',
    'linux-x64': 'linux-x64-gnu.node',
    'linux-arm64': 'linux-arm64-gnu.node',
    'android-arm64': 'android-arm64.node',
    'ios-arm64': 'ios-arm64.node',
};

export function platformNativeLibFile(platform: NativeShellPlatformId): string {
    return PLATFORM_NATIVE_LIB_FILE[platform];
}

export function isNativeShellPlatform(platform: ClientPlatformId): platform is NativeShellPlatformId {
    return platform !== 'web' && platform !== 'unknown-wasm32';
}
