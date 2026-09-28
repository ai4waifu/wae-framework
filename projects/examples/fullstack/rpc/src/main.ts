import { createClient } from '@wae/client';
import { createApp } from '@wae/core';

const app = createApp({
    actions: {
        greet: (input: { name?: string }) => ({ ok: true, name: input?.name ?? 'world' }),
    },
    rpc: {
        sum: (args: { a: number; b: number }) => args.a + args.b,
    },
});

const client = createClient({ server: { baseUrl: '/api' } });
void client;
void app;
