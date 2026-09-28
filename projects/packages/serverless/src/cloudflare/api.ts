/** Shared Cloudflare REST helpers (fetch only). */

export const CLOUDFLARE_API_BASE = 'https://api.cloudflare.com/client/v4';

export type CloudflareApiErrorItem = { code?: number; message?: string };

export type CloudflareApiEnvelope<T = unknown> = {
    success: boolean;
    errors?: CloudflareApiErrorItem[];
    messages?: Array<{ message?: string }>;
    result?: T;
};

export class CloudflareApiError extends Error {
    readonly status: number;
    readonly errors: CloudflareApiErrorItem[];

    constructor(message: string, status: number, errors: CloudflareApiErrorItem[] = []) {
        super(message);
        this.name = 'CloudflareApiError';
        this.status = status;
        this.errors = errors;
    }
}

export function formatCloudflareApiErrors(errors: CloudflareApiErrorItem[]): string {
    if (errors.length === 0) return 'Cloudflare API request failed';
    return errors.map((error) => error.message ?? `error ${error.code ?? 'unknown'}`).join('; ');
}

export async function callCloudflareApi<T>(
    url: string,
    options: {
        apiToken: string;
        method?: string;
        body?: BodyInit;
        fetch?: typeof fetch;
    },
): Promise<T> {
    const fetchFn = options.fetch ?? fetch;
    const response = await fetchFn(url, {
        method: options.method ?? 'GET',
        headers: {
            Authorization: `Bearer ${options.apiToken}`,
            ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: options.body,
    });

    const envelope = (await response.json()) as CloudflareApiEnvelope<T>;
    if (!response.ok || !envelope.success) {
        throw new CloudflareApiError(formatCloudflareApiErrors(envelope.errors ?? []), response.status, envelope.errors ?? []);
    }

    return envelope.result as T;
}
