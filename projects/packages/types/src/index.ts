/**
 * @wae/types — 仅类型，无 runtime。
 * 正式产物由 `wae generate types` 从 `projects/crates/wae-types`（crate wae-types）生成。
 */

export type {
    OpenDesktopOptions,
    ProductDownloadPolicy,
    ProductUpdateChannel,
    ProductUpdateOptions,
    ProductUpdateStatus,
    WaeNativeAddon,
} from './native.js';
export type { NativeShellPlatformId } from './platform-native.js';
export { isNativeShellPlatform, PLATFORM_NATIVE_LIB_FILE, platformNativeLibFile } from './platform-native.js';
export type {
    ClientPlatformId,
    WaeProductDownloadPolicy,
    WaeProductManifest,
    WaeProductServerBundle,
    WaeProductUpdateChannel,
    WaeProductUpdateConfig,
} from './product.js';
export { WAE_PRODUCT_MANIFEST } from './product.js';
export type {
    WaeWebSocket,
    WaeWebSocketCloseEvent,
    WaeWebSocketData,
    WaeWebSocketEvent,
    WaeWebSocketListener,
    WaeWebSocketMessageEvent,
} from './websocket.js';

export type NodeId = string;
export type RequestId = string;
export type RouteId = string;
export type SessionId = string;

export type ErrorCode = 'Unknown' | 'InvalidRequest' | 'Unauthorized' | 'NotFound' | 'Conflict' | 'Internal';

export type WaeError = {
    code: ErrorCode | number;
    message: string;
    details?: unknown;
};

export type DomPatch =
    | { op: 'createElement'; id: string; tag: string; parent: string | null }
    | { op: 'removeNode'; id: string }
    | { op: 'setAttribute'; id: string; name: string; value: string | null }
    | { op: 'setProperty'; id: string; name: string; value: unknown }
    | { op: 'setText'; id: string; text: string }
    | { op: 'insertChild'; parent: string; child: string; index: number }
    | { op: 'removeChild'; parent: string; child: string };

export type UiEvent = {
    kind: string;
    target: string;
    payload?: unknown;
};

export type RpcRequest = {
    id: string;
    method: string;
    args: unknown;
};

export type RpcResponse = {
    id: string;
    ok: boolean;
    body: unknown;
};

export type HostMessage =
    | { type: 'domPatch'; patches: DomPatch[] }
    | { type: 'rpc'; response: RpcResponse }
    | { type: 'error'; error: WaeError };
