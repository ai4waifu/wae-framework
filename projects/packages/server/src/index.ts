/** @wae/server — Node.js / Deno 常驻服务端宿主（子路径 `/node`、`/deno`）。 */

export {
    createApp,
    createServer,
    route,
    type CreateAppOptions,
    type CreateServerOptions,
    type HttpMethod,
    type JsonValue,
    type Route,
    type RouteHandler,
    type WaeApp,
    type WaeContext,
    type WaeExecutionContext,
    type WaeRequest,
    type WaeRequestContext,
    type WaeServerApp,
} from '@wae/core';
