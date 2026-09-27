//! WAE self-hosted desktop entry (platform bindings selected by target OS).

mod ipc;

pub use ipc::{HostIpcRouter, parse_window_ipc};
pub use wae_platform::DesktopIpcOutcome;

use wae_platform::{DesktopIpcHandler, DesktopOpenOptions, Result};

struct HostSession {
    router: HostIpcRouter,
}

impl DesktopIpcHandler for HostSession {
    fn on_ipc(&mut self, message: &str) -> wae_platform::DesktopIpcOutcome {
        self.router.handle(message)
    }
}

/// Run a desktop shell loading `options.url` in the system WebView.
pub fn run_desktop(options: DesktopOpenOptions) -> Result<()> {
    let session = HostSession { router: HostIpcRouter::new() };

    #[cfg(windows)]
    {
        wae_platform_win32::run_desktop(options, Box::new(session))
    }

    #[cfg(target_os = "macos")]
    {
        wae_platform_darwin::run_desktop(options, Box::new(session))
    }

    #[cfg(target_os = "linux")]
    {
        wae_platform_linux::run_desktop(options, Box::new(session))
    }

    #[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
    {
        let _ = session;
        Err(wae_platform::PlatformError::Unsupported("desktop host is not available on this OS"))
    }
}
