import type { WaeClient } from '@wae/client';
import { getContext, setContext } from 'svelte';

const KEY = Symbol.for('wae.client');

/** 在根组件初始化时调用（Svelte context 仅对子树可见） */
export function setWaeContext(client: WaeClient): void {
    setContext(KEY, client);
}

export function getWaeContext(): WaeClient {
    const client = getContext<WaeClient | undefined>(KEY);
    if (!client) {
        throw new Error('getWaeContext() 需要先在父组件调用 setWaeContext(client)');
    }
    return client;
}

export default function svelte(): { name: 'svelte' } {
    return { name: 'svelte' };
}
