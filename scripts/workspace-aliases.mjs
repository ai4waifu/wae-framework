/** esbuild aliases for conformance scripts (no `pnpm install` in temp apps). */
import path from 'node:path';

export function workspaceAliases(packagesRoot, target) {
    const coreDist = path.join(packagesRoot, 'core/dist');
    const serverDist = path.join(packagesRoot, 'server/dist');
    const alias = {
        '@wae/core/websocket': path.join(coreDist, 'websocket/index.js'),
        '@wae/core': path.join(coreDist, 'index.js'),
    };
    if (target === 'cloudflare') {
        alias['@wae/serverless/cloudflare'] = path.join(packagesRoot, 'serverless/dist/cloudflare/index.js');
    } else if (target === 'node') {
        alias['@wae/server/node'] = path.join(serverDist, 'node/index.js');
    } else {
        alias['@wae/server/deno'] = path.join(serverDist, 'deno/index.js');
    }
    return alias;
}
