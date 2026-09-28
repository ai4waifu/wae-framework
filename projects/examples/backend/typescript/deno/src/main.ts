import { createApp } from '@wae/core';
import { serve } from '@wae/server/deno';

const app = createApp();
export default { fetch: serve(app) };
