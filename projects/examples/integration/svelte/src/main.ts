import * as adapter from '@wae/adapter-svelte';
import { createClient } from '@wae/client';

const client = createClient({ server: { baseUrl: '/api' } });
void client;
void adapter;
