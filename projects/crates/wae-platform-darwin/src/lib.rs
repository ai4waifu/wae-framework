//! macOS desktop binding entry (WKWebView + AppKit planned).

use wae_platform::{DesktopIpcHandler, DesktopOpenOptions, PlatformError, Result};

/// Run a desktop shell on macOS. Skeleton until WKWebView is wired.
pub fn run_desktop(_options: DesktopOpenOptions, _handler: Box<dyn DesktopIpcHandler>) -> Result<()> {
    let _ = _handler;
    Err(PlatformError::Unsupported("wae-platform-darwin: WKWebView + AppKit binding not yet implemented"))
}
