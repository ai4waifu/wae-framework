//! Node-API surface for WAE host (desktop shell + protocol router).

#![deny(clippy::all)]

mod updater;

use napi::bindgen_prelude::*;
use napi_derive::napi;
use wae_host::{DesktopIpcOutcome, HostIpcRouter, run_desktop};
use wae_platform::DesktopOpenOptions;

pub use updater::{
    ProductUpdateOptions, ProductUpdateStatus, apply_product_update, check_product_update, download_product_update,
};

#[napi(object)]
pub struct OpenDesktopOptions {
    pub url: String,
    pub title: Option<String>,
    pub undecorated: Option<bool>,
}

#[napi]
pub fn host_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[napi]
pub fn handle_client_message(json: String) -> Option<String> {
    let mut router = HostIpcRouter::new();
    match router.handle(&json) {
        DesktopIpcOutcome::ReplyToPage(reply) => Some(reply),
        _ => None,
    }
}

#[napi]
pub fn open_desktop(options: OpenDesktopOptions) -> Result<()> {
    let title = options.title.unwrap_or_else(|| "WAE".to_string());
    let undecorated = options.undecorated.unwrap_or(false);
    let desktop = DesktopOpenOptions::new(options.url, title).undecorated(undecorated);
    run_desktop(desktop).map_err(|err| Error::from_reason(err.to_string()))
}
