/** @wae/protocol — 协议 runtime（非仅类型）。类型定义见 @wae/types。 */

import { createRequestId } from '@wae/core';
import type { DomPatch, HostMessage, RpcRequest, RpcResponse, UiEvent, WaeError } from '@wae/types';

export type { DomPatch, HostMessage, RpcRequest, RpcResponse, UiEvent };

export type ClientMessage =
    | { type: 'uiEvent'; event: UiEvent }
    | { type: 'rpc'; request: RpcRequest }
    | { type: 'native'; id: string; capability: string; method: string; args: unknown };

export function encodeMessage(message: ClientMessage | HostMessage): string {
    return JSON.stringify(message);
}

export function decodeClientMessage(raw: string): ClientMessage {
    return JSON.parse(raw) as ClientMessage;
}

export function decodeHostMessage(raw: string): HostMessage {
    return JSON.parse(raw) as HostMessage;
}

export function createRpcRequest(method: string, args: unknown = null): RpcRequest {
    return {
        id: createRequestId(),
        method,
        args,
    };
}

export function okRpcResponse(id: string, body: unknown): RpcResponse {
    return { id, ok: true, body };
}

export function errRpcResponse(id: string, error: WaeError): RpcResponse {
    return { id, ok: false, body: error };
}

export function hostDomPatches(patches: DomPatch[]): HostMessage {
    return { type: 'domPatch', patches };
}
