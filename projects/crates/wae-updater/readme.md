# wae-updater

Rust library for **`wae build` products**: version detection, release channel resolution, silent or explicit download,
and native addon replacement.

| Layer                                    | Upgrade path                             |
|------------------------------------------|------------------------------------------|
| **WAE toolchain** (`@wae/wae`, dev deps) | npm / pnpm — **not** this crate          |
| **Shipped app** (your product)           | GitHub Releases → native addon in `lib/` |

## Flow

```text
check_version()     → UpdateCheck (channel + optional UpdatePackage)
download()          → DownloadedUpdate (explicit or silent background fetch)
apply()             → AppliedUpdate (replace lib/*.node)
run(policy)         → UpToDate | Checked | Downloaded | Applied
```

## Channels

| `ReleaseChannel` | Resolves                                 |
|------------------|------------------------------------------|
| `Stable`         | `/releases/latest`, rejects prerelease   |
| `Beta`           | `/releases/latest`, allows prerelease    |
| `Pinned(tag)`    | `/releases/tags/{tag}` (nightly, hotfix) |

Legacy `allow_prerelease` / `tag` map to `Beta` / `Pinned` via `ReleaseChannel::from_legacy`.

## Download policy

| `DownloadPolicy`      | Behavior                                               |
|-----------------------|--------------------------------------------------------|
| `CheckOnly`           | Version check only — **explicit** UI flow              |
| `DownloadIfAvailable` | Auto-download when newer — **silent** background fetch |
| `DownloadAndApply`    | Check + download + replace native artifact             |

## Usage

```rust
use semver::Version;
use wae_updater::{
    DownloadPolicy, GitHubReleaseSource, ReleaseChannel, Updater, UpdaterConfig,
};

let updater = Updater::new(UpdaterConfig {
    source: GitHubReleaseSource::new("your-org", "your-app"),
    current_version: Version::parse("1.0.0")?,
    product_name: "your-app".into(),
    native_path: app_dir.join("lib/win32-x64-msvc.node"),
    channel: ReleaseChannel::Stable,
    download_policy: DownloadPolicy::CheckOnly,
    target_triple: None,
    token: None,
});

if let Some(package) = updater.check_version()?.availability {
    let downloaded = updater.download(&package)?;
    updater.apply(&downloaded)?;
}
```

TypeScript (`@wae/wae`): `checkProductUpdateFromManifest` / `downloadProductUpdateFromManifest` /
`applyProductUpdateFromManifest`.
