//! Product builder for **`wae build` shipped apps**.
//!
//! Compiles `wae-napi`, stages application icons, verifies the product tree, and packages
//! release archives for distribution or [`wae-updater`] consumption.

mod compile;
mod error;
mod icon;
mod icon_pipeline;
mod manifest;
mod package;
mod platform;

pub use compile::{CompileOptions, CompileOutput, compile_native};
pub use error::{BuildError, Result};
pub use icon::{IconManifest, IconSources, IconStageResult, load_icon_sources, stage_icons};
pub use manifest::{ProductManifest, WAE_PRODUCT_MANIFEST, load_product_manifest, resolve_frontend_dir, resolve_native_path};
pub use package::{PackageMode, PackageOptions, PackageOutput, default_native_archive_name, package_product};
pub use platform::{PlatformSpec, host_platform, platform_by_id, platform_by_triple};

use std::path::PathBuf;

/// End-to-end builder configuration.
#[derive(Debug, Clone)]
pub struct BuilderConfig {
    /// WAE monorepo root (contains workspace `Cargo.toml`).
    pub workspace_root: PathBuf,
    /// Built product tree (`dist/<platform>/`).
    pub product_root: PathBuf,
    /// App project root (for resolving `wae-builder.json` icon paths).
    pub project_root: PathBuf,
    pub platform_id: String,
    pub compile_native: bool,
    pub release: bool,
    pub stage_icons: bool,
    pub icon_sources: Option<IconSources>,
    pub package: Option<PackagePlan>,
}

/// Optional packaging step.
#[derive(Debug, Clone)]
pub struct PackagePlan {
    pub mode: PackageMode,
    pub archive_path: PathBuf,
}

/// Builder pipeline output summary.
#[derive(Debug, Clone, Default)]
pub struct BuilderReport {
    pub compiled: Option<CompileOutput>,
    pub icons: Option<IconStageResult>,
    pub package: Option<PackageOutput>,
}

pub struct Builder {
    config: BuilderConfig,
}

impl Builder {
    pub fn new(config: BuilderConfig) -> Self {
        Self { config }
    }

    pub fn config(&self) -> &BuilderConfig {
        &self.config
    }

    /// Verify `wae-product.json`, frontend, and native addon exist.
    pub fn verify_product_tree(&self) -> Result<ProductManifest> {
        let manifest = load_product_manifest(&self.config.product_root)?;
        let frontend = resolve_frontend_dir(&self.config.product_root, &manifest);
        if !frontend.is_dir() {
            return Err(BuildError::MissingPath(frontend));
        }
        if manifest.native_path.is_some() {
            let native = resolve_native_path(&self.config.product_root, &manifest)?;
            if !native.is_file() {
                return Err(BuildError::MissingPath(native));
            }
        }
        Ok(manifest)
    }

    /// Run compile → icons → package according to [`BuilderConfig`].
    pub fn run(&self) -> Result<BuilderReport> {
        let mut report = BuilderReport::default();
        let platform = platform_by_id(&self.config.platform_id)?;
        let manifest = self.verify_product_tree()?;

        if self.config.compile_native {
            let dest = resolve_native_path(&self.config.product_root, &manifest)?;
            let output = compile_native(&CompileOptions {
                workspace_root: self.config.workspace_root.clone(),
                platform: *platform,
                release: self.config.release,
                dest_lib: Some(dest),
            })?;
            report.compiled = Some(output);
        }

        if self.config.stage_icons {
            let sources = self
                .config
                .icon_sources
                .clone()
                .or_else(|| load_icon_sources(&self.config.project_root).ok().flatten())
                .ok_or_else(|| BuildError::Icon("no icon sources in config or wae-builder.json".into()))?;
            report.icons = Some(stage_icons(&self.config.project_root, &self.config.product_root, &sources)?);
        }

        if let Some(plan) = &self.config.package {
            report.package = Some(package_product(&PackageOptions {
                product_root: self.config.product_root.clone(),
                mode: plan.mode,
                archive_path: plan.archive_path.clone(),
            })?);
        }

        Ok(report)
    }
}
