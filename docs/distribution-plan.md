# Cross-Platform Distribution Plan

## Goal

Distribute Swap3D CLI through npm, standalone installers, GitHub Releases, and
Homebrew while keeping one tested command implementation and one release
version.

## Distribution Targets

- npm: `npm install -g @swap3d/cli`
- npm without installation: `npx @swap3d/cli`
- macOS/Linux: `curl -fsSL https://swap3d.studio/install.sh | sh`
- Windows:
  `powershell -NoProfile -ExecutionPolicy Bypass -c "irm https://swap3d.studio/install.ps1 | iex"`
- Homebrew: `brew install swap3d/tap/swap3d`
- direct downloads from GitHub Releases

## Release Architecture

The npm package remains the source distribution and requires Node.js 18 or
newer. Standalone binaries bundle the same entrypoint with Bun so users do not
need Node.js.

GitHub Releases is the source of truth for standalone artifacts. Every release
must include:

- macOS x64 and arm64 archives
- Linux x64, x64 baseline, and arm64 archives
- Windows x64 and arm64 archives
- `SHA256SUMS`
- npm publication through Trusted Publishing

Install scripts select the operating system and architecture, download from the
latest or requested GitHub release, verify SHA-256, install into a user-owned
directory, and explain any required `PATH` change.

## Implementation Checklist

### Phase 1: Standalone Build

- [x] make the CLI entrypoint work in Node.js and compiled Bun executables
- [x] add reproducible Bun build commands
- [x] build all supported operating-system and architecture targets
- [ ] smoke-test native binaries on GitHub-hosted runners
- [x] confirm standalone binaries never contain credentials or local config

### Phase 2: GitHub Release

- [x] add a release workflow triggered by a version tag
- [x] verify the tag matches `package.json` and the CLI version
- [x] run the Node.js test suite before release
- [x] package standalone binaries with `LICENSE`, `NOTICE`, and README
- [x] generate `SHA256SUMS`
- [ ] publish `SHA256SUMS` in the production GitHub Release
- [ ] publish the matching npm version through Trusted Publishing
- [ ] upload immutable GitHub Release assets

### Phase 3: Shell Installer

- [x] detect macOS/Linux operating system and CPU architecture
- [x] support the latest release and an explicit version override
- [x] download the matching archive and checksum manifest
- [x] verify SHA-256 before extraction
- [x] install without `sudo` by default
- [x] handle `PATH` guidance and conflicting installations
- [ ] test on macOS and Linux runners

### Phase 4: PowerShell Installer

- [x] detect Windows x64/arm64
- [x] support the latest release and an explicit version override
- [x] download and verify the matching ZIP archive
- [x] install under the current user's local application directory
- [x] update the user `PATH` without changing machine policy
- [ ] test on a Windows runner

### Phase 5: Homebrew

- [x] create `swap3d/homebrew-tap`
- [x] generate a cask backed by GitHub Release artifacts
- [x] support Apple Silicon and Intel macOS
- [x] validate the generated cask with `brew style` and `brew audit`
- [ ] synchronize and install the cask from the production `v0.2.0` release
- [x] document install, upgrade, and uninstall commands

### Phase 6: Documentation And Operations

- [x] document all supported installation methods in the README
- [x] document release, rollback, and checksum verification
- [x] keep npm, GitHub Release, installers, and Homebrew on one version
- [x] add release smoke tests for `--version` and `formats --offline`
- [ ] publish stable installer URLs through the Swap3D frontend

## Security Requirements

- release workflows use least-privilege GitHub permissions
- npm publishing uses Trusted Publishing instead of a long-lived token
- release artifacts are built only from version tags
- installers fail closed when checksums are missing or invalid
- installers do not request administrator privileges by default
- scripts never read or transmit Swap3D API keys
- GitHub Actions and third-party actions are pinned to reviewed major versions

## Completion Criteria

The plan is complete when a clean macOS, Linux, or Windows machine can install
the CLI without Node.js, run `swap3d --version` and
`swap3d formats --offline`, upgrade through the same channel, and verify that
the downloaded artifact matches the published SHA-256 manifest.
