//! WebView / WASM / native 宿主桥接。
//!
//! 配合 `@wae/client` 与 `@wae/wae-*`：消息传输、能力分发、WASM 侧支撑。

use wae_types::{ClientMessage, HostMessage};

/// 消息传输抽象。
pub trait MessageTransport {
    fn send_json(&self, payload: &str) -> wae_types::Result<()>;
}

/// 宿主侧运行时（协议状态机占位）。
#[derive(Default)]
pub struct WebViewRuntime;

impl WebViewRuntime {
    pub fn new() -> Self {
        Self
    }

    pub fn handle(&mut self, message: ClientMessage) -> Option<HostMessage> {
        let _ = message;
        None
    }
}

/// 生命周期钩子占位。
#[derive(Default)]
pub struct WebViewBridge;
