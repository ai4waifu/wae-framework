//! Platform-neutral desktop host options and IPC result types.

mod runtime;

pub use runtime::{PlatformDesktopFactory, PlatformRuntime, PlatformWebView, PlatformWindow};

use std::fmt;

#[derive(Debug, Clone)]
pub struct DesktopOpenOptions {
    pub url: String,
    pub title: String,
    pub undecorated: bool,
}

impl DesktopOpenOptions {
    pub fn new(url: impl Into<String>, title: impl Into<String>) -> Self {
        Self { url: url.into(), title: title.into(), undecorated: false }
    }

    pub fn undecorated(mut self, value: bool) -> Self {
        self.undecorated = value;
        self
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WindowCommand {
    Close,
    Minimize,
    Maximize,
    DragStart { screen_x: i32, screen_y: i32 },
    DragMove { screen_x: i32, screen_y: i32 },
    DragEnd,
}

#[derive(Debug, Clone)]
pub enum DesktopIpcOutcome {
    Window(WindowCommand),
    ReplyToPage(String),
    Ignored,
}

pub trait DesktopIpcHandler {
    fn on_ipc(&mut self, message: &str) -> DesktopIpcOutcome;
}

#[derive(Debug)]
pub enum PlatformError {
    Unsupported(&'static str),
    Message(String),
}

impl fmt::Display for PlatformError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Unsupported(msg) => write!(f, "{msg}"),
            Self::Message(msg) => f.write_str(msg),
        }
    }
}

impl std::error::Error for PlatformError {}

pub type Result<T> = std::result::Result<T, PlatformError>;
