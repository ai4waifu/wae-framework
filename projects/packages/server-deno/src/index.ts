import type { WaeServerApp } from '@wae/server';
import { adaptFetch } from '@wae/serverless';

export function serve<Env = unknown>(app: WaeServerApp<Env>) {
    const { fetch } = adaptFetch(app);
    return (request: Request) => fetch(request, {} as Env);
}
