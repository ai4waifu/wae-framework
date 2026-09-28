#!/usr/bin/env node
/**
 * host-http — shared HTTP app contract across core fetch, Worker worker(), Deno handler, and Node serve().
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp, route } from '@wae/core';
import { serve as denoServe } from '@wae/server/deno';
import { serve } from '@wae/server/node';
import { worker } from '@wae/serverless/cloudflare';

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

function createFixtureApp() {
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

async function testCoreFetch() {
    const { app, order } = createFixtureApp();

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

    const boom = await app.fetch(new Request('http://test/boom'));
    assert.equal(boom.status, 500);

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

async function testWorkerExport() {
    const { app, order } = createFixtureApp();
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

async function testDenoFetchHandler() {
    const { app } = createFixtureApp();
    const fetchHandler = denoServe(app);

    const health = await fetchHandler(new Request('http://deno/health'));
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { ok: true });

    const wrongMethod = await fetchHandler(new Request('http://deno/health', { method: 'POST' }));
    assert.equal(wrongMethod.status, 405);
}

async function testNodeServe() {
    const { app } = createFixtureApp();
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
    } finally {
        await handle.close();
    }
}

async function testNodeWaitUntilOnClose() {
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
await testCoreFetch();
await testWorkerExport();
await testDenoFetchHandler();
await testNodeServe();
await testNodeWaitUntilOnClose();
console.log('host-http: ok');
