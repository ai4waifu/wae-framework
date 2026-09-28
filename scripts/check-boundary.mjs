#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROJECTS_AREAS = new Set(['crates', 'packages', 'examples']);
const EXAMPLE_KINDS = new Set(['frontend', 'fullstack', 'backend', 'native', 'integration', 'minimal']);
const UI_FRAMEWORKS = ['vue', 'react', 'svelte', 'solid-js', 'solid'];
const ADAPTERS = ['vue', 'react', 'svelte', 'solid'];

function fail(msg) {
    console.error('BOUNDARY FAIL:', msg);
    process.exitCode = 1;
}
function readPkg(rel) {
    const p = path.join(ROOT, rel, 'package.json');
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
}
function deps(rel) {
    const j = readPkg(rel);
    if (!j) return new Set();
    return new Set([...Object.keys(j.dependencies ?? {}), ...Object.keys(j.devDependencies ?? {}), ...Object.keys(j.peerDependencies ?? {})]);
}
function walkFiles(dir, pred, out = []) {
    if (!fs.existsSync(dir)) return out;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        if (['node_modules', 'dist', 'target'].includes(ent.name)) continue;
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) walkFiles(p, pred, out);
        else if (pred(p)) out.push(p);
    }
    return out;
}

// —— 仓库三分法：projects/crates · projects/packages · projects/examples ——
for (const area of PROJECTS_AREAS) {
    if (!fs.existsSync(path.join(ROOT, 'projects', area))) {
        fail(`missing projects/${area}`);
    }
}

if (fs.existsSync(path.join(ROOT, 'packages'))) {
    fail('root packages/ forbidden; use projects/packages');
}
if (fs.existsSync(path.join(ROOT, 'examples'))) {
    fail('root examples/ forbidden; use projects/examples');
}

