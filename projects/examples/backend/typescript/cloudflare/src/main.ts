import { createApp } from '@wae/core';
import { worker } from '@wae/serverless/cloudflare';

const app = createApp();
export default worker(app);
