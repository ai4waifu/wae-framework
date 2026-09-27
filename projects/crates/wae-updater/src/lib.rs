//! Product updater for **`wae build` shipped apps**.
//!
//! Orchestrates version detection, release channel resolution, silent or explicit download,
//! and native addon replacement. WAE (`@wae/wae`) itself is upgraded via npm — this crate
//! targets end-user product bundles.

mod apply;
mod archive;
mod channel;
mod download;
mod error;
mod github;
mod target;

pub use channel::{DownloadPolicy, ReleaseChannel};
pub use download::DownloadedUpdate;
pub use error::{Result, UpdateError};
pub use github::{GitHubRelease, GitHubReleaseAsset, GitHubReleaseSource, pick_product_asset};
pub use target::{host_os_arch, host_triple};

use std::path::PathBuf;

use semver::Version;

use crate::apply::replace_native_artifact;
use crate::download::download_package;
use crate::github::GitHubClient;

/// Configuration for product update flows.
#[derive(Debug, Clone)]
pub struct UpdaterConfig {
    /// GitHub Releases source — typically **your app's** `owner/repo`.
    pub source: GitHubReleaseSource,
    pub current_version: Version,
    /// Product slug used in release asset names (`{product_name}-{triple}.zip`).
    pub product_name: String,
    /// Installed native addon path (e.g. `lib/win32-x64-msvc.node`).
    pub native_path: PathBuf,
    pub channel: ReleaseChannel,
    pub download_policy: DownloadPolicy,
    /// Defaults to [`host_triple`].
    pub target_triple: Option<String>,
    pub token: Option<String>,
}

/// Result of a version/channel check.
#[derive(Debug, Clone)]
pub struct UpdateCheck {
    pub current: Version,
    pub channel: ReleaseChannel,
    pub availability: Option<UpdatePackage>,
}

/// Describes a newer release resolved for the configured channel.
#[derive(Debug, Clone)]
pub struct UpdatePackage {
    pub current: Version,
    pub latest: Version,
    pub tag: String,
    pub release_url: String,
    pub asset: GitHubReleaseAsset,
    pub channel: ReleaseChannel,
}

/// Result after replacing the installed native artifact.
#[derive(Debug, Clone)]
pub struct AppliedUpdate {
    pub previous: Version,
    pub installed: Version,
    pub tag: String,
    pub release_url: String,
    pub asset_name: String,
}

/// Outcome of [`Updater::run`] for the configured [`DownloadPolicy`].
#[derive(Debug, Clone)]
pub enum UpdateRunResult {
    UpToDate { current: Version, channel: ReleaseChannel },
    Checked(UpdateCheck),
    Downloaded(DownloadedUpdate),
    Applied(AppliedUpdate),
}

pub struct Updater {
    config: UpdaterConfig,
}

impl Updater {
    pub fn new(config: UpdaterConfig) -> Self {
        Self { config }
    }

    pub fn config(&self) -> &UpdaterConfig {
        &self.config
    }

    fn client(&self) -> GitHubClient {
        let token = self
            .config
            .token
            .clone()
            .or_else(|| std::env::var("WAE_GITHUB_TOKEN").ok())
            .or_else(|| std::env::var("GITHUB_TOKEN").ok());
        GitHubClient::new(self.config.source.clone(), token)
    }

    fn triple(&self) -> String {
        self.config.target_triple.clone().unwrap_or_else(|| host_triple().to_string())
    }

    fn resolve_release(&self, client: &GitHubClient) -> Result<github::GitHubRelease> {
        let release =
            if let Some(tag) = self.config.channel.pinned_tag() { client.fetch_tag(tag)? } else { client.fetch_latest()? };
        if release.draft {
            return Err(UpdateError::Other(format!("Release {} is a draft", release.tag_name)));
        }
        if release.prerelease && !self.config.channel.allows_prerelease() && self.config.channel.pinned_tag().is_none() {
            return Err(UpdateError::Other(format!(
                "Latest release {} is prerelease on channel `{}`; switch to beta or pin a tag",
                release.tag_name,
                self.config.channel.label()
            )));
        }
        Ok(release)
    }

