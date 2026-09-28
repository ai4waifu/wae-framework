import type { WaeServerApp } from '@wae/server';

export type ServerlessExecutionContext = {
    waitUntil(task: Promise<unknown>): void;
    raw?: unknown;
};

export type ServerlessFetch<Env = unknown> = (request: Request, env: Env, ctx?: ServerlessExecutionContext) => Promise<Response>;

/** 将 `@wae/server` app 适配为标准 Fetch 导出。 */
export function adaptFetch<Env = unknown>(app: WaeServerApp<Env>): { fetch: ServerlessFetch<Env> } {
    return {
        async fetch(request, env, ctx) {
            return app.fetch(request, {
                env,
                services: {} as never,
                execution: ctx,
                signal: request.signal,
            });
        },
    };
}
