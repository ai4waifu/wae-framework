import { createClient } from '@wae/client';
import { createApp } from '@wae/core';

const client = createClient({ server: { baseUrl: '/api' } });
const app = createApp();
void client;
void app;