    /// Version detection + channel resolution. Returns `availability = None` when up to date.
    pub fn check_version(&self) -> Result<UpdateCheck> {
        let client = self.client();
        let release = self.resolve_release(&client)?;
        let latest = normalize_release_tag(&release.tag_name)?;
        if self.config.current_version >= latest {
            return Ok(UpdateCheck {
                current: self.config.current_version.clone(),
                channel: self.config.channel.clone(),
                availability: None,
            });
        }
        let triple = self.triple();
        let os_arch = host_os_arch();
        let asset =
            pick_product_asset(&self.config.product_name, &triple, &os_arch, &release.assets).cloned().ok_or_else(|| {
                UpdateError::MissingAsset { tag: release.tag_name.clone(), product: self.config.product_name.clone(), triple }
            })?;
        Ok(UpdateCheck {
            current: self.config.current_version.clone(),
            channel: self.config.channel.clone(),
            availability: Some(UpdatePackage {
                current: self.config.current_version.clone(),
                latest,
                tag: release.tag_name,
                release_url: release.html_url,
                asset,
                channel: self.config.channel.clone(),
            }),
        })
    }

    /// Explicit download step — fetches and extracts the release asset.
    pub fn download(&self, package: &UpdatePackage) -> Result<DownloadedUpdate> {
        let client = self.client();
        let work = tempfile_dir("download")?;
        download_package(&client, package, &work)
    }

    /// Apply a previously downloaded staged native addon.
    pub fn apply(&self, downloaded: &DownloadedUpdate) -> Result<AppliedUpdate> {
        replace_native_artifact(&downloaded.staged_native_path, &self.config.native_path)?;
        Ok(AppliedUpdate {
            previous: downloaded.package.current.clone(),
            installed: downloaded.package.latest.clone(),
            tag: downloaded.package.tag.clone(),
            release_url: downloaded.package.release_url.clone(),
            asset_name: downloaded.package.asset.name.clone(),
        })
    }

    /// Apply directly from a staged path (explicit two-step UI flow).
    pub fn apply_staged(&self, staged_native_path: &std::path::Path, package: &UpdatePackage) -> Result<AppliedUpdate> {
        replace_native_artifact(staged_native_path, &self.config.native_path)?;
        Ok(AppliedUpdate {
            previous: package.current.clone(),
            installed: package.latest.clone(),
            tag: package.tag.clone(),
            release_url: package.release_url.clone(),
            asset_name: package.asset.name.clone(),
        })
    }

    /// Full pipeline driven by [`UpdaterConfig::download_policy`].
    pub fn run(&self) -> Result<UpdateRunResult> {
        let check = self.check_version()?;
        if check.availability.is_none() {
            return Ok(UpdateRunResult::UpToDate { current: check.current, channel: check.channel });
        }
        let package = check.availability.clone().expect("checked above");
        match self.config.download_policy {
            DownloadPolicy::CheckOnly => Ok(UpdateRunResult::Checked(check)),
            DownloadPolicy::DownloadIfAvailable => {
                let downloaded = self.download(&package)?;
                Ok(UpdateRunResult::Downloaded(downloaded))
            }
            DownloadPolicy::DownloadAndApply => {
                let downloaded = self.download(&package)?;
                let applied = self.apply(&downloaded)?;
                Ok(UpdateRunResult::Applied(applied))
            }
        }
    }
}

/// Parse a GitHub release tag into a [`Version`] (strips a leading `v`).
pub fn normalize_release_tag(tag: &str) -> Result<Version> {
    let trimmed = tag.trim().trim_start_matches(['v', 'V']);
    Ok(Version::parse(trimmed)?)
}

fn tempfile_dir(label: &str) -> Result<PathBuf> {
    let dir = std::env::temp_dir().join(format!("wae-updater-{}-{}", label, std::process::id()));
    std::fs::create_dir_all(&dir).map_err(|e| UpdateError::io(&dir, e))?;
    Ok(dir)
}
