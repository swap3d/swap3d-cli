# Changelog

All notable changes to this package will be documented in this file.

This project follows semantic versioning once the package is published to npm.

## 0.2.1 - 2026-07-28

- Replaced the Homebrew cask with a formula so standalone binaries install
  without the macOS application quarantine path.

## 0.2.0 - 2026-07-28

- Changed the project license from MIT to Apache-2.0 for future releases.
- Updated repository and API capability metadata.
- Added standalone binaries for macOS, Linux, and Windows.
- Added checksum-verified shell and PowerShell installers.
- Added automated GitHub Release and npm Trusted Publishing workflows.
- Added Homebrew cask generation for the official tap.

## 0.1.1 - 2026-07-28

- Fixed npm bin execution when `swap3d` is installed as a package symlink.

## 0.1.0 - 2026-07-28

- Initial CLI package.
- Added API-key authentication commands.
- Added async conversion upload, polling, and download.
- Added job status and job download commands.
- Added supported format listing with live API metadata fallback.
- Added API-key usage lookup.
- Added JSON output for automation-oriented commands.
- Added Node.js test coverage and npm package dry-run validation.
