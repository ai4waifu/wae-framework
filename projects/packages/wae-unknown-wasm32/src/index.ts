/** @wae/wae-unknown-wasm32 — 一等 WASM 客户端运行时（最小宿主假设） */

export type StartOptions = {
    entry?: string;
};

export type BuildOptions = {
    outDir?: string;
};

export type RunOptions = {
    entry?: string;
};

export type WaeApp = {
    close(): Promise<void>;
};

export interface WaePlatform {
    readonly id: 'unknown-wasm32';
    start(options: StartOptions): Promise<WaeApp>;
    build(options: BuildOptions): Promise<void>;
    run(options: RunOptions): Promise<void>;
}

export const platform: WaePlatform = {
    id: 'unknown-wasm32',
    async start(_options) {
        return {
            async close() {},
        };
    },
    async build(_options) {},
    async run(_options) {},
};

export default platform;
