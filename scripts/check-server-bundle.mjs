#!/usr/bin/env node
/**
 * check-server-bundle — bundle deploy-target host entries created by `wae create`.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { workspaceAliases } from './workspace-aliases.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packagesRoot = path.join(root, 'projects/packages');
const waeBin = path.join(root, 'projects/packages/wae/bin/wae.mjs');

function buildPackages() {
    for (const name of ['@wae/core', '@wae/server', '@wae/serverless', '@wae/commander', '@wae/wae']) {
        const r = spawnSync('pnpm', ['--filter', name, 'run', 'build'], {
            cwd: root,
            stdio: 'inherit',
            shell: true,
            windowsHide: true,
        });
        if (r.status !== 0) process.exit(r.status ?? 1);
    }
}

function runCreate(cwd, name, server) {
    const r = spawnSync(process.execPath, [waeBin, 'create', name, '--server', server], {
        cwd,
        stdio: 'inherit',
        windowsHide: true,
    });
    if (r.status !== 0) process.exit(r.status ?? 1);
}

buildPackages();

const { defineConfig } = await import(pathToFileURL(path.join(packagesRoot, 'wae/dist/index.js')).href);
const { bundleServerEntry } = await import(pathToFileURL(path.join(packagesRoot, 'wae/dist/cli/build-server.js')).href);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wae-server-bundle-'));
try {
    for (const target of ['node', 'deno', 'cloudflare']) {
        const name = `app-${target}`;
        runCreate(tmp, name, target);
        const appDir = path.join(tmp, name);
        const outDir = path.join(appDir, 'dist-test');
        const result = await bundleServerEntry(appDir, defineConfig({ deployTarget: target }), outDir, {
            alias: workspaceAliases(packagesRoot, target),
        });
        assert.ok(result);
        assert.equal(result.deployTarget, target);
        assert.ok(fs.existsSync(result.entryFile));
        assert.ok(fs.existsSync(result.manifestFile));
        const manifest = JSON.parse(fs.readFileSync(result.manifestFile, 'utf8'));
        assert.equal(manifest.deployTarget, target);
        const code = fs.readFileSync(result.entryFile, 'utf8');
        assert.ok(code.length > 40);
    }
    console.log('check-server-bundle: ok');
} finally {
    fs.rmSync(tmp, { recursive: true, force: true });
}
