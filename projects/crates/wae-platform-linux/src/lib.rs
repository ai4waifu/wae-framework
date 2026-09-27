//! Linux desktop binding entry (WebKitGTK planned).

use wae_platform::{DesktopIpcHandler, DesktopOpenOptions, PlatformError, Result};

/// Run a desktop shell on Linux. Skeleton until WebKitGTK is wired.
pub fn run_desktop(_options: DesktopOpenOptions, _handler: Box<dyn DesktopIpcHandler>) -> Result<()> {
    let _ = _handler;
    Err(PlatformError::Unsupported("wae-platform-linux: WebKitGTK binding not yet implemented"))
}
