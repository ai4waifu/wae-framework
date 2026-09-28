#!/usr/bin/env node
/**
 * host-http — shared HTTP app contract across core fetch, Worker worker(), and Node serve().
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp, route } from '@wae/core';
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
    } finally {
        await handle.close();
    }
}

buildPackages();
await testCoreFetch();
await testWorkerExport();
await testNodeServe();
console.log('host-http: ok');
