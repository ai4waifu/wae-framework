//! 跨端共享协议类型（Rust 源 → codegen → TypeScript）
//!
//! 本 crate 为产品边界骨架。实现按协议与分层逐步补齐。

use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct NodeId(pub String);

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct RequestId(pub String);

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct RouteId(pub String);

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct SessionId(pub String);

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum ErrorCode {
    Unknown = 0,
    InvalidRequest = 1,
    Unauthorized = 2,
    NotFound = 3,
    Conflict = 4,
    Internal = 5,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WaeError {
    pub code: ErrorCode,
    pub message: String,
    pub details: Option<Value>,
}

impl WaeError {
    pub fn new(code: ErrorCode, message: impl Into<String>) -> Self {
        Self { code, message: message.into(), details: None }
    }
}

impl std::fmt::Display for WaeError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{:?}: {}", self.code, self.message)
    }
}

impl std::error::Error for WaeError {}

pub type Result<T> = std::result::Result<T, WaeError>;

// —— 协议消息（供 codegen / bridge）——

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "op", rename_all = "camelCase")]
pub enum DomPatch {
    CreateElement { id: String, tag: String, parent: Option<String> },
    RemoveNode { id: String },
    SetAttribute { id: String, name: String, value: Option<String> },
    SetProperty { id: String, name: String, value: serde_json::Value },
    SetText { id: String, text: String },
    InsertChild { parent: String, child: String, index: u32 },
    RemoveChild { parent: String, child: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum UiEvent {
    Pointer { target: String, name: String, payload: serde_json::Value },
    Keyboard { target: String, name: String, payload: serde_json::Value },
    Input { target: String, value: String },
    Submit { target: String, payload: serde_json::Value },
    Focus { target: String, focused: bool },
    Wheel { target: String, delta_x: f64, delta_y: f64 },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NativeRequest {
    pub id: String,
    pub capability: String,
    pub method: String,
    pub args: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NativeResponse {
    pub id: String,
    pub ok: bool,
    pub body: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RpcRequest {
    pub id: String,
    pub method: String,
    pub args: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RpcResponse {
    pub id: String,
    pub ok: bool,
    pub body: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ClientMessage {
    UiEvent(UiEvent),
    Native(NativeRequest),
    Rpc(RpcRequest),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum HostMessage {
    DomPatch(Vec<DomPatch>),
    Native(NativeResponse),
    Rpc(RpcResponse),
    Error(WaeError),
}
