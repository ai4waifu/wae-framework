#!/usr/bin/env node

/** Fail if any published `@wae/wae-*` shell is missing `lib/*.node`. */

import fs from 'node:fs';

import path from 'node:path';

import { fileURLToPath } from 'node:url';

import { libPath, PUBLISH_NATIVE_PLATFORMS } from './platform-native-manifest.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const skipMobile = process.argv.includes('--skip-mobile');

let failed = false;

for (const platformId of PUBLISH_NATIVE_PLATFORMS) {
    if (skipMobile && (platformId === 'android-arm64' || platformId === 'ios-arm64')) {
        console.log(`verify-platform-native: skip ${platformId} (--skip-mobile)`);

        continue;
    }

    const file = libPath(ROOT, platformId);

    if (!fs.existsSync(file)) {
        console.error(`verify-platform-native: missing ${path.relative(ROOT, file)}`);

        failed = true;

        continue;
    }

    const stat = fs.statSync(file);

    if (stat.size < 1024) {
        console.error(`verify-platform-native: suspicious size ${stat.size} bytes for ${file}`);

        failed = true;

        continue;
    }

    console.log(`verify-platform-native: ok ${path.relative(ROOT, file)} (${stat.size} bytes)`);
}

if (failed) {
    console.error('verify-platform-native: one or more platform libs missing');

    process.exit(1);
}

console.log('verify-platform-native: all required lib/*.node present');
