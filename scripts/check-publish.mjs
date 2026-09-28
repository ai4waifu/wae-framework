#!/usr/bin/env node
/**
 * check-publish — Cloudflare Workers Scripts API upload (mocked fetch).
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packagesRoot = path.join(root, 'projects/packages');

function buildPackages() {
    for (const name of ['@wae/types', '@wae/serverless', '@wae/wae']) {
        const r = spawnSync('pnpm', ['--filter', name, 'run', 'build'], {
            cwd: root,
            stdio: 'inherit',
            shell: true,
            windowsHide: true,
        });
        if (r.status !== 0) process.exit(r.status ?? 1);
    }
}

buildPackages();

const { publishWorkerBundle, workerScriptUploadUrl } = await import(
    pathToFileURL(path.join(packagesRoot, 'serverless/dist/cloudflare/publish.js')).href
);
const { syncWorkerCustomDomains, workerDomainsUrl } = await import(
    pathToFileURL(path.join(packagesRoot, 'serverless/dist/cloudflare/domains.js')).href
);
const { syncWorkerRoutes, workerRoutesListUrl, workerRouteItemUrl } = await import(
    pathToFileURL(path.join(packagesRoot, 'serverless/dist/cloudflare/routes.js')).href
);
const { loadPublishArtifact } = await import(pathToFileURL(path.join(packagesRoot, 'wae/dist/cli/publish-artifact.js')).href);
const { resolveProductDir } = await import(pathToFileURL(path.join(packagesRoot, 'wae/dist/cli/resolve-product-dir.js')).href);
const { defineConfig } = await import(pathToFileURL(path.join(packagesRoot, 'wae/dist/index.js')).href);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wae-publish-'));
try {
    const productRoot = path.join(tmp, 'dist', 'web');
    fs.mkdirSync(path.join(productRoot, 'server'), { recursive: true });
    fs.writeFileSync(
        path.join(productRoot, 'wae-product.json'),
        `${JSON.stringify(
            {
                schemaVersion: 1,
                name: 'demo-worker',
                version: '0.0.0',
                platform: 'web',
                server: { deployTarget: 'cloudflare', entry: 'server/worker.mjs' },
            },
            null,
            4,
        )}\n`,
        'utf8',
    );
    fs.writeFileSync(path.join(productRoot, 'server/worker.mjs'), 'export default { async fetch() { return new Response("ok") } }\n', 'utf8');

    const artifact = loadPublishArtifact(productRoot);
    assert.equal(artifact.moduleFile, 'worker.mjs');
    assert.match(artifact.scriptBody, /export default/);

    const resolved = resolveProductDir(tmp, {}, defineConfig({ deployTarget: 'cloudflare', product: { outDir: 'dist' } }));
    assert.equal(resolved, productRoot);

    let capturedUrl = '';
    let capturedMethod = '';
    let capturedAuth = '';
    let capturedForm = null;
    const result = await publishWorkerBundle({
        accountId: 'acct_test',
        apiToken: 'token_test',
        scriptName: 'demo-worker',
        moduleFile: artifact.moduleFile,
        scriptBody: artifact.scriptBody,
        fetch: async (url, init) => {
            capturedUrl = String(url);
            capturedMethod = init?.method ?? 'GET';
            const headers = init?.headers;
            if (headers instanceof Headers) {
                capturedAuth = headers.get('Authorization') ?? '';
            } else {
                capturedAuth = headers?.Authorization ?? headers?.authorization ?? '';
            }
            capturedForm = init?.body;
            return {
                ok: true,
                status: 200,
                json: async () => ({ success: true, result: { etag: 'etag-demo' }, errors: [], messages: [] }),
            };
        },
    });

    assert.equal(capturedMethod, 'PUT');
    assert.equal(capturedUrl, workerScriptUploadUrl('acct_test', 'demo-worker'));
    assert.equal(capturedAuth, 'Bearer token_test');
    assert.ok(capturedForm instanceof FormData);
    assert.equal(result.scriptName, 'demo-worker');
    assert.equal(result.moduleFile, 'worker.mjs');
    assert.equal(result.etag, 'etag-demo');

    const domainCalls = [];
    const domainSync = await syncWorkerCustomDomains({
        accountId: 'acct_test',
        apiToken: 'token_test',
        scriptName: 'demo-worker',
        domains: [
            { hostname: 'api.example.com', zoneId: 'zone_api' },
            { hostname: 'www.example.com', zoneId: 'zone_www' },
        ],
        fetch: async (url, init) => {
            domainCalls.push({ url: String(url), method: init?.method ?? 'GET', body: init?.body });
            const pathUrl = String(url);
            if (pathUrl === workerDomainsUrl('acct_test') && (init?.method ?? 'GET') === 'GET') {
                return {
                    ok: true,
                    status: 200,
                    json: async () => ({
                        success: true,
                        result: [{ id: 'dom-existing', hostname: 'api.example.com', service: 'other-worker', zone_id: 'zone_api' }],
                        errors: [],
                    }),
                };
            }
            if (pathUrl === workerDomainsUrl('acct_test') && init?.method === 'PUT') {
                const payload = JSON.parse(String(init.body));
                return {
                    ok: true,
                    status: 200,
                    json: async () => ({
                        success: true,
                        result: {
                            id: payload.hostname === 'www.example.com' ? 'dom-new' : 'dom-existing',
                            hostname: payload.hostname,
                            service: payload.service,
                            zone_id: payload.zone_id,
                        },
                        errors: [],
                    }),
                };
            }
            throw new Error(`unexpected domain fetch ${pathUrl} ${init?.method ?? 'GET'}`);
        },
    });

    assert.deepEqual(domainSync.created, ['www.example.com']);
    assert.deepEqual(domainSync.updated, ['api.example.com']);
    assert.deepEqual(domainSync.unchanged, []);
    assert.equal(domainCalls.length, 3);

    const routeCalls = [];
    const routeSync = await syncWorkerRoutes({
        accountId: 'acct_test',
        apiToken: 'token_test',
        scriptName: 'demo-worker',
        routes: [{ pattern: 'api.example.com/*' }, { pattern: 'www.example.com/*' }],
        fetch: async (url, init) => {
            routeCalls.push({ url: String(url), method: init?.method ?? 'GET', body: init?.body });
            const pathUrl = String(url);
            if (pathUrl === workerRoutesListUrl('acct_test') && (init?.method ?? 'GET') === 'GET') {
                return {
                    ok: true,
                    status: 200,
                    json: async () => ({
                        success: true,
                        result: [{ id: 'route-existing', pattern: 'api.example.com/*', script: 'other-worker' }],
                        errors: [],
                    }),
                };
            }
            if (pathUrl === workerRoutesListUrl('acct_test') && init?.method === 'POST') {
                return {
                    ok: true,
                    status: 200,
                    json: async () => ({
                        success: true,
                        result: { id: 'route-new', pattern: 'www.example.com/*', script: 'demo-worker' },
                        errors: [],
                    }),
                };
            }
            if (pathUrl === workerRouteItemUrl('acct_test', 'route-existing') && init?.method === 'PUT') {
                return {
                    ok: true,
                    status: 200,
                    json: async () => ({
                        success: true,
                        result: { id: 'route-existing', pattern: 'api.example.com/*', script: 'demo-worker' },
                        errors: [],
                    }),
                };
            }
            throw new Error(`unexpected route fetch ${pathUrl} ${init?.method ?? 'GET'}`);
        },
    });

    assert.deepEqual(routeSync.created, ['www.example.com/*']);
    assert.deepEqual(routeSync.updated, ['api.example.com/*']);
    assert.deepEqual(routeSync.unchanged, []);
    assert.equal(routeCalls.length, 3);

    console.log('check-publish: ok');
} finally {
    fs.rmSync(tmp, { recursive: true, force: true });
}
