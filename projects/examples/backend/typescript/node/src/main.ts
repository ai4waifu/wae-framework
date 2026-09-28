import { createApp } from '@wae/core';
import { serve } from '@wae/server/node';

const app = createApp();
await serve(app);
