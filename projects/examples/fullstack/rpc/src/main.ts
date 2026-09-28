import { createClient } from '@wae/client';
import { createServer } from '@wae/server';

const client = createClient({ server: { baseUrl: '/api' } });
const app = createServer();
void client;
void app;
