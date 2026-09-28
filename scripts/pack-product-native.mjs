#!/usr/bin/env node

/**

 * Build native addon and zip for a **product** GitHub Release.

 *

 *   node scripts/pack-product-native.mjs --product my-app

 *   node scripts/pack-product-native.mjs --product my-app --out dist-release

 */

import { spawnSync } from 'node:child_process';

import fs from 'node:fs';

import path from 'node:path';

import { fileURLToPath } from 'node:url';

import { libFileName, PLATFORM_NATIVE } from './platform-native-manifest.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function arg(name) {
    const i = process.argv.indexOf(name);

    return i >= 0 ? process.argv[i + 1] : undefined;
}

let product = arg('--product');

const manifestPath = arg('--manifest');

if (manifestPath) {
    const manifest = JSON.parse(fs.readFileSync(path.resolve(manifestPath), 'utf8'));

    product = manifest.name;

    if (!product) {
        console.error('pack-product-native: manifest missing name');

        process.exit(1);
    }
}

if (!product) {
    console.error('pack-product-native: pass --product <slug> or --manifest dist/<platform>/wae-product.json');

    process.exit(1);
}

const outArg = process.argv.indexOf('--out');

const OUT_DIR = outArg >= 0 ? path.resolve(ROOT, process.argv[outArg + 1] ?? 'dist-release') : path.join(ROOT, 'dist-release');

function run(command, args, cwd = ROOT) {
    const result = spawnSync(command, args, {
        cwd,

        stdio: 'inherit',

        shell: process.platform === 'win32',

        windowsHide: true,
    });

    if (result.status !== 0) process.exit(result.status ?? 1);
}

function hostTriple() {
    const rustc = spawnSync('rustc', ['-vV'], { encoding: 'utf8' });

    if (rustc.status !== 0) {
        console.error('pack-product-native: rustc -vV failed');

        process.exit(1);
    }

    const line = rustc.stdout.split(/\r?\n/).find((l) => l.startsWith('host: '));

    if (!line) {
        console.error('pack-product-native: could not read rustc host triple');

        process.exit(1);
    }

    return line.slice('host: '.length).trim();
}

const triple = hostTriple();

const platformId = Object.entries(PLATFORM_NATIVE).find(([, m]) => m.triple === triple)?.[0];

if (!platformId) {
    console.error(`pack-product-native: unsupported host triple ${triple}`);

    process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

run(process.execPath, ['scripts/build-platform-native.mjs', '--platform', platformId], ROOT);

const { dir } = PLATFORM_NATIVE[platformId];

const libFile = libFileName(platformId);

const nodePath = path.join(ROOT, 'projects/packages', dir, 'lib', libFile);

if (!fs.existsSync(nodePath)) {
    console.error(`pack-product-native: missing ${nodePath}`);

    process.exit(1);
}

const stage = fs.mkdtempSync(path.join(OUT_DIR, 'stage-'));

fs.copyFileSync(nodePath, path.join(stage, libFile));

const archive = path.join(OUT_DIR, `${product}-${triple}.zip`);

if (fs.existsSync(archive)) fs.rmSync(archive);

run('tar', ['-a', '-c', '-f', archive, libFile], stage);

fs.rmSync(stage, { recursive: true, force: true });

console.log(`product native release asset: ${archive}`);
