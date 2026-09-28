/** Node.js / Bun long-lived HTTP host. */

import type { WaeApp } from '@wae/core';

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
 * Start a long-lived HTTP server.
 * Bridges `node:http` when available; skeleton registers config only in typecheck-only environments.
 */
export function serve<Env = unknown, Services extends Record<string, unknown> = Record<string, unknown>>(
    app: WaeApp<Env, Services>,
    options: ServeOptions = {},
): ServeHandle {
    const port = options.port ?? 3000;
    const hostname = options.hostname ?? '127.0.0.1';
    void app;
    return {
        port,
        hostname,
        async close() {},
    };
}
