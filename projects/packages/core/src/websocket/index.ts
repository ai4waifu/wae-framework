/** Platform-neutral WebSocket route matching (HTTP `createApp` stays separate). */

import type { WaeWebSocket, WaeWebSocketListener } from '@wae/types';
import type { WaeRequestContext } from '../app.js';

export type WaeWebSocketContext<Env = unknown, Services extends Record<string, unknown> = Record<string, unknown>> = Pick<
    WaeRequestContext<Env, Services>,
    'env' | 'services' | 'signal' | 'execution'
> & {
    waitUntil(task: Promise<unknown>): void;
};

export type WaeWebSocketHandler<Env = unknown, Services extends Record<string, unknown> = Record<string, unknown>> = (
    ws: WaeWebSocket,
    ctx: WaeWebSocketContext<Env, Services>,
) => void | Promise<void>;

export type WebSocketRoute<Env = unknown, Services extends Record<string, unknown> = Record<string, unknown>> = {
    path: string;
    handler: WaeWebSocketHandler<Env, Services>;
};

export type WebSocketApp<Env = unknown, Services extends Record<string, unknown> = Record<string, unknown>> = {
    routes: WebSocketRoute<Env, Services>[];
    match(request: Request): WebSocketRoute<Env, Services> | null;
};

export function isWebSocketUpgradeRequest(request: Request): boolean {
    return request.headers.get('Upgrade')?.toLowerCase() === 'websocket';
}

export function websocketRoute<Env = unknown, Services extends Record<string, unknown> = Record<string, unknown>>(
    path: string,
    handler: WaeWebSocketHandler<Env, Services>,
): WebSocketRoute<Env, Services> {
    return { path, handler };
}

export function createWebSocketApp<Env = unknown, Services extends Record<string, unknown> = Record<string, unknown>>(options: {
    routes: WebSocketRoute<Env, Services>[];
}): WebSocketApp<Env, Services> {
    const routes = options.routes;
    return {
        routes,
        match(request) {
            if (!isWebSocketUpgradeRequest(request)) return null;
            const pathname = new URL(request.url).pathname;
            for (const route of routes) {
                if (route.path === pathname) return route;
            }
            return null;
        },
    };
}

/** Wrap a platform socket object into the shared `WaeWebSocket` contract. */
export function adaptWebSocket(raw: {
    send(data: string | ArrayBuffer | Uint8Array): void | Promise<void>;
    close(code?: number, reason?: string): void;
    addEventListener(type: 'message' | 'close', listener: (event: Event | MessageEvent | CloseEvent) => void): void;
    removeEventListener(type: 'message' | 'close', listener: (event: Event | MessageEvent | CloseEvent) => void): void;
}): WaeWebSocket {
    const listeners = new Map<'message' | 'close', Set<WaeWebSocketListener>>();
    const bridge = (type: 'message' | 'close') => (event: Event | MessageEvent | CloseEvent) => {
        const set = listeners.get(type);
        if (!set) return;
        if (type === 'message') {
            const message = event as MessageEvent;
            const data = typeof message.data === 'string' ? message.data : new Uint8Array(message.data as ArrayBuffer);
            for (const listener of set) listener({ type: 'message', data });
            return;
        }
        const close = event as CloseEvent;
        for (const listener of set) {
            listener({ type: 'close', code: close.code, reason: close.reason, wasClean: close.wasClean });
        }
    };

    const bridged = {
        message: bridge('message'),
        close: bridge('close'),
    };

    return {
        send(data) {
            return raw.send(data);
        },
        close(code, reason) {
            raw.close(code, reason);
        },
        addEventListener(type, listener) {
            let set = listeners.get(type);
            if (!set) {
                set = new Set();
                listeners.set(type, set);
                raw.addEventListener(type, bridged[type]);
            }
            set.add(listener);
        },
        removeEventListener(type, listener) {
            const set = listeners.get(type);
            if (!set) return;
            set.delete(listener);
            if (set.size === 0) {
                listeners.delete(type);
                raw.removeEventListener(type, bridged[type]);
            }
        },
    };
}

export function createWebSocketContext<Env, Services extends Record<string, unknown>>(
    requestContext: WaeRequestContext<Env, Services>,
): WaeWebSocketContext<Env, Services> {
    return {
        env: requestContext.env,
        services: requestContext.services,
        signal: requestContext.signal,
        execution: requestContext.execution,
        waitUntil(task) {
            if (requestContext.execution?.waitUntil) {
                requestContext.execution.waitUntil(task);
                return;
            }
            throw new Error('waitUntil is unavailable in this WebSocket host context');
        },
    };
}
