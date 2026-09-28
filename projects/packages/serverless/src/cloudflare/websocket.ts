/** Cloudflare Workers WebSocket upgrade — uses platform `WebSocketPair`. */

import { adaptWebSocket, createWebSocketContext, type WebSocketApp } from '@wae/core/websocket';
import type { WaeRequestContext } from '@wae/core';

export type CloudflareWebSocketPair = {
    0: WebSocket;
    1: WebSocket;
    new (): CloudflareWebSocketPair;
};

export type CloudflareWebSocketRuntime = {
    WebSocketPair: CloudflareWebSocketPair;
    /** Conformance-only: avoid Node `Response` rejecting status `101`. */
    createUpgradeResponse?: (client: WebSocket) => Response;
};

function resolveRuntime(runtime?: CloudflareWebSocketRuntime): CloudflareWebSocketRuntime {
    if (runtime) return runtime;
    const globalPair = (globalThis as { WebSocketPair?: CloudflareWebSocketPair }).WebSocketPair;
    if (!globalPair) {
        throw new Error('WebSocketPair is unavailable — run on Cloudflare Workers or inject a test runtime');
    }
    return { WebSocketPair: globalPair };
}

export async function upgradeWebSocket<Env = unknown, Services extends Record<string, unknown> = Record<string, unknown>>(
    request: Request,
    wsApp: WebSocketApp<Env, Services>,
    requestContext: WaeRequestContext<Env, Services>,
    runtime?: CloudflareWebSocketRuntime,
): Promise<Response | null> {
    const route = wsApp.match(request);
    if (!route) return null;

    const ctx = createWebSocketContext(requestContext);
    const { WebSocketPair } = resolveRuntime(runtime);
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    const ws = adaptWebSocket(server);

    const run = route.handler(ws, ctx);
    if (run instanceof Promise) {
        ctx.waitUntil(run);
    }

    const createUpgradeResponse =
        runtime?.createUpgradeResponse ??
        ((client: WebSocket) => new Response(null, { status: 101, webSocket: client } as ResponseInit & { webSocket: WebSocket }));
    return createUpgradeResponse(client);
}
