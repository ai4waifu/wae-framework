#!/usr/bin/env node
/**
 * check-deploy — resolve deploy product dir and require build artifacts before wrangler.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packagesRoot = path.join(root, 'projects/packages');

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

buildPackages();

const { resolveDeployProductDir } = await import(pathToFileURL(path.join(packagesRoot, 'wae/dist/cli/deploy.js')).href);
const { defineConfig } = await import(pathToFileURL(path.join(packagesRoot, 'wae/dist/index.js')).href);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wae-deploy-'));
try {
    const productDir = path.join(tmp, 'dist', 'web');
    fs.mkdirSync(productDir, { recursive: true });
    fs.writeFileSync(path.join(productDir, 'wrangler.toml'), 'name = "demo"\n', 'utf8');
    fs.writeFileSync(path.join(productDir, 'wae-product.json'), '{}\n', 'utf8');

    const resolved = resolveDeployProductDir(tmp, { extraArgs: [] }, defineConfig({ deployTarget: 'cloudflare', product: { outDir: 'dist' } }));
    assert.equal(resolved, productDir);

    console.log('check-deploy: ok');
} finally {
    fs.rmSync(tmp, { recursive: true, force: true });
}
