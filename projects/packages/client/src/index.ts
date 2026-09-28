/**
 * @wae/client — 框架无关应用运行时。
 *
 * 纯 TS / 原生 DOM 直接使用本包，无需 adapter。
 * Vue / React / Svelte / Solid 经独立 @wae/adapter-* 接入。
 * 不提供：JSX、VDOM、组件、hooks、signals、stores、CSS/layout/design system。
 */

import { createBrowserBridge, createNativeIpcBridge, type NativeBridge } from './bridge-client/index.js';
import { detectEnvironment, type RuntimeEnvironment } from './env.js';
import { type AppLifecycle, type AppLifecycleHooks, createLifecycle } from './lifecycle.js';
import { createBrowserNavigation, type Navigation } from './navigation.js';
import { createServerClient, type ServerClient, type ServerClientOptions } from './server-client.js';
import { createMemorySession, type SessionClient } from './session.js';
import { createWebSocketClient, type WsClient } from './websocket-client.js';

export type { BridgeRequest, BridgeResponse, NativeBridge } from './bridge-client/index.js';
export type { RuntimeEnvironment, RuntimeTarget } from './env.js';
export type { AppLifecycle, AppLifecycleHooks } from './lifecycle.js';
export type { LocationState, Navigation, RouteTarget } from './navigation.js';
export type { ServerAction, ServerClient, ServerClientOptions } from './server-client.js';
export type { SessionClient } from './session.js';
export type { WsClient } from './websocket-client.js';

export {
    createBrowserBridge,
    createBrowserNavigation,
    createLifecycle,
    createMemorySession,
    createNativeIpcBridge,
    createServerClient,
    createWebSocketClient,
    detectEnvironment,
};

export type NativeCapabilities = {
    bridge: NativeBridge;
};

/** 框架无关客户端运行时实例。 */
export type WaeClient = {
    env: RuntimeEnvironment;
    server: ServerClient;
    native: NativeCapabilities;
    session: SessionClient;
    lifecycle: AppLifecycle;
    navigation: Navigation;
    connectWs(url: string): WsClient;
};

/** @deprecated 使用 WaeClient */
export type WaeRuntime = WaeClient;

export type CreateClientOptions = {
    env?: Partial<RuntimeEnvironment>;
    server: ServerClientOptions;
    session?: SessionClient;
    lifecycle?: AppLifecycleHooks;
    navigation?: Navigation;
    bridge?: NativeBridge;
};

/** @deprecated 使用 CreateClientOptions */
export type CreateRuntimeOptions = CreateClientOptions;

export function createClient(options: CreateClientOptions): WaeClient {
    const env = detectEnvironment(options.env);
    const bridge =
        options.bridge ??
        (env.hasNativeBridge
            ? createNativeIpcBridge({
                  postMessage() {},
                  onMessage() {},
              })
            : createBrowserBridge());

    return {
        env,
        server: createServerClient(options.server),
        native: { bridge },
        session: options.session ?? createMemorySession(),
        lifecycle: createLifecycle(options.lifecycle),
        navigation: options.navigation ?? createBrowserNavigation(),
        connectWs: createWebSocketClient,
    };
}

/** @deprecated 使用 createClient */
export const createRuntime = createClient;
