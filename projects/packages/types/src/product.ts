/** Shipped app identity — matches `wae-product.json` written by `wae build`. */

export type ClientPlatformId =
    | 'web'
    | 'unknown-wasm32'
    | 'win32-x64'
    | 'win32-arm64'
    | 'darwin-x64'
    | 'darwin-arm64'
    | 'linux-x64'
    | 'linux-arm64'
    | 'android-arm64'
    | 'ios-arm64';

export type WaeProductUpdateChannel = 'stable' | 'beta' | (string & {});

export type WaeProductDownloadPolicy = 'checkOnly' | 'downloadIfAvailable' | 'downloadAndApply';

export type WaeProductUpdateConfig = {
    /** GitHub `owner/repo` for **your app** releases. */
    github: string;
    /** Release channel. Default `stable`. Use a tag string for pinned/nightly builds. */
    channel?: WaeProductUpdateChannel;
    /** `checkOnly` (explicit UI), `downloadIfAvailable` (silent fetch), `downloadAndApply` (full auto). */
    downloadPolicy?: WaeProductDownloadPolicy;
    /** @deprecated Use `channel: "beta"` instead. */
    allowPrerelease?: boolean;
    /** @deprecated Use `channel: "<tag>"` instead. */
    tag?: string;
};

export type WaeProductManifest = {
    schemaVersion: 1;
    name: string;
    version: string;
    platform: ClientPlatformId;
    /** Native addon path relative to manifest (desktop/mobile builds only). */
    nativePath?: string;
    /** Frontend bundle directory relative to manifest (e.g. `frontend`). */
    frontendDir?: string;
    update?: WaeProductUpdateConfig;
};

export const WAE_PRODUCT_MANIFEST = 'wae-product.json';
