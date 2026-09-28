#!/usr/bin/env node
/**
 * check-create — smoke test `wae create` materializes single-host template trees.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const waeBin = path.join(root, 'projects/packages/wae/bin/wae.mjs');

function buildPackages() {
    for (const name of ['@wae/commander', '@wae/wae']) {
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

function readJson(file) {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function assertTarget(dir, server) {
    const pkg = readJson(path.join(dir, 'package.json'));
    const deps = Object.keys(pkg.dependencies ?? {});
    assert.ok(deps.includes('@wae/core'));
    assert.ok(deps.includes('@wae/client'));
    if (server === 'cloudflare') {
        assert.ok(deps.includes('@wae/serverless'));
        assert.ok(!deps.includes('@wae/server'));
        assert.ok(fs.existsSync(path.join(dir, 'src/server/worker.ts')));
        assert.ok(!fs.existsSync(path.join(dir, 'src/server/node.ts')));
        assert.ok(!fs.existsSync(path.join(dir, 'src/server/deno.ts')));
        const wrangler = fs.readFileSync(path.join(dir, 'wrangler.toml'), 'utf8');
        assert.match(wrangler, /main = "src\/server\/worker\.ts"/);
    } else {
        assert.ok(!fs.existsSync(path.join(dir, 'wrangler.toml')));
        assert.ok(deps.includes('@wae/server'));
        assert.ok(!deps.includes('@wae/serverless'));
        assert.ok(!fs.existsSync(path.join(dir, 'src/server/worker.ts')));
        assert.ok(fs.existsSync(path.join(dir, `src/server/${server}.ts`)));
    }
    const config = fs.readFileSync(path.join(dir, 'wae.config.ts'), 'utf8');
    assert.match(config, new RegExp(`deployTarget:\\s*'${server}'`));
    assert.match(config, new RegExp(`adapter:\\s*'${server}'`));
}

buildPackages();

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wae-create-'));
try {
    for (const server of ['node', 'deno', 'cloudflare']) {
        const name = `app-${server}`;
        runCreate(tmp, name, server);
        assertTarget(path.join(tmp, name), server);
    }
    console.log('check-create: ok');
} finally {
    fs.rmSync(tmp, { recursive: true, force: true });
}
