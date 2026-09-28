#!/usr/bin/env node
/**
 * host-http — shared HTTP app contract across core fetch, Worker worker(), Deno handler, and Node serve().
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function buildPackages() {
    for (const name of ['@wae/core', '@wae/server', '@wae/serverless']) {
        const r = spawnSync('pnpm', ['--filter', name, 'run', 'build'], {
            cwd: root,
            stdio: 'inherit',
            shell: true,
            windowsHide: true,
        });
        if (r.status !== 0) process.exit(r.status ?? 1);
    }
}

function createFixtureApp(createApp, route) {
    const order = [];
    const app = createApp({
        routes: [
            route('GET', '/health', (ctx) => ctx.json({ ok: true })),
            route('GET', '/users/:id', (ctx) => ctx.json({ id: ctx.request.params.id })),
            route('GET', '/signal', (ctx) => ctx.json({ aborted: ctx.signal.aborted })),
            route('GET', '/bg', (ctx) => {
                ctx.waitUntil(Promise.resolve('bg'));
                return ctx.json({ bg: true });
            }),
            route('GET', '/boom', () => {
                throw new Error('boom');
            }),
        ],
        middleware: [
            async (_ctx, next) => {
                order.push('mw-before');
                const res = await next();
                order.push('mw-after');
                return res;
            },
        ],
    });
    return { app, order };
}

async function testCoreFetch(createApp, route) {
    const { app, order } = createFixtureApp(createApp, route);

    const health = await app.fetch(new Request('http://test/health'));
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { ok: true });
    assert.deepEqual(order, ['mw-before', 'mw-after']);

    order.length = 0;
    const user = await app.fetch(new Request('http://test/users/alice'));
    assert.equal(user.status, 200);
    assert.deepEqual(await user.json(), { id: 'alice' });
    assert.deepEqual(order, ['mw-before', 'mw-after']);

    const missing = await app.fetch(new Request('http://test/missing'));
    assert.equal(missing.status, 404);

    const wrongMethod = await app.fetch(new Request('http://test/health', { method: 'POST' }));
    assert.equal(wrongMethod.status, 405);
    assert.equal(wrongMethod.headers.get('Allow'), 'GET');

    const boom = await app.fetch(new Request('http://test/boom'));
    assert.equal(boom.status, 500);
    assert.deepEqual(await boom.json(), { code: 'Internal', message: 'boom' });

    const ac = new AbortController();
    ac.abort();
    const signalRes = await app.fetch(new Request('http://test/signal'), {
        env: {},
        services: {},
        signal: ac.signal,
    });
    assert.equal(signalRes.status, 200);
    assert.deepEqual(await signalRes.json(), { aborted: true });
}

async function testWorkerExport(createApp, route, worker) {
    const { app, order } = createFixtureApp(createApp, route);
    const waitUntilTasks = [];
    const exported = worker(app);

    const res = await exported.fetch(new Request('http://worker/health'), {}, { waitUntil: (task) => waitUntilTasks.push(task) });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
    assert.deepEqual(order, ['mw-before', 'mw-after']);
    assert.equal(waitUntilTasks.length, 0);

    const bg = await exported.fetch(new Request('http://worker/bg'), {}, { waitUntil: (task) => waitUntilTasks.push(task) });
    assert.equal(bg.status, 200);
    assert.deepEqual(await bg.json(), { bg: true });
    assert.equal(waitUntilTasks.length, 1);
    await waitUntilTasks[0];

    const wrongMethod = await exported.fetch(new Request('http://worker/health', { method: 'POST' }), {}, { waitUntil: () => {} });
    assert.equal(wrongMethod.status, 405);
}

async function testDenoFetchHandler(createApp, route, denoServe) {
    const { app } = createFixtureApp(createApp, route);
    const fetchHandler = denoServe(app);

    const health = await fetchHandler(new Request('http://deno/health'));
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { ok: true });

    const wrongMethod = await fetchHandler(new Request('http://deno/health', { method: 'POST' }));
    assert.equal(wrongMethod.status, 405);
}

async function testNodeServe(createApp, route, serve) {
    const { app } = createFixtureApp(createApp, route);
    const handle = await serve(app, { hostname: '127.0.0.1', port: 0 });

    try {
        const base = `http://${handle.hostname}:${handle.port}`;
        const health = await fetch(`${base}/health`);
        assert.equal(health.status, 200);
        assert.deepEqual(await health.json(), { ok: true });

        const user = await fetch(`${base}/users/bob`);
        assert.equal(user.status, 200);
        assert.deepEqual(await user.json(), { id: 'bob' });

        const missing = await fetch(`${base}/nope`);
        assert.equal(missing.status, 404);

        const wrongMethod = await fetch(`${base}/health`, { method: 'POST' });
        assert.equal(wrongMethod.status, 405);

        const boom = await fetch(`${base}/boom`);
        assert.equal(boom.status, 500);
        assert.deepEqual(await boom.json(), { code: 'Internal', message: 'boom' });
    } finally {
        await handle.close();
    }
}

function createProtocolApp(createApp) {
    return createApp({
        actions: {
            greet: (input) => ({ ok: true, name: input?.name ?? null }),
        },
        rpc: {
            sum: (args) => {
                const { a, b } = args;
                return a + b;
            },
        },
    });
}

async function testProtocol(createApp, worker, serve) {
    const app = createProtocolApp(createApp);

    const action = await app.fetch(
        new Request('http://test/__wae/action/greet', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: 'alice' }),
        }),
    );
    assert.equal(action.status, 200);
    assert.deepEqual(await action.json(), { ok: true, name: 'alice' });

    const rpc = await app.fetch(
        new Request('http://test/__wae/rpc', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ id: 'r1', method: 'sum', args: { a: 2, b: 3 } }),
        }),
    );
    assert.equal(rpc.status, 200);
    assert.deepEqual(await rpc.json(), { id: 'r1', ok: true, body: 5 });

    const missingRpc = await app.fetch(
        new Request('http://test/__wae/rpc', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ id: 'r2', method: 'missing', args: null }),
        }),
    );
    assert.equal(missingRpc.status, 200);
    assert.deepEqual(await missingRpc.json(), {
        id: 'r2',
        ok: false,
        body: { code: 'NotFound', message: 'unknown rpc method: missing' },
    });

    const exported = worker(app);
    const workerAction = await exported.fetch(
        new Request('http://worker/__wae/action/greet', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: 'bob' }),
        }),
        {},
        { waitUntil: () => {} },
    );
    assert.equal(workerAction.status, 200);
    assert.deepEqual(await workerAction.json(), { ok: true, name: 'bob' });

    const handle = await serve(app, { hostname: '127.0.0.1', port: 0 });
    try {
        const base = `http://${handle.hostname}:${handle.port}`;
        const nodeRpc = await fetch(`${base}/__wae/rpc`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ id: 'r3', method: 'sum', args: { a: 4, b: 6 } }),
        });
        assert.equal(nodeRpc.status, 200);
        assert.deepEqual(await nodeRpc.json(), { id: 'r3', ok: true, body: 10 });
    } finally {
        await handle.close();
    }
}

async function testNodeWaitUntilOnClose(createApp, route, serve) {
    let settled = false;
    const app = createApp({
        routes: [
            route('GET', '/bg-delay', (ctx) => {
                ctx.waitUntil(
                    new Promise((resolve) => {
                        setTimeout(() => {
                            settled = true;
                            resolve(null);
                        }, 30);
                    }),
                );
                return ctx.json({ ok: true });
            }),
        ],
    });
    const handle = await serve(app, { hostname: '127.0.0.1', port: 0 });

    try {
        const base = `http://${handle.hostname}:${handle.port}`;
        const res = await fetch(`${base}/bg-delay`);
        assert.equal(res.status, 200);
        assert.deepEqual(await res.json(), { ok: true });
        assert.equal(settled, false);
    } finally {
        await handle.close();
    }
    assert.equal(settled, true);
}

buildPackages();

const { createApp, route } = await import('@wae/core');
const { serve: denoServe } = await import('@wae/server/deno');
const { serve } = await import('@wae/server/node');
const { worker } = await import('@wae/serverless/cloudflare');

await testCoreFetch(createApp, route);
await testWorkerExport(createApp, route, worker);
await testDenoFetchHandler(createApp, route, denoServe);
await testNodeServe(createApp, route, serve);
await testNodeWaitUntilOnClose(createApp, route, serve);
await testProtocol(createApp, worker, serve);
console.log('host-http: ok');
