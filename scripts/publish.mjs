#!/usr/bin/env node
/**
 * 发布 `@wae/*` 库包（0.0.0 首发范围）。
 *
 * 默认 dry-run；显式 `--execute` 才真正 publish。
 *
 *   node scripts/publish.mjs
 *   node scripts/publish.mjs --execute
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EXECUTE = process.argv.includes('--execute');
const EXPECTED_VERSION = '0.0.0';

/** 产品面 + 通信/后端/适配 + `@wae/wae` 必挂的 platform 壳；不含 examples */
const PUBLISH_FILTERS = [
    '@wae/types',
    '@wae/core',
    '@wae/protocol',
    '@wae/client',
    '@wae/server',
    '@wae/serverless',
    '@wae/adapter-vue',
    '@wae/adapter-react',
    '@wae/adapter-svelte',
    '@wae/adapter-solid',
    '@wae/wae-unknown-wasm32',
    '@wae/wae-win32-x64',
    '@wae/wae-win32-arm64',
    '@wae/wae-darwin-x64',
    '@wae/wae-darwin-arm64',
    '@wae/wae-linux-x64',
    '@wae/wae-linux-arm64',
    '@wae/wae-android-arm64',
    '@wae/wae-ios-arm64',
    '@wae/wae',
];

const PACKAGE_DIRS = [
    'projects/packages/types',
    'projects/packages/core',
    'projects/packages/protocol',
    'projects/packages/client',
    'projects/packages/server',
    'projects/packages/serverless',
    'projects/packages/adapter-vue',
    'projects/packages/adapter-react',
    'projects/packages/adapter-svelte',
    'projects/packages/adapter-solid',
    'projects/packages/wae-unknown-wasm32',
    'projects/packages/wae-win32-x64',
    'projects/packages/wae-win32-arm64',
    'projects/packages/wae-darwin-x64',
    'projects/packages/wae-darwin-arm64',
    'projects/packages/wae-linux-x64',
    'projects/packages/wae-linux-arm64',
    'projects/packages/wae-android-arm64',
    'projects/packages/wae-ios-arm64',
    'projects/packages/wae',
];

const REQUIRED_OPTIONAL_PLATFORMS = [
    '@wae/wae-unknown-wasm32',
    '@wae/wae-win32-x64',
    '@wae/wae-win32-arm64',
    '@wae/wae-darwin-x64',
    '@wae/wae-darwin-arm64',
    '@wae/wae-linux-x64',
    '@wae/wae-linux-arm64',
    '@wae/wae-android-arm64',
    '@wae/wae-ios-arm64',
];

function fail(msg) {
    console.error('PUBLISH FAIL:', msg);
    process.exit(1);
}

function run(command, args, label) {
    console.log(`→ ${label}: ${command} ${args.join(' ')}`);
    const result = spawnSync(command, args, {
        cwd: ROOT,
        stdio: 'inherit',
        shell: process.platform === 'win32',
        windowsHide: true,
        env: process.env,
    });
    if (result.error) {
        console.error(result.error);
        process.exit(1);
    }
    if (result.status !== 0) {
        process.exit(result.status ?? 1);
    }
}

const pnpmCmd = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

function filterArgs() {
    return PUBLISH_FILTERS.flatMap((name) => ['--filter', name]);
}

console.log(EXECUTE ? 'mode: EXECUTE (real publish)' : 'mode: dry-run');

for (const rel of PACKAGE_DIRS) {
    const pkgPath = path.join(ROOT, rel, 'package.json');
    if (!fs.existsSync(pkgPath)) fail(`missing ${rel}/package.json`);
    const j = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (j.version !== EXPECTED_VERSION) {
        fail(`${j.name} version is ${j.version}, expected ${EXPECTED_VERSION}`);
    }
    if (j.private === true) fail(`${j.name} is private`);
    if (j.publishConfig?.access !== 'public') {
        fail(`${j.name} missing publishConfig.access=public`);
    }
    if (!j.main?.includes('dist/') && j.main !== './dist/index.js') {
        fail(`${j.name} main must point to dist`);
    }
    if (fs.existsSync(path.join(ROOT, 'projects/packages/ui'))) {
        fail('projects/packages/ui must not exist');
    }
}

const waePkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'projects/packages/wae/package.json'), 'utf8'));
const optional = waePkg.optionalDependencies ?? {};
for (const name of REQUIRED_OPTIONAL_PLATFORMS) {
    if (!optional[name]) {
        fail(`@wae/wae missing optionalDependencies.${name}`);
    }
}

run(pnpmCmd, [...filterArgs(), 'run', 'build'], 'build publish set');

if (EXECUTE) {
    run(process.execPath, ['scripts/verify-platform-native.mjs', '--skip-mobile'], 'verify platform lib/*.node');
}

const publishArgs = ['publish', '-r', ...filterArgs(), '--access', 'public', '--no-git-checks'];
if (!EXECUTE) {
    publishArgs.push('--dry-run');
}

run(pnpmCmd, publishArgs, EXECUTE ? 'pnpm publish' : 'pnpm publish --dry-run');

console.log(EXECUTE ? 'publish ok' : 'publish dry-run ok');
