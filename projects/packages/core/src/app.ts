/** Shared Fetch HTTP application model (platform-neutral). */

import type { WaeError } from '@wae/types';

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

function toHandlerError(error: unknown): WaeError {
    if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        'message' in error &&
        typeof (error as WaeError).message === 'string'
    ) {
        return error as WaeError;
    }
    return {
        code: 'Internal',
        message: error instanceof Error ? error.message : String(error),
    };
}

export type WaeExecutionContext = {
    waitUntil(task: Promise<unknown>): void;
};

export type WaeRequestContext<Env = unknown, Services = Record<string, unknown>> = {
    env: Env;
    services: Services;
    execution?: WaeExecutionContext;
    signal?: AbortSignal;
    platform?: Record<string, unknown>;
};

/** Application-layer request view derived from the standard Request. */
export type WaeRequest = {
    method: string;
    url: URL;
    headers: Headers;
    raw: Request;
    params: Record<string, string>;
};

export type WaeContext<Env = unknown, Services = Record<string, unknown>> = {
    request: WaeRequest;
    env: Env;
    services: Services;
    signal: AbortSignal;
    waitUntil(task: Promise<unknown>): void;
    json(data: JsonValue, init?: ResponseInit): Response;
    text(data: string, init?: ResponseInit): Response;
    platform?: Record<string, unknown>;
};

export type RouteHandler<Env = unknown, Services = Record<string, unknown>> = (ctx: WaeContext<Env, Services>) => Promise<Response> | Response;

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' | '*';

export type Route<Env = unknown, Services = Record<string, unknown>> = {
    method: HttpMethod;
    path: string;
    handler: RouteHandler<Env, Services>;
};

export function route<Env = unknown, Services = Record<string, unknown>>(
    method: HttpMethod,
    path: string,
    handler: RouteHandler<Env, Services>,
): Route<Env, Services>;
export function route<Env = unknown, Services = Record<string, unknown>>(
    path: string,
    handler: RouteHandler<Env, Services>,
): Route<Env, Services>;
export function route(methodOrPath: string, pathOrHandler: string | RouteHandler, maybeHandler?: RouteHandler): Route {
    if (typeof pathOrHandler === 'function') {
        return { method: '*', path: methodOrPath, handler: pathOrHandler };
    }
    return {
        method: methodOrPath as HttpMethod,
        path: pathOrHandler,
        handler: maybeHandler as RouteHandler,
    };
}

export type CreateAppOptions<Env = unknown, Services = Record<string, unknown>> = {
    routes?: Route<Env, Services>[];
    services?: Services | ((env: Env) => Services);
    middleware?: Array<(ctx: WaeContext<Env, Services>, next: () => Promise<Response>) => Promise<Response> | Response>;
};

export interface WaeApp<Env = unknown, Services = Record<string, unknown>> {
    fetch(request: Request, context?: WaeRequestContext<Env, Services> | Env, execution?: WaeExecutionContext): Promise<Response>;
}

/** @deprecated Use `WaeApp`. */
export type WaeServerApp<Env = unknown, Services = Record<string, unknown>> = WaeApp<Env, Services>;

/** @deprecated Use `CreateAppOptions`. */
export type CreateServerOptions<Env = unknown, Services = Record<string, unknown>> = CreateAppOptions<Env, Services>;

function matchPath(pattern: string, pathname: string): Record<string, string> | null {
    if (pattern === pathname) return {};
    const patternParts = pattern.split('/').filter(Boolean);
    const pathParts = pathname.split('/').filter(Boolean);
    if (patternParts.length !== pathParts.length) return null;
    const params: Record<string, string> = {};
    for (let i = 0; i < patternParts.length; i++) {
        const pp = patternParts[i]!;
        const vp = pathParts[i]!;
        if (pp.startsWith(':')) {
            params[pp.slice(1)] = decodeURIComponent(vp);
            continue;
        }
        if (pp !== vp) return null;
    }
    return params;
}

function createContext<Env, Services>(
    request: Request,
    params: Record<string, string>,
    env: Env,
    services: Services,
    execution: WaeExecutionContext | undefined,
    signal: AbortSignal,
    platform: Record<string, unknown> | undefined,
): WaeContext<Env, Services> {
    const url = new URL(request.url);
    return {
        request: {
            method: request.method.toUpperCase(),
            url,
            headers: request.headers,
            raw: request,
            params,
        },
        env,
        services,
        signal,
        platform,
        waitUntil(task) {
            execution?.waitUntil(task);
        },
        json(data, init) {
            return Response.json(data, init);
        },
        text(data, init) {
            return new Response(data, {
                ...init,
                headers: {
                    'content-type': 'text/plain; charset=utf-8',
                    ...(init?.headers ?? {}),
                },
            });
        },
    };
}

export function createApp<Env = unknown, Services extends Record<string, unknown> = Record<string, unknown>>(
    options: CreateAppOptions<Env, Services> = {},
): WaeApp<Env, Services> {
    const routes = options.routes ?? [];
    const middleware = options.middleware ?? [];

    return {
        async fetch(request, contextOrEnv, execution) {
            let env = undefined as Env;
            let services = {} as Services;
            let exec = execution;
            let platform: Record<string, unknown> | undefined;
            let signal = request.signal;

            if (contextOrEnv && typeof contextOrEnv === 'object' && 'env' in (contextOrEnv as object)) {
                const ctx = contextOrEnv as WaeRequestContext<Env, Services>;
                env = ctx.env;
                services =
                    ctx.services ??
                    (typeof options.services === 'function'
                        ? (options.services as (e: Env) => Services)(env)
                        : ((options.services as Services | undefined) ?? ({} as Services)));
                exec = ctx.execution ?? execution;
                platform = ctx.platform;
                signal = ctx.signal ?? request.signal;
            } else {
                env = contextOrEnv as Env;
                services =
                    typeof options.services === 'function'
                        ? (options.services as (e: Env) => Services)(env)
                        : ((options.services as Services | undefined) ?? ({} as Services));
            }

            const url = new URL(request.url);
            const method = request.method.toUpperCase();
            let matched: Route<Env, Services> | undefined;
            let params: Record<string, string> = {};
            let pathMatched = false;

            for (const candidate of routes) {
                const found = matchPath(candidate.path, url.pathname);
                if (!found) continue;
                if (candidate.method !== '*' && candidate.method !== method) {
                    pathMatched = true;
                    continue;
                }
                matched = candidate;
                params = found;
                break;
            }

            const ctx = createContext(request, params, env, services, exec, signal, platform);

            const runHandler = async (): Promise<Response> => {
                if (!matched) {
                    if (pathMatched) {
                        return new Response('Method Not Allowed', { status: 405 });
                    }
                    return new Response('Not Found', { status: 404 });
                }
                return matched.handler(ctx);
            };

            let index = -1;
            const dispatch = async (i: number): Promise<Response> => {
                if (i <= index) throw new Error('next() called multiple times');
                index = i;
                const layer = middleware[i];
                if (!layer) return runHandler();
                return layer(ctx, () => dispatch(i + 1));
            };

            try {
                return await dispatch(0);
            } catch (error) {
                return Response.json(toHandlerError(error), { status: 500 });
            }
        },
    };
}

/** @deprecated Use `createApp`. */
export const createServer = createApp;
