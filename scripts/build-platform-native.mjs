#!/usr/bin/env node

/**

 * Build `wae-napi` into `lib/<platform>-<toolchain>.node`.

 *

 *   pnpm run build:native

 *   node scripts/build-platform-native.mjs --platform win32-x64

 */

import { spawnSync } from 'node:child_process';

import fs from 'node:fs';

import path from 'node:path';

import { fileURLToPath } from 'node:url';

import { libFileName, PLATFORM_NATIVE, platformDir, rustTriple } from './platform-native-manifest.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const TRIPLE_TO_PLATFORM = Object.fromEntries(Object.entries(PLATFORM_NATIVE).map(([id, meta]) => [meta.triple, id]));

function arg(name) {
    const i = process.argv.indexOf(name);

    return i >= 0 ? process.argv[i + 1] : undefined;
}

function hostTriple() {
    const rustc = spawnSync('rustc', ['-vV'], { encoding: 'utf8' });

    if (rustc.status !== 0) {
        console.error('build-platform-native: rustc -vV failed');

        process.exit(1);
    }

    const line = rustc.stdout.split(/\r?\n/).find((l) => l.startsWith('host: '));

    if (!line) {
        console.error('build-platform-native: could not read rustc host triple');

        process.exit(1);
    }

    return line.slice('host: '.length).trim();
}

function resolvePlatformId() {
    const platformArg = arg('--platform');

    if (platformArg) {
        const id = platformArg.startsWith('wae-') ? platformArg.slice(4) : platformArg;

        if (!PLATFORM_NATIVE[id]) {
            console.error(`build-platform-native: unknown platform ${platformArg}`);

            process.exit(1);
        }

        return id;
    }

    const triple = hostTriple();

    const id = TRIPLE_TO_PLATFORM[triple];

    if (!id) {
        console.error(`build-platform-native: no platform package mapped for host triple ${triple}`);

        process.exit(1);
    }

    return id;
}

function ensureRustTarget(target) {
    const host = hostTriple();

    if (target === host) return;

    console.log(`[build-platform-native] rustup target add ${target}`);

    const result = spawnSync('rustup', ['target', 'add', target], { stdio: 'inherit' });

    if (result.status !== 0) process.exit(result.status ?? 1);
}

function dylibBasename(triple) {
    if (triple.includes('windows')) return 'wae_napi.dll';

    if (triple.includes('darwin') || triple.includes('ios')) return 'wae_napi.dylib';

    return 'wae_napi.so';
}

function resolveCargoArtifact(triple) {
    const host = hostTriple();

    const base = path.join(ROOT, 'target');

    const dir = triple === host ? path.join(base, 'release') : path.join(base, triple, 'release');

    const file = path.join(dir, dylibBasename(triple));

    if (fs.existsSync(file)) return file;

    return null;
}

const platformId = resolvePlatformId();

const dir = platformDir(platformId);

const libFile = libFileName(platformId);

const targetTriple = rustTriple(platformId);

const pkgRoot = path.join(ROOT, 'projects/packages', dir);

const libDir = path.join(pkgRoot, 'lib');

console.log(`[build-platform-native] platform=${platformId} triple=${targetTriple} → lib/${libFile}`);

ensureRustTarget(targetTriple);

const cargoArgs = ['build', '--release', '-p', 'wae-napi'];

if (targetTriple !== hostTriple()) {
    cargoArgs.push('--target', targetTriple);
}

const result = spawnSync('cargo', cargoArgs, {
    cwd: ROOT,

    stdio: 'inherit',
});

if (result.status !== 0) process.exit(result.status ?? 1);

const artifact = resolveCargoArtifact(targetTriple);

if (!artifact) {
    console.error(`build-platform-native: could not find wae_napi artifact for ${targetTriple}`);

    process.exit(1);
}

fs.mkdirSync(libDir, { recursive: true });

fs.copyFileSync(artifact, path.join(libDir, libFile));

console.log(`[build-platform-native] wrote lib/${libFile} (from ${path.relative(ROOT, artifact)})`);
