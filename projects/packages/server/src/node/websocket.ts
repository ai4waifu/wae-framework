/** Node.js WebSocket upgrade boundary — not wired in 0.0.x (use Deno or Cloudflare). */

export function upgradeWebSocket(): never {
    throw new Error(
        'Node.js WebSocket upgrade is not wired yet — use @wae/server/deno or @wae/serverless/cloudflare for WebSocket hosts',
    );
}
