#!/usr/bin/env node
/**
 * check-publish-flow — `wae create` → server bundle → `wae publish` for node/deno CLI path.
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

function writePlainConfig(appDir, target) {
    for (const name of ['wae.config.ts', 'wae.config.mts']) {
        const configPath = path.join(appDir, name);
        if (fs.existsSync(configPath)) fs.unlinkSync(configPath);
    }
    fs.writeFileSync(
        path.join(appDir, 'wae.config.mjs'),
        `export default {\n    deployTarget: '${target}',\n    product: { outDir: 'dist' },\n};\n`,
        'utf8',
    );
}

function runPublish(cwd) {
    return spawnSync(process.execPath, [waeBin, 'publish'], {
        cwd,
        encoding: 'utf8',
        windowsHide: true,
    });
}

buildPackages();

const { defineConfig } = await import(pathToFileURL(path.join(packagesRoot, 'wae/dist/index.js')).href);
const { bundleServerEntry } = await import(pathToFileURL(path.join(packagesRoot, 'wae/dist/cli/build-server.js')).href);
const { resolveProductMeta, writeProductManifest } = await import(
    pathToFileURL(path.join(packagesRoot, 'wae/dist/product/manifest.js')).href
);
const { SERVER_PUBLISH_MANIFEST } = await import(pathToFileURL(path.join(packagesRoot, 'wae/dist/cli/publish-server.js')).href);

async function buildPublishProduct(appDir, target) {
    const config = defineConfig({ deployTarget: target, product: { outDir: 'dist' } });
    const outDir = path.join(appDir, 'dist', 'web');
    fs.mkdirSync(outDir, { recursive: true });
    const serverBundle = await bundleServerEntry(appDir, config, outDir, { alias: workspaceAliases(packagesRoot, target) });
    assert.ok(serverBundle);
    const meta = resolveProductMeta(appDir, config, 'web');
    writeProductManifest(outDir, 'web', meta, config, {
        server: {
            deployTarget: serverBundle.deployTarget,
            entry: path.relative(outDir, serverBundle.entryFile).replaceAll('\\', '/'),
        },
    });
    return outDir;
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wae-publish-flow-'));
try {
    for (const target of ['node', 'deno']) {
        const name = `publish-${target}`;
        runCreate(tmp, name, target);
        const appDir = path.join(tmp, name);
        writePlainConfig(appDir, target);
        await buildPublishProduct(appDir, target);

        const result = runPublish(appDir);
        if (result.status !== 0) {
            console.error(result.stdout);
            console.error(result.stderr);
            process.exit(result.status ?? 1);
        }

        const publishManifestPath = path.join(appDir, 'dist', 'web', 'publish', SERVER_PUBLISH_MANIFEST);
        assert.ok(fs.existsSync(publishManifestPath), `missing ${publishManifestPath}`);
        const publishManifest = JSON.parse(fs.readFileSync(publishManifestPath, 'utf8'));
        assert.equal(publishManifest.deployTarget, target);
        assert.match(result.stdout, /\[wae publish\] manifest=/);
    }

    console.log('check-publish-flow: ok');
} finally {
    fs.rmSync(tmp, { recursive: true, force: true });
}
