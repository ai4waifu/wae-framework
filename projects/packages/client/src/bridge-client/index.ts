/** 与原生壳交互的稳定抽象（纯 TS；不 import Rust/WASM）。 */

export type BridgeRequest =
    | { type: 'window.open'; payload: Record<string, unknown> }
    | { type: 'clipboard.read' }
    | { type: 'clipboard.write'; payload: { text: string } }
    | { type: 'fs.read'; payload: { path: string } };

export type BridgeResponse =
    | { type: 'ok'; requestId: string; payload: unknown }
    | { type: 'error'; requestId: string; error: { message: string } };

export interface NativeBridge {
    request<TResponse = unknown>(request: BridgeRequest): Promise<TResponse>;
}

/** 浏览器：无壳实现（拒绝或 no-op），不加载 Rust。 */
export function createBrowserBridge(): NativeBridge {
    return {
        async request() {
            throw new Error('native bridge unavailable in browser');
        },
    };
}

/** 桌面/移动：由 platform adapter 注入 IPC transport。 */
export function createNativeIpcBridge(transport: {
    postMessage(data: string): void;
    onMessage(cb: (data: string) => void): void;
}): NativeBridge {
    void transport;
    return {
        async request() {
            throw new Error('native IPC bridge skeleton');
        },
    };
}
