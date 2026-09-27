//! Windows desktop binding entry.

#[cfg(windows)]
mod imp;

#[cfg(windows)]
pub use imp::run_desktop;

#[cfg(not(windows))]
pub fn run_desktop(
    _options: wae_platform::DesktopOpenOptions,
    _handler: &mut dyn wae_platform::DesktopIpcHandler,
) -> wae_platform::Result<()> {
    Err(wae_platform::PlatformError::Unsupported("wae-platform-win32 is only available on Windows targets"))
}
