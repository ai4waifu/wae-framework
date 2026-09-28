/** @wae/server-cloudflare — Workers 适配（经 @wae/serverless）。 */

import type { WaeServerApp } from '@wae/server';
import { adaptFetch } from '@wae/serverless';

export type CloudflareExecutionContext = {
    waitUntil(promise: Promise<unknown>): void;
    passThroughOnException?: () => void;
};

export type CloudflareWorkerExport<Env = unknown> = {
    fetch(request: Request, env: Env, ctx: CloudflareExecutionContext): Promise<Response>;
};

export function createCloudflareApp<Env = unknown>(app: WaeServerApp<Env>): CloudflareWorkerExport<Env> {
    const base = adaptFetch(app);
    return {
        async fetch(request, env, ctx) {
            return base.fetch(request, env, {
                waitUntil: (task) => ctx.waitUntil(task),
                raw: ctx,
            });
        },
    };
}

export const createWorker = createCloudflareApp;

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
