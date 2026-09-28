/** Publish a Worker module via the Cloudflare Workers Scripts API (fetch only). */

const DEFAULT_COMPATIBILITY_DATE = '2024-09-01';
const API_BASE = 'https://api.cloudflare.com/client/v4';

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

type CloudflareApiEnvelope = {
    success: boolean;
    errors?: Array<{ code?: number; message?: string }>;
    messages?: Array<{ message?: string }>;
    result?: { etag?: string };
};

export class CloudflareApiError extends Error {
    readonly status: number;
    readonly errors: Array<{ code?: number; message?: string }>;

    constructor(message: string, status: number, errors: Array<{ code?: number; message?: string }> = []) {
        super(message);
        this.name = 'CloudflareApiError';
        this.status = status;
        this.errors = errors;
    }
}

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
    return `${API_BASE}/accounts/${encodeURIComponent(accountId)}/workers/scripts/${encodeURIComponent(scriptName)}`;
}

function formatApiErrors(errors: Array<{ code?: number; message?: string }>): string {
    if (errors.length === 0) return 'Cloudflare API request failed';
    return errors.map((error) => error.message ?? `error ${error.code ?? 'unknown'}`).join('; ');
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

    const body = (await response.json()) as CloudflareApiEnvelope;
    if (!response.ok || !body.success) {
        throw new CloudflareApiError(formatApiErrors(body.errors ?? []), response.status, body.errors ?? []);
    }

    return {
        scriptName: options.scriptName,
        accountId: options.accountId,
        moduleFile,
        etag: body.result?.etag,
    };
}
