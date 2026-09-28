/** Node-API native addon surface (`wae-napi` cdylib). Types only. */

export type OpenDesktopOptions = {
    url: string;
    title?: string;
    undecorated?: boolean;
};

export type ProductUpdateChannel = 'stable' | 'beta' | (string & {});

export type ProductDownloadPolicy = 'checkOnly' | 'downloadIfAvailable' | 'downloadAndApply';

export type ProductUpdateOptions = {
    repo: string;
    productName: string;
    nativePath: string;
    currentVersion: string;
    channel?: ProductUpdateChannel;
    downloadPolicy?: ProductDownloadPolicy;
    /** @deprecated Use `channel: "beta"`. */
    allowPrerelease?: boolean;
    /** @deprecated Use `channel: "<tag>"`. */
    tag?: string;
    /** From a prior `downloadProductUpdate` call. */
    stagedNativePath?: string;
};

export type ProductUpdateStatus = {
    upToDate: boolean;
    current: string;
    latest?: string;
    tag?: string;
    releaseUrl?: string;
    assetName?: string;
    channel?: string;
    downloadPolicy?: string;
    stagedNativePath?: string;
};

export type WaeNativeAddon = {
    hostVersion(): string;
    handleClientMessage(json: string): string | null;
    openDesktop(options: OpenDesktopOptions): void;
    checkProductUpdate(options: ProductUpdateOptions): ProductUpdateStatus;
    downloadProductUpdate(options: ProductUpdateOptions): ProductUpdateStatus;
    applyProductUpdate(options: ProductUpdateOptions): ProductUpdateStatus;
};
