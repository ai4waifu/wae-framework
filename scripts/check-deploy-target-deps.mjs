#!/usr/bin/env node
/**
 * check-deploy-target-deps — loadWaeConfig rejects dual host deps and deployTarget mismatches.
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
    for (const name of ['@wae/types', '@wae/wae']) {
        const r = spawnSync('pnpm', ['--filter', name, 'run', 'build'], {
            cwd: root,
            stdio: 'inherit',
            shell: true,
            windowsHide: true,
        });
        if (r.status !== 0) process.exit(r.status ?? 1);
    }
}

function writeFixture(parent, name, { deployTarget, dependencies }) {
    const dir = path.join(parent, name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
        path.join(dir, 'package.json'),
        `${JSON.stringify({ name: 'fixture', private: true, type: 'module', dependencies }, null, 4)}\n`,
        'utf8',
    );
    fs.writeFileSync(path.join(dir, 'wae.config.mjs'), `export default { deployTarget: '${deployTarget}' };\n`, 'utf8');
    return dir;
}

async function expectLoadError(dir, pattern) {
    const { loadWaeConfig } = await import(pathToFileURL(path.join(packagesRoot, 'wae/dist/cli/load-config.js')).href);
    await assert.rejects(() => loadWaeConfig(dir), (error) => {
        assert.match(String(error), pattern);
        return true;
    });
}

buildPackages();

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wae-deploy-target-deps-'));
try {
    await expectLoadError(
        writeFixture(tmp, 'dual-host', {
            deployTarget: 'cloudflare',
            dependencies: { '@wae/server': 'workspace:*', '@wae/serverless': 'workspace:*' },
        }),
        /must not depend on both/,
    );

    await expectLoadError(
        writeFixture(tmp, 'cf-missing-serverless', {
            deployTarget: 'cloudflare',
            dependencies: { '@wae/server': 'workspace:*' },
        }),
        /requires @wae\/serverless/,
    );

    await expectLoadError(
        writeFixture(tmp, 'node-wrong-host', {
            deployTarget: 'node',
            dependencies: { '@wae/serverless': 'workspace:*' },
        }),
        /requires @wae\/server/,
    );

    console.log('check-deploy-target-deps: ok');
} finally {
    fs.rmSync(tmp, { recursive: true, force: true });
}
