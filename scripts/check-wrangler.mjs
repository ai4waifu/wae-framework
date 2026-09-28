#!/usr/bin/env node
/**
 * check-wrangler — wrangler.toml rendering and cloudflare create/build scaffolding.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packagesRoot = path.join(root, 'projects/packages');
const waeBin = path.join(root, 'projects/packages/wae/bin/wae.mjs');

function buildPackages() {
    for (const name of ['@wae/types', '@wae/commander', '@wae/wae']) {
        const r = spawnSync('pnpm', ['--filter', name, 'run', 'build'], {
            cwd: root,
            stdio: 'inherit',
            shell: true,
            windowsHide: true,
        });
        if (r.status !== 0) process.exit(r.status ?? 1);
    }
}

function runCreate(cwd, name) {
    const r = spawnSync(process.execPath, [waeBin, 'create', name, '--server', 'cloudflare'], {
        cwd,
        stdio: 'inherit',
        windowsHide: true,
    });
    if (r.status !== 0) process.exit(r.status ?? 1);
}

buildPackages();

const { renderWranglerToml, writeWranglerToml } = await import(
    pathToFileURL(path.join(packagesRoot, 'wae/dist/cli/build-wrangler.js')).href
);
const { writeProductManifest } = await import(pathToFileURL(path.join(packagesRoot, 'wae/dist/product/manifest.js')).href);
const { defineConfig } = await import(pathToFileURL(path.join(packagesRoot, 'wae/dist/index.js')).href);

const rendered = renderWranglerToml({ name: 'demo', main: 'server/worker.mjs' });
assert.match(rendered, /name = "demo"/);
assert.match(rendered, /main = "server\/worker\.mjs"/);
assert.match(rendered, /compatibility_date = "2024-09-01"/);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wae-wrangler-'));
try {
    const outDir = path.join(tmp, 'product');
    fs.mkdirSync(outDir, { recursive: true });
    const wranglerPath = writeWranglerToml(outDir, { name: 'demo', main: 'server/worker.mjs' });
    assert.ok(fs.existsSync(wranglerPath));

    const manifestPath = writeProductManifest(
        outDir,
        'web',
        { name: 'demo', version: '0.0.0', nativeRelativePath: 'lib/wae-napi.node', frontendDir: 'frontend' },
        defineConfig({ deployTarget: 'cloudflare' }),
        { server: { deployTarget: 'cloudflare', entry: 'server/worker.mjs' } },
    );
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert.deepEqual(manifest.server, { deployTarget: 'cloudflare', entry: 'server/worker.mjs' });

    runCreate(tmp, 'cf-app');
    const createdWrangler = fs.readFileSync(path.join(tmp, 'cf-app', 'wrangler.toml'), 'utf8');
    assert.match(createdWrangler, /name = "cf-app"/);
    assert.match(createdWrangler, /main = "src\/server\/worker\.ts"/);

    console.log('check-wrangler: ok');
} finally {
    fs.rmSync(tmp, { recursive: true, force: true });
}
