#!/usr/bin/env node
/**
 * host-cloudflare-kv — platform conformance for `cloudflareKv` KV adapter (Workers-only surface).
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function buildServerless() {
    const r = spawnSync('pnpm', ['--filter', '@wae/serverless', 'run', 'build'], {
        cwd: root,
        stdio: 'inherit',
        shell: true,
        windowsHide: true,
    });
    if (r.status !== 0) process.exit(r.status ?? 1);
}

buildServerless();

const { cloudflareKv } = await import('@wae/serverless/cloudflare');

const store = new Map();

const binding = {
    async get(key) {
        return store.get(key) ?? null;
    },
    async put(key, value) {
        store.set(key, value);
    },
    async delete(key) {
        store.delete(key);
    },
};

const kv = cloudflareKv(binding);

await kv.put('json', JSON.stringify({ hello: 'world' }));
assert.deepEqual(await kv.get('json'), { hello: 'world' });

await kv.put('plain', 'text');
assert.equal(await kv.get('plain'), 'text');

await kv.put('ttl', 'expires', { expirationTtl: 60 });
assert.equal(store.get('ttl'), 'expires');

await kv.delete('json');
assert.equal(await kv.get('json'), null);

console.log('host-cloudflare-kv: ok');
