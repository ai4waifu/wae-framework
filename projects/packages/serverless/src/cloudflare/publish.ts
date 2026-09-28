/** Publish a Worker module via the Cloudflare Workers Scripts API (fetch only). */

import {
    CloudflareApiError,
    formatCloudflareApiErrors,
    type CloudflareApiEnvelope,
    CLOUDFLARE_API_BASE,
} from './api.js';

const DEFAULT_COMPATIBILITY_DATE = '2024-09-01';

export type PublishWorkerBundleOptions = {
    accountId: string;
    apiToken: string;
    scriptName: string;
    /** Module part filename, e.g. `worker.mjs`. Must match `metadata.main_module`. */
    moduleFile: string;
    scriptBody: string;
    compatibilityDate?: string;
    bindings?: Record<string, unknown>[];
    fetch?: typeof fetch;
};

export type PublishWorkerBundleResult = {
    scriptName: string;
    accountId: string;
    moduleFile: string;
    etag?: string;
};

export { CloudflareApiError } from './api.js';

export function buildWorkerUploadForm(
    moduleFile: string,
    scriptBody: string,
    metadata: Record<string, unknown>,
): FormData {
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append(moduleFile, new Blob([scriptBody], { type: 'application/javascript+module' }), moduleFile);
    return form;
}

export function workerScriptUploadUrl(accountId: string, scriptName: string): string {
    return `${CLOUDFLARE_API_BASE}/accounts/${encodeURIComponent(accountId)}/workers/scripts/${encodeURIComponent(scriptName)}`;
}

export async function publishWorkerBundle(options: PublishWorkerBundleOptions): Promise<PublishWorkerBundleResult> {
    const moduleFile = options.moduleFile.replaceAll('\\', '/');
    if (!moduleFile || options.scriptBody.trim().length === 0) {
        throw new Error('Worker module file and script body are required');
    }

    const metadata: Record<string, unknown> = {
        main_module: moduleFile,
        compatibility_date: options.compatibilityDate ?? DEFAULT_COMPATIBILITY_DATE,
    };
    if (options.bindings?.length) {
        metadata.bindings = options.bindings;
    }

    const fetchFn = options.fetch ?? fetch;
    const url = workerScriptUploadUrl(options.accountId, options.scriptName);
    const response = await fetchFn(url, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${options.apiToken}`,
        },
        body: buildWorkerUploadForm(moduleFile, options.scriptBody, metadata),
    });

    const body = (await response.json()) as CloudflareApiEnvelope<{ etag?: string }>;
    if (!response.ok || !body.success) {
        throw new CloudflareApiError(formatCloudflareApiErrors(body.errors ?? []), response.status, body.errors ?? []);
    }

    return {
        scriptName: options.scriptName,
        accountId: options.accountId,
        moduleFile,
        etag: body.result?.etag,
    };
}