const projectsTop = fs
    .readdirSync(path.join(ROOT, 'projects'), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
for (const name of projectsTop) {
    if (!PROJECTS_AREAS.has(name)) {
        fail(`projects/${name} forbidden; only crates, packages, examples allowed`);
    }
}

if (fs.existsSync(path.join(ROOT, 'projects/package.json'))) {
    fail('package.json must not sit directly under projects/');
}
if (fs.existsSync(path.join(ROOT, 'projects/Cargo.toml'))) {
    fail('Cargo.toml must not sit directly under projects/');
}
if (fs.existsSync(path.join(ROOT, 'projects/packages/ui'))) {
    fail('projects/packages/ui must not exist');
}
if (fs.existsSync(path.join(ROOT, 'projects/packages/adapter-vanilla'))) {
    fail('adapter-vanilla must not exist');
}
if (fs.existsSync(path.join(ROOT, 'projects/examples/rust-types'))) {
    fail('projects/examples/rust-types must not exist');
}

const typesRel = 'projects/packages/types';
const coreRel = 'projects/packages/core';
const protocolRel = 'projects/packages/protocol';
const typesPkg = readPkg(typesRel);
const corePkg = readPkg(coreRel);
const protocolPkg = readPkg(protocolRel);
if (typesPkg?.name !== '@wae/types') fail('@wae/types missing at projects/packages/types');
if (corePkg?.name !== '@wae/core') fail('@wae/core missing at projects/packages/core');
if (protocolPkg?.name !== '@wae/protocol') fail('@wae/protocol missing at projects/packages/protocol');
if (Object.keys(typesPkg.dependencies ?? {}).length > 0) {
    fail('@wae/types must have no runtime dependencies');
}
const typesDeps = deps(typesRel);
for (const bad of ['@wae/core', '@wae/protocol', '@wae/client', '@wae/server']) {
    if (typesDeps.has(bad)) fail(`@wae/types must not depend on ${bad}`);
}
const coreDeps = deps(coreRel);
if (!coreDeps.has('@wae/types')) fail('@wae/core must depend on @wae/types');
for (const bad of ['@wae/protocol', '@wae/client', '@wae/server', '@wae/ui']) {
    if (coreDeps.has(bad)) fail(`@wae/core must not depend on ${bad}`);
}
const protocolDeps = deps(protocolRel);
if (!protocolDeps.has('@wae/types')) fail('@wae/protocol must depend on @wae/types');
for (const bad of ['@wae/client', '@wae/server', '@wae/ui']) {
    if (protocolDeps.has(bad)) fail(`@wae/protocol must not depend on ${bad}`);
}

const clientRel = 'projects/packages/client';
for (const rel of [clientRel, 'projects/packages/server']) {
    const d = deps(rel);
    for (const need of ['@wae/types', '@wae/core', '@wae/protocol']) {
        if (!d.has(need)) fail(`${rel} must depend on ${need}`);
    }
}

const exTop = fs
    .readdirSync(path.join(ROOT, 'projects/examples'), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
for (const name of exTop) {
    if (!EXAMPLE_KINDS.has(name)) {
        fail(`projects/examples/${name} is not a purpose kind (got framework-keyed layout?)`);
    }
}
for (const fw of UI_FRAMEWORKS) {
    if (exTop.includes(fw) || exTop.includes('vanilla')) {
        fail('examples must not be keyed by UI framework at top level');
    }
}

const clientDeps = deps(clientRel);
for (const d of clientDeps) {
    if (
        d.includes('wasm') ||
        d.startsWith('@wae/wae-') ||
        d === '@wae/ui' ||
        d === '@wae/adapter-vanilla' ||
        UI_FRAMEWORKS.includes(d) ||
        d.startsWith('@wae/adapter-')
    ) {
        fail(`@wae/client must not depend on ${d}`);
    }
}
for (const banned of ['jsx-runtime.ts', 'jsx-dev-runtime.ts', 'jsx-namespace.ts']) {
    if (fs.existsSync(path.join(ROOT, clientRel, 'src', banned))) {
        fail(`@wae/client must not ship ${banned}`);
    }
}
const clientPkg = readPkg(clientRel);
if (clientPkg?.exports?.['./jsx-runtime']) {
    fail('@wae/client must not export jsx-runtime');
}
for (const file of walkFiles(path.join(ROOT, clientRel, 'src'), (p) => /\.(ts|tsx)$/.test(p))) {
    const text = fs.readFileSync(file, 'utf8');
    if (/export\s+(function|const)\s+(jsx|jsxs|Fragment|signal|computed|effect|component|mount|createApp)\b/.test(text)) {
        fail(`client must not export UI primitives: ${path.relative(ROOT, file)}`);
    }
}

for (const fw of ADAPTERS) {
    const rel = `projects/packages/adapter-${fw}`;
    if (!readPkg(rel)) fail(`missing ${rel}`);
    if (!deps(rel).has('@wae/client')) fail(`${fw} adapter must depend on @wae/client`);
}
if (readPkg('projects/packages/adapter-vanilla')) {
    fail('@wae/adapter-vanilla package must not exist');
}

const serverDeps = deps('projects/packages/server');
for (const bad of [
    '@wae/client',
    '@wae/ui',
    '@wae/adapter-vue',
    '@wae/adapter-react',
    '@wae/adapter-svelte',
    '@wae/adapter-solid',
    ...UI_FRAMEWORKS,
]) {
    if (serverDeps.has(bad)) fail(`server must not depend on ${bad}`);
}

for (const a of ['node', 'deno', 'cloudflare']) {
    const d = deps(`projects/packages/server-${a}`);
    if (!d.has('@wae/serverless')) fail(`adapter ${a} must depend on @wae/serverless`);
    if (!d.has('@wae/server')) fail(`adapter ${a} must depend on @wae/server`);
}

const waeRel = 'projects/packages/wae';
const commanderRel = 'projects/packages/commander';
const waePkg = readPkg(waeRel);
const commanderPkg = readPkg(commanderRel);

if (fs.existsSync(path.join(ROOT, 'projects/packages/napi'))) {
    fail('projects/packages/napi must not exist; native lives in @wae/wae-* lib/');
}

if (commanderPkg?.name !== '@wae/commander') {
    fail('@wae/commander missing at projects/packages/commander');
}
if (!deps(waeRel).has('@wae/commander')) {
    fail('@wae/wae must depend on @wae/commander');
}
const commanderDeps = deps(commanderRel);
if (!commanderDeps.has('commander')) {
    fail('@wae/commander must depend on commander');
}
for (const bad of ['@wae/wae', '@wae/napi', '@wae/client', 'vite', 'esbuild']) {
    if (commanderDeps.has(bad)) {
        fail(`@wae/commander must not depend on ${bad}`);
    }
}

const SHELL_PLATFORMS = [
    'wae-win32-x64',
    'wae-win32-arm64',
    'wae-darwin-x64',
    'wae-darwin-arm64',
    'wae-linux-x64',
    'wae-linux-arm64',
    'wae-android-arm64',
    'wae-ios-arm64',
];
for (const dir of SHELL_PLATFORMS) {
    const rel = `projects/packages/${dir}`;
    const pkg = readPkg(rel);
    if (!pkg) fail(`missing ${rel}`);
    const files = pkg.files ?? [];
    if (!files.includes('lib')) fail(`${dir} package.json files must include lib`);
    const d = deps(rel);
    if (!d.has('@wae/types')) fail(`${dir} must depend on @wae/types`);
    if (d.has('@wae/napi')) fail(`${dir} must not depend on @wae/napi`);
}

for (const rel of [clientRel, 'projects/packages/server', waeRel]) {
    if (deps(rel).has('@wae/napi')) {
        fail(`${rel} must not depend on @wae/napi`);
    }
}

const waeSrc = path.join(ROOT, 'projects/packages/wae/src/index.ts');
if (fs.existsSync(waeSrc)) {
    const text = fs.readFileSync(waeSrc, 'utf8');
    if (!/export function defineConfig/.test(text)) {
        fail('@wae/wae must export defineConfig');
    }
    if (/defineWaeConfig/.test(text)) {
        fail('defineWaeConfig is forbidden; use defineConfig');
    }
}
if (waePkg && !fs.existsSync(path.join(ROOT, waeRel, 'src/cli.ts'))) {
    fail('@wae/wae must ship src/cli.ts');
}

if (process.exitCode) {
    console.error('boundary checks failed');
    process.exit(1);
}
console.log('boundary checks ok');
