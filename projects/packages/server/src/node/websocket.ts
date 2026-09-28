/** Node.js WebSocket upgrade — `ws` `noServer` mode on `node:http` upgrade. */

import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import type { WaeRequestContext } from '@wae/core';
import { adaptWebSocket, createWebSocketContext, type WebSocketApp } from '@wae/core/websocket';
import { WebSocketServer, type WebSocket as WsWebSocket } from 'ws';

type NodeUpgradeWebSocket = (request: Request) => { socket: WebSocket; response: Response };

type AdaptableSocket = Parameters<typeof adaptWebSocket>[0];

function adaptNodeWebSocket(rawWs: WsWebSocket): ReturnType<typeof adaptWebSocket> {
    return adaptWebSocket(rawWs as AdaptableSocket);
}

function requestFromIncoming(req: IncomingMessage, baseUrl: string): Request {
    const url = new URL(req.url ?? '/', baseUrl);
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
        if (value === undefined) continue;
        if (Array.isArray(value)) {
            for (const part of value) headers.append(key, part);
        } else {
            headers.set(key, value);
        }
    }
    return new Request(url, { method: req.method ?? 'GET', headers });
}

/**
 * Request-level upgrade hook (conformance / injected runtime).
 * Production Node servers should call `handleWebSocketUpgrade` on `server.on('upgrade')`.
 */
export function upgradeWebSocket<Env = unknown, Services extends Record<string, unknown> = Record<string, unknown>>(
    request: Request,
    wsApp: WebSocketApp<Env, Services>,
    requestContext: WaeRequestContext<Env, Services>,
    runtime?: { upgradeWebSocket: NodeUpgradeWebSocket },
): Response | null {
    const route = wsApp.match(request);
    if (!route) return null;

    const upgrade = runtime?.upgradeWebSocket;
    if (!upgrade) {
        throw new Error(
            'Node.js WebSocket upgrade requires handleWebSocketUpgrade on node:http upgrade or inject a test runtime',
        );
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

let defaultWss: WebSocketServer | undefined;

function resolveWebSocketServer(options?: { wss?: WebSocketServer }): WebSocketServer {
    if (options?.wss) return options.wss;
    if (!defaultWss) {
        defaultWss = new WebSocketServer({ noServer: true });
    }
    return defaultWss;
}

/** Wire `wsApp` to a `node:http` `upgrade` event. Returns `false` when no route matched. */
export function handleWebSocketUpgrade<Env = unknown, Services extends Record<string, unknown> = Record<string, unknown>>(
    req: IncomingMessage,
    socket: Duplex,
    head: Buffer,
    wsApp: WebSocketApp<Env, Services>,
    requestContext: WaeRequestContext<Env, Services>,
    options: { baseUrl?: string; wss?: WebSocketServer } = {},
): boolean {
    const host = req.headers.host ?? '127.0.0.1';
    const baseUrl = options.baseUrl ?? `http://${host}`;
    const request = requestFromIncoming(req, baseUrl);
    const route = wsApp.match(request);
    if (!route) return false;

    const wss = resolveWebSocketServer(options);
    wss.handleUpgrade(req, socket, head, (rawWs) => {
        const ws = adaptNodeWebSocket(rawWs);
        const ctx = createWebSocketContext(requestContext);
        const run = route.handler(ws, ctx);
        if (run instanceof Promise) {
            ctx.waitUntil(run);
        }
    });
    return true;
}
