#!/usr/bin/env node
/**
 * host-deno — optional Deno runtime smoke (skips when `deno` is not on PATH).
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const smoke = path.join(root, 'scripts/host-deno-smoke.ts');

function hasDeno() {
    const probe = spawnSync('deno', ['--version'], {
        encoding: 'utf8',
        shell: true,
        windowsHide: true,
    });
    return probe.status === 0;
}

function buildPackages() {
    for (const name of ['@wae/core', '@wae/server']) {
        const r = spawnSync('pnpm', ['--filter', name, 'run', 'build'], {
            cwd: root,
            stdio: 'inherit',
            shell: true,
            windowsHide: true,
        });
        if (r.status !== 0) process.exit(r.status ?? 1);
    }
}

if (!hasDeno()) {
    console.log('host-deno: skip (deno not installed)');
    process.exit(0);
}

buildPackages();

const run = spawnSync('deno', ['run', '--allow-read', smoke], {
    cwd: root,
    stdio: 'inherit',
    shell: true,
    windowsHide: true,
});
process.exit(run.status ?? 1);
