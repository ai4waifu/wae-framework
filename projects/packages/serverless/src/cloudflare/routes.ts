/** Sync Worker HTTP routes via the Cloudflare Workers Routes API (fetch only). */

import { callCloudflareApi, CLOUDFLARE_API_BASE } from './api.js';

export type WorkerRoutePattern = {
    pattern: string;
};

export type SyncWorkerRoutesOptions = {
    accountId: string;
    apiToken: string;
    scriptName: string;
    routes: WorkerRoutePattern[];
    fetch?: typeof fetch;
};

export type SyncWorkerRoutesResult = {
    created: string[];
    updated: string[];
    unchanged: string[];
};

type WorkerRouteRecord = {
    id: string;
    pattern: string;
    script: string | null;
};

export function workerRoutesListUrl(accountId: string): string {
    return `${CLOUDFLARE_API_BASE}/accounts/${encodeURIComponent(accountId)}/workers/routes`;
}

export function workerRouteItemUrl(accountId: string, routeId: string): string {
    return `${workerRoutesListUrl(accountId)}/${encodeURIComponent(routeId)}`;
}

function normalizePattern(pattern: string): string {
    const trimmed = pattern.trim();
    if (!trimmed) {
        throw new Error('Worker route pattern must not be empty');
    }
    return trimmed;
}

export async function syncWorkerRoutes(options: SyncWorkerRoutesOptions): Promise<SyncWorkerRoutesResult> {
    const desired = options.routes.map((route) => normalizePattern(route.pattern));
    if (desired.length === 0) {
        return { created: [], updated: [], unchanged: [] };
    }

    const fetchFn = options.fetch;
    const existing = await callCloudflareApi<WorkerRouteRecord[]>(workerRoutesListUrl(options.accountId), {
        apiToken: options.apiToken,
        fetch: fetchFn,
    });

    const byPattern = new Map(existing.map((route) => [route.pattern, route]));
    const created: string[] = [];
    const updated: string[] = [];
    const unchanged: string[] = [];

    for (const pattern of desired) {
        const current = byPattern.get(pattern);
        if (!current) {
            await callCloudflareApi<WorkerRouteRecord>(workerRoutesListUrl(options.accountId), {
                apiToken: options.apiToken,
                method: 'POST',
                body: JSON.stringify({ pattern, script: options.scriptName }),
                fetch: fetchFn,
            });
            created.push(pattern);
            continue;
        }

        if (current.script === options.scriptName) {
            unchanged.push(pattern);
            continue;
        }

        await callCloudflareApi<WorkerRouteRecord>(workerRouteItemUrl(options.accountId, current.id), {
            apiToken: options.apiToken,
            method: 'PUT',
            body: JSON.stringify({ pattern, script: options.scriptName }),
            fetch: fetchFn,
        });
        updated.push(pattern);
    }

    return { created, updated, unchanged };
}
