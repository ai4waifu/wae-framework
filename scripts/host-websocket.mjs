#!/usr/bin/env node
/**
 * host-websocket — shared WebSocket contract across core router and host upgrade adapters.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packagesRoot = path.join(root, 'projects/packages');

function buildPackages() {
    for (const name of ['@wae/types', '@wae/core', '@wae/server', '@wae/serverless']) {
        const r = spawnSync('pnpm', ['--filter', name, 'run', 'build'], {
            cwd: root,
            stdio: 'inherit',
            shell: true,
            windowsHide: true,
        });
        if (r.status !== 0) process.exit(r.status ?? 1);
    }
}

class MockSocket {
    /** @type {Map<'message' | 'close', Set<(event: any) => void>>} */
    listeners = new Map();
    /** @type {MockSocket | null} */
    peer = null;
    sent = [];

    addEventListener(type, listener) {
        let set = this.listeners.get(type);
        if (!set) {
            set = new Set();
            this.listeners.set(type, set);
        }
        set.add(listener);
    }

    removeEventListener(type, listener) {
        this.listeners.get(type)?.delete(listener);
    }

    send(data) {
        this.sent.push(data);
        const peerSet = this.peer?.listeners.get('message');
        if (peerSet) {
            for (const listener of peerSet) {
                listener({ data });
            }
        }
    }

    close(code = 1000, reason = '') {
        const closeSet = this.listeners.get('close');
        if (closeSet) {
            for (const listener of closeSet) {
                listener({ code, reason, wasClean: true });
            }
        }
    }
}

class MockWebSocketPair {
    constructor() {
        this[0] = new MockSocket();
        this[1] = new MockSocket();
        this[0].peer = this[1];
        this[1].peer = this[0];
    }
}

function websocketRequest(url) {
    return new Request(url, {
        headers: {
            Upgrade: 'websocket',
            Connection: 'Upgrade',
            'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
            'Sec-WebSocket-Version': '13',
        },
    });
}

buildPackages();

const { createWebSocketApp, websocketRoute } = await import(pathToFileURL(path.join(packagesRoot, 'core/dist/websocket/index.js')).href);
const { upgradeWebSocket: upgradeCloudflareWebSocket } = await import(
    pathToFileURL(path.join(packagesRoot, 'serverless/dist/cloudflare/websocket.js')).href
);
const { upgradeWebSocket: upgradeDenoWebSocket } = await import(pathToFileURL(path.join(packagesRoot, 'server/dist/deno/websocket.js')).href);
const { upgradeWebSocket: upgradeNodeWebSocket } = await import(pathToFileURL(path.join(packagesRoot, 'server/dist/node/websocket.js')).href);

const wsApp = createWebSocketApp({
    routes: [
        websocketRoute('/ws', (ws) => {
            ws.addEventListener('message', (event) => {
                ws.send(`echo:${event.data}`);
            });
        }),
    ],
});

assert.equal(wsApp.match(new Request('http://test/ws')), null);
assert.ok(wsApp.match(websocketRequest('http://test/ws')));
assert.equal(wsApp.match(websocketRequest('http://test/missing')), null);

const requestContext = {
    env: {},
    services: {},
    signal: new AbortController().signal,
    execution: { waitUntil: () => {} },
};

const runtimePair = new MockWebSocketPair();
await upgradeCloudflareWebSocket(websocketRequest('http://test/ws'), wsApp, requestContext, {
    WebSocketPair: class extends MockWebSocketPair {
        constructor() {
            super();
            runtimePair[0] = this[0];
            runtimePair[1] = this[1];
        }
    },
    createUpgradeResponse: (client) => ({ status: 101, webSocket: client }),
});
runtimePair[0].send('ping');
assert.deepEqual(runtimePair[1].sent, ['echo:ping']);

const denoPair = new MockWebSocketPair();
const denoResponse = upgradeDenoWebSocket(websocketRequest('http://deno/ws'), wsApp, requestContext, {
    upgradeWebSocket(request) {
        const pair = new MockWebSocketPair();
        denoPair[0] = pair[0];
        denoPair[1] = pair[1];
        return { socket: pair[1], response: { status: 101, webSocket: pair[0] } };
    },
});
assert.equal(denoResponse.status, 101);
denoPair[0].send('hello');
assert.deepEqual(denoPair[1].sent, ['echo:hello']);

assert.throws(() => upgradeNodeWebSocket(), /not wired yet/);

console.log('host-websocket: ok');
