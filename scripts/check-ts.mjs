#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tsc = path.join(root, 'node_modules/typescript/bin/tsc');

function collect(dir, out = []) {
    if (!fs.existsSync(dir)) return out;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        if (ent.name === 'node_modules' || ent.name === 'dist' || ent.name === 'templates') {
            continue;
        }
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) collect(p, out);
        else if (ent.name === 'tsconfig.json') out.push(p);
    }
    return out;
}

const configs = [...collect(path.join(root, 'projects/packages')), ...collect(path.join(root, 'projects/examples'))];
let failed = 0;
for (const cfg of configs) {
    const rel = path.relative(root, cfg).replaceAll('\\', '/');
    const r = spawnSync(process.execPath, [tsc, '-p', cfg, '--noEmit'], {
        cwd: root,
        encoding: 'utf8',
    });
    if (r.status !== 0) {
        failed++;
        console.error('FAIL', rel);
        if (r.stdout) console.error(r.stdout);
        if (r.stderr) console.error(r.stderr);
    } else {
        console.log('ok', rel);
    }
}
if (failed) {
    console.error(`${failed} failed`);
    process.exit(1);
}
console.log(`check-ts: ${configs.length} ok`);
