import { createClient } from '@wae/client';

const client = createClient({
    server: { baseUrl: '/api' },
    env: { target: 'desktop', hasNativeBridge: true },
});
void client;
