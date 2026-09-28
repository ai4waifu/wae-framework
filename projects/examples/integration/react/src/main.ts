import * as adapter from '@wae/adapter-react';
import { createClient } from '@wae/client';

const client = createClient({ server: { baseUrl: '/api' } });
void client;
void adapter;
