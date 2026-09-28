/** Sync Worker custom domains via the Cloudflare Workers Domains API (fetch only). */

import { callCloudflareApi, CLOUDFLARE_API_BASE } from './api.js';

export type WorkerCustomDomain = {
    hostname: string;
    zoneId?: string;
    zoneName?: string;
    overrideExistingOrigin?: boolean;
};

export type SyncWorkerCustomDomainsOptions = {
    accountId: string;
    apiToken: string;
    scriptName: string;
    domains: WorkerCustomDomain[];
    /** Defaults to `production`. */
    environment?: string;
    fetch?: typeof fetch;
};

export type SyncWorkerCustomDomainsResult = {
    created: string[];
    updated: string[];
    unchanged: string[];
};

type WorkerDomainRecord = {
    id: string;
    hostname: string;
    service: string;
    zone_id: string;
    environment?: string;
};

export function workerDomainsUrl(accountId: string): string {
    return `${CLOUDFLARE_API_BASE}/accounts/${encodeURIComponent(accountId)}/workers/domains`;
}

function normalizeHostname(hostname: string): string {
    const trimmed = hostname.trim().toLowerCase();
    if (!trimmed) {
        throw new Error('Custom domain hostname must not be empty');
    }
    return trimmed;
}

export async function syncWorkerCustomDomains(
    options: SyncWorkerCustomDomainsOptions,
): Promise<SyncWorkerCustomDomainsResult> {
    if (options.domains.length === 0) {
        return { created: [], updated: [], unchanged: [] };
    }

    const environment = options.environment ?? 'production';
    const fetchFn = options.fetch;
    const existing = await callCloudflareApi<WorkerDomainRecord[]>(workerDomainsUrl(options.accountId), {
        apiToken: options.apiToken,
        fetch: fetchFn,
    });

    const byHostname = new Map(existing.map((record) => [record.hostname.toLowerCase(), record]));
    const created: string[] = [];
    const updated: string[] = [];
    const unchanged: string[] = [];

    for (const domain of options.domains) {
        const hostname = normalizeHostname(domain.hostname);
        if (!domain.zoneId && !domain.zoneName) {
            throw new Error(`custom domain ${hostname} requires zoneId or zoneName in wae.config`);
        }

        const body: Record<string, unknown> = {
            hostname,
            service: options.scriptName,
            environment,
        };
        if (domain.zoneId) body.zone_id = domain.zoneId;
        if (domain.zoneName) body.zone_name = domain.zoneName;
        if (domain.overrideExistingOrigin !== undefined) {
            body.override_existing_origin = domain.overrideExistingOrigin;
        }

        const current = byHostname.get(hostname);
        if (!current) {
            await callCloudflareApi<WorkerDomainRecord>(workerDomainsUrl(options.accountId), {
                apiToken: options.apiToken,
                method: 'PUT',
                body: JSON.stringify(body),
                fetch: fetchFn,
            });
            created.push(hostname);
            continue;
        }

        if (current.service === options.scriptName) {
            unchanged.push(hostname);
            continue;
        }

        await callCloudflareApi<WorkerDomainRecord>(workerDomainsUrl(options.accountId), {
            apiToken: options.apiToken,
            method: 'PUT',
            body: JSON.stringify(body),
            fetch: fetchFn,
        });
        updated.push(hostname);
    }

    return { created, updated, unchanged };
}
