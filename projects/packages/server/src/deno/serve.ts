/** Deno request entry — returns fetch handler wired to `app.fetch`. */

import type { WaeApp, WaeExecutionContext, WaeRequestContext } from '@wae/core';

export type DenoServeOptions<Env = unknown> = {
    port?: number;
    hostname?: string;
    env?: Env;
    services?: WaeRequestContext<Env>['services'];
};

export type DenoFetchHandler = (request: Request) => Promise<Response>;

type DenoServeHandlerInfo = {
    context?: {
        waitUntil?: (promise: Promise<unknown>) => void;
    };
};

type DenoGlobal = {
    serve?: (
        opts: { port?: number; hostname?: string },
        handler: (request: Request, info: DenoServeHandlerInfo) => Response | Promise<Response>,
    ) => void;
};

function createRequestContext<Env, Services extends Record<string, unknown>>(
    app: WaeApp<Env, Services>,
    request: Request,
    options: DenoServeOptions<Env>,
    execution?: WaeExecutionContext,
): WaeRequestContext<Env, Services> {
    const env = (options.env ?? {}) as Env;
    const services = (options.services ?? {}) as Services;
    return {
        env,
        services,
        signal: request.signal,
        execution,
    };
}

/**
 * Return a fetch handler for `app.fetch`, and call `Deno.serve` when the Deno runtime is present.
 */
export function serve<Env = unknown, Services extends Record<string, unknown> = Record<string, unknown>>(
    app: WaeApp<Env, Services>,
    options: DenoServeOptions<Env> = {},
): DenoFetchHandler {
    const fetchHandler = (request: Request, execution?: WaeExecutionContext) =>
        app.fetch(request, createRequestContext(app, request, options, execution));

    const deno = (globalThis as { Deno?: DenoGlobal }).Deno;
    if (deno?.serve) {
        deno.serve({ port: options.port ?? 3000, hostname: options.hostname }, (request, info) => {
            const waitUntil = info.context?.waitUntil;
            const execution = waitUntil ? { waitUntil: (task: Promise<unknown>) => waitUntil(task) } : undefined;
            return fetchHandler(request, execution);
        });
    }

    return (request) => fetchHandler(request);
}
