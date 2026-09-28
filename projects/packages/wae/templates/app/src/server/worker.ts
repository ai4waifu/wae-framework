import { createWorker } from '@wae/server-cloudflare';
import { app } from './app';

export default createWorker(app);
