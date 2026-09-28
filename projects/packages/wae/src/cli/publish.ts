/** `wae publish` — upload built Worker via Cloudflare Scripts API. */

import type { WaePublishOptions } from '@wae/commander';
import { publishWorkerBundle } from '@wae/serverless/cloudflare/publish';
import { syncWorkerRoutes } from '@wae/serverless/cloudflare/routes';
import { resolveDeployTarget } from './deploy-target.js';
import { loadWaeConfig } from './load-config.js';
import { loadPublishArtifact } from './publish-artifact.js';
import { resolveProductDir } from './resolve-product-dir.js';

export function resolveCloudflareCredentials(config: {
    cloudflare?: { accountId?: string; apiToken?: string };
}): { accountId: string; apiToken: string } {
    const accountId = config.cloudflare?.accountId ?? process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = config.cloudflare?.apiToken ?? process.env.CLOUDFLARE_API_TOKEN;
    if (!accountId) {
        throw new Error('missing Cloudflare account id — set CLOUDFLARE_ACCOUNT_ID or cloudflare.accountId in wae.config');
    }
    if (!apiToken) {
        throw new Error('missing Cloudflare API token — set CLOUDFLARE_API_TOKEN or cloudflare.apiToken in wae.config');
    }
    return { accountId, apiToken };
}

export async function cmdPublish(options: WaePublishOptions): Promise<void> {
    const cwd = process.cwd();
    const { path: configPath, config } = await loadWaeConfig(cwd);
    const deployTarget = resolveDeployTarget(config);
    if (deployTarget !== 'cloudflare') {
        throw new Error(`wae publish requires deployTarget=cloudflare (got ${deployTarget ?? 'unset'})`);
    }

    const productRoot = resolveProductDir(cwd, options, config);
    const artifact = loadPublishArtifact(productRoot);
    const credentials = resolveCloudflareCredentials(config);
    const scriptName = config.cloudflare?.scriptName ?? artifact.manifest.name;
    const result = await publishWorkerBundle({
        accountId: credentials.accountId,
        apiToken: credentials.apiToken,
        scriptName,
        moduleFile: artifact.moduleFile,
        scriptBody: artifact.scriptBody,
        compatibilityDate: config.cloudflare?.compatibilityDate,
        bindings: config.cloudflare?.bindings,
    });

    const routes = config.cloudflare?.routes;
    if (routes?.length) {
        const routeSync = await syncWorkerRoutes({
            accountId: credentials.accountId,
            apiToken: credentials.apiToken,
            scriptName,
            routes,
        });
        if (routeSync.created.length) {
            console.log(`[wae publish] routes created=${routeSync.created.join(',')}`);
        }
        if (routeSync.updated.length) {
            console.log(`[wae publish] routes updated=${routeSync.updated.join(',')}`);
        }
        if (routeSync.unchanged.length) {
            console.log(`[wae publish] routes unchanged=${routeSync.unchanged.join(',')}`);
        }
    }

    console.log(`[wae publish] script=${result.scriptName}`);
    console.log(`[wae publish] account=${result.accountId}`);
    console.log(`[wae publish] module=${result.moduleFile}`);
    if (result.etag) {
        console.log(`[wae publish] etag=${result.etag}`);
    }
    console.log(`[wae publish] product=${productRoot}`);
    console.log(`[wae publish] config=${configPath}`);
}
