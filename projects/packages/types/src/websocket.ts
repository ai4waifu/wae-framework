/** Platform-neutral WebSocket surface (transport adapters live in host packages). */

export type WaeWebSocketData = string | ArrayBuffer | Uint8Array;

export type WaeWebSocketMessageEvent = {
    type: 'message';
    data: WaeWebSocketData;
};

export type WaeWebSocketCloseEvent = {
    type: 'close';
    code: number;
    reason: string;
    wasClean: boolean;
};

export type WaeWebSocketEvent = WaeWebSocketMessageEvent | WaeWebSocketCloseEvent;

export type WaeWebSocketListener = (event: WaeWebSocketEvent) => void;

/** Minimal socket contract shared by server and serverless host adapters. */
export type WaeWebSocket = {
    send(data: WaeWebSocketData): void | Promise<void>;
    close(code?: number, reason?: string): void;
    addEventListener(type: 'message' | 'close', listener: WaeWebSocketListener): void;
    removeEventListener(type: 'message' | 'close', listener: WaeWebSocketListener): void;
};
