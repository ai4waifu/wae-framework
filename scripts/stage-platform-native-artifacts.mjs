#!/usr/bin/env node
/**
 * Copy CI-downloaded `lib/*.node` artifacts into platform packages.
 *
 *   node scripts/stage-platform-native-artifacts.mjs --from artifacts/
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { libFileName, PLATFORM_NATIVE } from './platform-native-manifest.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function arg(name) {
    const i = process.argv.indexOf(name);
    return i >= 0 ? process.argv[i + 1] : undefined;
}

const fromDir = path.resolve(ROOT, arg('--from') ?? 'artifacts');
if (!fs.existsSync(fromDir)) {
    console.error(`stage-platform-native-artifacts: missing directory ${fromDir}`);
    process.exit(1);
}

function collectNodeFiles(dir, out = []) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) collectNodeFiles(full, out);
        else if (ent.name.endsWith('.node')) out.push(full);
    }
    return out;
}

let staged = 0;

for (const filePath of collectNodeFiles(fromDir)) {
    const entName = path.basename(filePath);
    const base = entName.replace(/\.node$/, '');
    let platformId = PLATFORM_NATIVE[base] ? base : null;
    if (!platformId) {
        for (const [id, meta] of Object.entries(PLATFORM_NATIVE)) {
            if (meta.lib === entName) {
                platformId = id;
                break;
            }
        }
    }
    if (!platformId) {
        console.warn(`stage-platform-native-artifacts: skip unknown artifact ${entName}`);
        continue;
    }

    const { dir } = PLATFORM_NATIVE[platformId];
    const destDir = path.join(ROOT, 'projects/packages', dir, 'lib');
    const destFile = path.join(destDir, libFileName(platformId));
    fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(filePath, destFile);
    console.log(`staged ${entName} → projects/packages/${dir}/lib/${libFileName(platformId)}`);
    staged++;
}

if (staged === 0) {
    console.error('stage-platform-native-artifacts: no .node artifacts found');
    process.exit(1);
}

console.log(`stage-platform-native-artifacts: staged ${staged} file(s)`);
