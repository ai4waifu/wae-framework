/** Deno WebSocket upgrade — uses `Deno.upgradeWebSocket` when available. */

import type { WaeRequestContext } from '@wae/core';
import { adaptWebSocket, createWebSocketContext, type WebSocketApp } from '@wae/core/websocket';

type DenoUpgradeWebSocket = (request: Request) => { socket: WebSocket; response: Response };

type DenoGlobal = {
    upgradeWebSocket?: DenoUpgradeWebSocket;
};

export function upgradeWebSocket<Env = unknown, Services extends Record<string, unknown> = Record<string, unknown>>(
    request: Request,
    wsApp: WebSocketApp<Env, Services>,
    requestContext: WaeRequestContext<Env, Services>,
    runtime?: { upgradeWebSocket: DenoUpgradeWebSocket },
): Response | null {
    const route = wsApp.match(request);
    if (!route) return null;

    const upgrade = runtime?.upgradeWebSocket ?? (globalThis as { Deno?: DenoGlobal }).Deno?.upgradeWebSocket;
    if (!upgrade) {
        throw new Error('Deno.upgradeWebSocket is unavailable — run on Deno or inject a test runtime');
    }

    const { socket, response } = upgrade(request);
    const ws = adaptWebSocket(socket);
    const ctx = createWebSocketContext(requestContext);
    const run = route.handler(ws, ctx);
    if (run instanceof Promise) {
        ctx.waitUntil(run);
    }
    return response;
}
