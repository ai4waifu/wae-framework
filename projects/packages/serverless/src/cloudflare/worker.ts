/** Cloudflare Workers fetch entry — calls `app.fetch` directly (no adaptFetch layer). */

import type { WaeApp, WaeRequestContext } from '@wae/core';

export type CloudflareExecutionContext = {
    waitUntil(promise: Promise<unknown>): void;
    passThroughOnException?: () => void;
};

export type CloudflareWorkerExport<Env = unknown> = {
    fetch(request: Request, env: Env, ctx: CloudflareExecutionContext): Promise<Response>;
};

export function worker<Env = unknown, Services extends Record<string, unknown> = Record<string, unknown>>(
    app: WaeApp<Env, Services>,
    options: {
        services?: Services | ((env: Env) => Services);
    } = {},
): CloudflareWorkerExport<Env> {
    return {
        async fetch(request, env, ctx) {
            const services =
                typeof options.services === 'function'
                    ? (options.services as (e: Env) => Services)(env)
                    : ((options.services as Services | undefined) ?? ({} as Services));

            const context: WaeRequestContext<Env, Services> = {
                env,
                services,
                execution: {
                    waitUntil: (task) => ctx.waitUntil(task),
                },
                signal: request.signal,
                platform: { raw: ctx },
            };

            return app.fetch(request, context);
        },
    };
}

/** @deprecated Use `worker`. */
export const createCloudflareApp = worker;

/** @deprecated Use `worker`. */
export const createWorker = worker;

export type KeyValueStore = {
    get<T = string>(key: string): Promise<T | null>;
    put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
    delete(key: string): Promise<void>;
};

export function cloudflareKv(binding: {
    get(key: string): Promise<string | null>;
    put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
    delete(key: string): Promise<void>;
}): KeyValueStore {
    return {
        async get<T = string>(key: string) {
            const value = await binding.get(key);
            if (value == null) return null;
            try {
                return JSON.parse(value) as T;
            } catch {
                return value as T;
            }
        },
        async put(key, value, options) {
            await binding.put(key, value, options);
        },
        async delete(key) {
            await binding.delete(key);
        },
    };
}
