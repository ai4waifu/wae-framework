import type { WaeClient } from '@wae/client';
import { inject } from 'vue';

const KEY = Symbol('wae');

export function provideWae(app: { provide(k: symbol, v: unknown): void }, client: WaeClient) {
    app.provide(KEY, client);
}

export function useWae(): WaeClient {
    const client = inject<WaeClient | undefined>(KEY, undefined);
    if (!client) {
        throw new Error('useWae() 需要先调用 provideWae(app, client)');
    }
    return client;
}

export default function vue(): { name: 'vue' } {
    return { name: 'vue' };
}
