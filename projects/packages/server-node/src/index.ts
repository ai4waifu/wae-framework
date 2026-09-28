/** @wae/server-node — 长驻进程适配（骨架：不直接依赖 node:http，便于类型检查）。 */

import type { WaeServerApp } from '@wae/server';

export type ServeOptions = {
    port?: number;
    hostname?: string;
};

export type ServeHandle = {
    port: number;
    hostname: string;
    close(): Promise<void>;
};

/**
 * 启动长驻 HTTP 服务。
 * 实现阶段将桥接 `node:http` / Bun.serve；骨架仅登记配置。
 */
export function serve(app: WaeServerApp, options: ServeOptions = {}): ServeHandle {
    const port = options.port ?? 3000;
    const hostname = options.hostname ?? '127.0.0.1';
    void app;
    return {
        port,
        hostname,
        async close() {},
    };
}
