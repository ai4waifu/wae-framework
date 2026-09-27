//! N-API: product updater for **`wae build` apps** (native addon in `lib/`).

use std::path::PathBuf;

use napi::bindgen_prelude::*;
use napi_derive::napi;
use semver::Version;
use wae_updater::{DownloadPolicy, GitHubReleaseSource, ReleaseChannel, UpdatePackage, Updater, UpdaterConfig};

#[napi(object)]
pub struct ProductUpdateOptions {
    /// GitHub `owner/repo` for **your shipped app**, not the WAE framework repo.
    pub repo: String,
    /// Product slug in release asset names (`{product_name}-{triple}.zip`).
    pub product_name: String,
    /// Installed native addon path (e.g. `lib/win32-x64-msvc.node`).
    pub native_path: String,
    pub current_version: String,
    /// `stable` | `beta` | explicit tag (nightly, hotfix).
    pub channel: Option<String>,
    /// `checkOnly` | `downloadIfAvailable` | `downloadAndApply`.
    pub download_policy: Option<String>,
    /// Legacy pin — maps to `Pinned(tag)` when `channel` is unset.
    pub tag: Option<String>,
    /// Legacy prerelease flag — maps to `beta` when `channel` is unset.
    pub allow_prerelease: Option<bool>,
    /// Staged native path from a prior `downloadProductUpdate` call.
    pub staged_native_path: Option<String>,
}

#[napi(object)]
pub struct ProductUpdateStatus {
    pub up_to_date: bool,
    pub current: String,
    pub latest: Option<String>,
    pub tag: Option<String>,
    pub release_url: Option<String>,
    pub asset_name: Option<String>,
    pub channel: Option<String>,
    pub download_policy: Option<String>,
    pub staged_native_path: Option<String>,
}

fn build_updater(options: &ProductUpdateOptions) -> std::result::Result<Updater, String> {
    let source = GitHubReleaseSource::from_slug(&options.repo).map_err(|e| e.to_string())?;
    let current_version = Version::parse(&options.current_version).map_err(|e| e.to_string())?;
    let channel = if let Some(raw) = options.channel.as_deref().filter(|s| !s.is_empty()) {
        ReleaseChannel::parse(raw).map_err(|e| e.to_string())?
    } else {
        ReleaseChannel::from_legacy(options.allow_prerelease.unwrap_or(false), options.tag.as_deref())
    };
    let download_policy = if let Some(raw) = options.download_policy.as_deref().filter(|s| !s.is_empty()) {
        DownloadPolicy::parse(raw).map_err(|e| e.to_string())?
    } else {
        DownloadPolicy::CheckOnly
    };

    Ok(Updater::new(UpdaterConfig {
        source,
        current_version,
        product_name: options.product_name.clone(),
        native_path: PathBuf::from(&options.native_path),
        channel,
        download_policy,
        target_triple: None,
        token: None,
    }))
}

fn status_from_check(
    options: &ProductUpdateOptions,
    updater: &Updater,
    up_to_date: bool,
    package: Option<&UpdatePackage>,
) -> ProductUpdateStatus {
    let config = updater.config();
    ProductUpdateStatus {
        up_to_date,
        current: options.current_version.clone(),
        latest: package.map(|p| p.latest.to_string()),
        tag: package.map(|p| p.tag.clone()),
        release_url: package.map(|p| p.release_url.clone()),
        asset_name: package.map(|p| p.asset.name.clone()),
        channel: Some(config.channel.label().to_string()),
        download_policy: Some(config.download_policy.label().to_string()),
        staged_native_path: options.staged_native_path.clone(),
    }
}

#[napi]
pub fn check_product_update(options: ProductUpdateOptions) -> Result<ProductUpdateStatus> {
    let updater = build_updater(&options).map_err(Error::from_reason)?;
    let check = updater.check_version().map_err(|e| Error::from_reason(e.to_string()))?;
    Ok(status_from_check(&options, &updater, check.availability.is_none(), check.availability.as_ref()))
}

#[napi]
pub fn download_product_update(options: ProductUpdateOptions) -> Result<ProductUpdateStatus> {
    let updater = build_updater(&options).map_err(Error::from_reason)?;
    let check = updater.check_version().map_err(|e| Error::from_reason(e.to_string()))?;
    let package = check.availability.ok_or_else(|| Error::from_reason("already up to date"))?;
    let downloaded = updater.download(&package).map_err(|e| Error::from_reason(e.to_string()))?;
    let mut status = status_from_check(&options, &updater, false, Some(&package));
    status.staged_native_path = Some(downloaded.staged_native_path.display().to_string());
    Ok(status)
}

#[napi]
pub fn apply_product_update(options: ProductUpdateOptions) -> Result<ProductUpdateStatus> {
    if options.native_path.is_empty() {
        return Err(Error::from_reason("native_path is required to apply a product update"));
    }
    let updater = build_updater(&options).map_err(Error::from_reason)?;
    if let Some(staged) = options.staged_native_path.as_deref().filter(|s| !s.is_empty()) {
        let check = updater.check_version().map_err(|e| Error::from_reason(e.to_string()))?;
        let package = check.availability.ok_or_else(|| Error::from_reason("already up to date"))?;
        let applied =
            updater.apply_staged(PathBuf::from(staged).as_path(), &package).map_err(|e| Error::from_reason(e.to_string()))?;
        return Ok(ProductUpdateStatus {
            up_to_date: true,
            current: applied.installed.to_string(),
            latest: Some(applied.installed.to_string()),
            tag: Some(applied.tag),
            release_url: Some(applied.release_url),
            asset_name: Some(applied.asset_name),
            channel: Some(updater.config().channel.label().to_string()),
            download_policy: Some(updater.config().download_policy.label().to_string()),
            staged_native_path: None,
        });
    }

    let check = updater.check_version().map_err(|e| Error::from_reason(e.to_string()))?;
    let package = check.availability.ok_or_else(|| Error::from_reason("already up to date"))?;
    let downloaded = updater.download(&package).map_err(|e| Error::from_reason(e.to_string()))?;
    let applied = updater.apply(&downloaded).map_err(|e| Error::from_reason(e.to_string()))?;
    Ok(ProductUpdateStatus {
        up_to_date: true,
        current: applied.installed.to_string(),
        latest: Some(applied.installed.to_string()),
        tag: Some(applied.tag),
        release_url: Some(applied.release_url),
        asset_name: Some(applied.asset_name),
        channel: Some(updater.config().channel.label().to_string()),
        download_policy: Some(updater.config().download_policy.label().to_string()),
        staged_native_path: None,
    })
}
