import { createServer, route } from '@wae/server';

export const app = createServer({
    routes: [route('GET', '/api/health', (ctx) => ctx.json({ ok: true }))],
});
