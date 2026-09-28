/** Node.js / Bun long-lived HTTP host. */

import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { Readable } from 'node:stream';
import type { WaeApp, WaeRequestContext, WaeExecutionContext } from '@wae/core';

export type ServeOptions<Env = unknown, Services extends Record<string, unknown> = Record<string, unknown>> = {
    port?: number;
    hostname?: string;
    env?: Env;
    services?: Services | ((env: Env) => Services);
    /** Await pending `waitUntil` tasks when `close()` is called. Default `true`. */
    drainWaitUntilOnClose?: boolean;
};

export type ServeHandle = {
    port: number;
    hostname: string;
    close(): Promise<void>;
};

function incomingToRequest(req: http.IncomingMessage, baseUrl: string): Request {
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
    const method = req.method ?? 'GET';
    const hasBody = method !== 'GET' && method !== 'HEAD';
    if (hasBody) {
        return new Request(url, {
            method,
            headers,
            body: Readable.toWeb(req) as BodyInit,
            duplex: 'half',
        } as RequestInit);
    }
    return new Request(url, { method, headers });
}

async function sendResponse(res: http.ServerResponse, web: Response): Promise<void> {
    res.statusCode = web.status;
    web.headers.forEach((value, key) => {
        res.setHeader(key, value);
    });
    if (web.body) {
        const reader = web.body.getReader();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
        }
    }
    res.end();
}

function createNodeExecution(background: Set<Promise<unknown>>): WaeExecutionContext {
    return {
        waitUntil(task) {
            background.add(task);
            void task.finally(() => {
                background.delete(task);
            });
        },
    };
}

async function drainBackground(background: Set<Promise<unknown>>): Promise<void> {
    if (background.size === 0) return;
    await Promise.allSettled([...background]);
}

/**
 * Start a long-lived HTTP server backed by `node:http`.
 */
export async function serve<Env = unknown, Services extends Record<string, unknown> = Record<string, unknown>>(
    app: WaeApp<Env, Services>,
    options: ServeOptions<Env, Services> = {},
): Promise<ServeHandle> {
    const hostname = options.hostname ?? '127.0.0.1';
    const port = options.port ?? 3000;
    const env = (options.env ?? {}) as Env;
    const drainWaitUntilOnClose = options.drainWaitUntilOnClose ?? true;
    const background = new Set<Promise<unknown>>();

    const server = http.createServer(async (req, res) => {
        try {
            const hostHeader = req.headers.host ?? `${hostname}:${port}`;
            const request = incomingToRequest(req, `http://${hostHeader}`);
            const services =
                typeof options.services === 'function'
                    ? (options.services as (e: Env) => Services)(env)
                    : ((options.services as Services | undefined) ?? ({} as Services));
            const context: WaeRequestContext<Env, Services> = {
                env,
                services,
                signal: request.signal,
                execution: createNodeExecution(background),
            };
            const response = await app.fetch(request, context);
            await sendResponse(res, response);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            if (!res.headersSent) {
                res.statusCode = 500;
            }
            res.end(message);
        }
    });

    await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, hostname, () => resolve());
    });

    const address = server.address() as AddressInfo;

    return {
        port: address.port,
        hostname: address.address,
        close() {
            return new Promise<void>((resolve, reject) => {
                server.close((error) => {
                    if (error) {
                        reject(error);
                        return;
                    }
                    if (!drainWaitUntilOnClose) {
                        resolve();
                        return;
                    }
                    void drainBackground(background).then(() => resolve());
                });
            });
        },
    };
}
