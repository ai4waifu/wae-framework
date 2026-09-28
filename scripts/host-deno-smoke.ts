/**
 * Deno runtime smoke — imports built workspace dist and exercises `@wae/server/deno` fetch handler.
 */
import { createApp, route } from '../projects/packages/core/dist/index.js';
import { serve } from '../projects/packages/server/dist/deno/index.js';

const app = createApp({
    routes: [route('GET', '/health', (ctx) => ctx.json({ ok: true }))],
});

const handler = serve(app);
const health = await handler(new Request('http://deno.local/health'));
if (health.status !== 200) {
    throw new Error(`expected status 200, got ${health.status}`);
}
const body = await health.json();
if (!body || typeof body !== 'object' || (body as { ok?: boolean }).ok !== true) {
    throw new Error(`unexpected body: ${JSON.stringify(body)}`);
}

const wrongMethod = await handler(new Request('http://deno.local/health', { method: 'POST' }));
if (wrongMethod.status !== 405) {
    throw new Error(`expected status 405, got ${wrongMethod.status}`);
}

console.log('host-deno: ok');
