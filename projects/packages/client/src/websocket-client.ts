/** WebSocket 客户端占位（框架无关）。 */

export type WsClient = {
    send(data: string | ArrayBufferLike): void;
    close(): void;
};

export function createWebSocketClient(url: string): WsClient {
    if (typeof WebSocket === 'undefined') {
        return {
            send() {
                throw new Error('WebSocket unavailable');
            },
            close() {},
        };
    }
    const ws = new WebSocket(url);
    return {
        send(data) {
            ws.send(data);
        },
        close() {
            ws.close();
        },
    };
}
