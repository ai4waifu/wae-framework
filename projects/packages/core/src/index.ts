/** @wae/core — 共享 runtime：跨宿主 HTTP app、工具函数；不含 DOM/JSX、协议编解码、视觉组件。 */

import type { WaeError } from '@wae/types';

export {
    createApp,
    createServer,
    route,
    type CreateAppOptions,
    type CreateServerOptions,
    type HttpMethod,
    type JsonValue,
    type Route,
    type RouteHandler,
    type WaeApp,
    type WaeContext,
    type WaeExecutionContext,
    type WaeRequest,
    type WaeRequestContext,
    type WaeServerApp,
} from './app.js';

export function createRequestId(): string {
    return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createNodeId(): string {
    return `node_${Math.random().toString(36).slice(2, 11)}`;
}

export function isWaeError(value: unknown): value is WaeError {
    return (
        typeof value === 'object' && value !== null && 'code' in value && 'message' in value && typeof (value as WaeError).message === 'string'
    );
}

export function toErrorMessage(error: unknown): string {
    if (isWaeError(error)) return error.message;
    if (error instanceof Error) return error.message;
    return String(error);
}
