/** 到 @wae/server 的框架无关 HTTP / RPC / action 客户端。 */

export type ServerClientOptions = {
    baseUrl: string;
    fetchImpl?: typeof fetch;
};

export type ServerAction<Input, Output> = {
    execute(input: Input): Promise<Output>;
};

export type ServerClient = {
    fetch(input: string | URL, init?: RequestInit): Promise<Response>;
    action<Input, Output>(name: string): ServerAction<Input, Output>;
};

export function createServerClient(options: ServerClientOptions): ServerClient {
    const fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
    const base = options.baseUrl.replace(/\/$/, '');

    return {
        fetch(input, init) {
            const url = typeof input === 'string' && input.startsWith('/') ? `${base}${input}` : input;
            return fetchImpl(url, init);
        },
        action<Input, Output>(name: string): ServerAction<Input, Output> {
            return {
                async execute(input: Input) {
                    const res = await fetchImpl(`${base}/__wae/action/${name}`, {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify(input ?? null),
                    });
                    if (!res.ok) {
                        throw new Error(`server action ${name} failed: ${res.status}`);
                    }
                    return (await res.json()) as Output;
                },
            };
        },
    };
}
