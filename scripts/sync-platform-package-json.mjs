#!/usr/bin/env node
/** Native addon fields on each `@wae/wae-*` shell package.json. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const DIRS = [
    'wae-win32-x64',
    'wae-win32-arm64',
    'wae-darwin-x64',
    'wae-darwin-arm64',
    'wae-linux-x64',
    'wae-linux-arm64',
    'wae-android-arm64',
    'wae-ios-arm64',
];

for (const dir of DIRS) {
    const pkgPath = path.join(ROOT, 'projects/packages', dir, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    pkg.files = ['dist', 'lib'];
    pkg.scripts = pkg.scripts ?? {};
    pkg.scripts.build = 'tsc -p tsconfig.json';
    pkg.scripts['build:native'] = 'node ../../../scripts/build-platform-native.mjs';
    pkg.scripts.check = 'tsc -p tsconfig.json --noEmit';
    pkg.scripts.prepublishOnly = 'tsc -p tsconfig.json';
    pkg.dependencies = { '@wae/types': 'workspace:*' };
    delete pkg.optionalDependencies;
    delete pkg.devDependencies?.['@wae/napi'];
    delete pkg.napi;
    pkg.devDependencies = {
        '@types/node': '^22.0.0',
        typescript: 'catalog:',
    };
    fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 4)}\n`, 'utf8');
    console.log(`updated ${dir}/package.json`);
}
