import type { WaeClient } from '@wae/client';
import { createComponent, createContext, type ParentProps, useContext } from 'solid-js';

const WaeContext = createContext<WaeClient>();

export type WaeProviderProps = ParentProps<{ client: WaeClient }>;

export function WaeProvider(props: WaeProviderProps) {
    return createComponent(WaeContext.Provider, {
        get value() {
            return props.client;
        },
        get children() {
            return props.children;
        },
    });
}

export function useWae(): WaeClient {
    const client = useContext(WaeContext);
    if (!client) {
        throw new Error('useWae() 需要包裹在 <WaeProvider client={…}> 内');
    }
    return client;
}

export default function solid(): { name: 'solid' } {
    return { name: 'solid' };
}
