/** Deno request entry — returns fetch handler wired to `app.fetch`. */

import type { WaeApp, WaeRequestContext } from '@wae/core';

export type DenoServeOptions<Env = unknown> = {
    port?: number;
    hostname?: string;
    env?: Env;
    services?: WaeRequestContext<Env>['services'];
};

export type DenoFetchHandler = (request: Request) => Promise<Response>;

export function serve<Env = unknown, Services extends Record<string, unknown> = Record<string, unknown>>(
    app: WaeApp<Env, Services>,
    options: DenoServeOptions<Env> = {},
): DenoFetchHandler {
    const env = options.env ?? ({} as Env);
    const services = (options.services ?? {}) as Services;

    const fetchHandler = (request: Request) =>
        app.fetch(request, {
            env,
            services,
            signal: request.signal,
        });

    const deno = (globalThis as { Deno?: { serve?: (opts: { port?: number; hostname?: string }, handler: DenoFetchHandler) => void } }).Deno;
    if (deno?.serve) {
        deno.serve({ port: options.port ?? 3000, hostname: options.hostname }, fetchHandler);
    }

    return fetchHandler;
}
