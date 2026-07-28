# Swap3D CLI Release Guide

## Release Model

One semantic version identifies all distribution channels:

- npm package `@swap3d/cli`
- GitHub Release tag and standalone archives
- shell and PowerShell installers
- Homebrew cask

The release workflow is `.github/workflows/publish.yml`. npm Trusted Publishing
must continue to authorize that exact filename.

## Release Gates

- [x] package name and repository are aligned
- [x] package has no runtime dependencies
- [x] Node.js 18/20/22/24 tests pass
- [x] standalone binaries build for all supported targets
- [x] archives contain Apache-2.0 license and notice files
- [x] shell installer completes a checksum-verified local install
- [x] generated Homebrew cask passes `brew style` and `brew audit`
- [x] `swap3d/homebrew-tap` exists with automatic synchronization
- [ ] npm Trusted Publisher succeeds without a traditional token
- [ ] `swap3d/swap3d-cli` is public
- [ ] the production `v0.2.0` cross-platform release workflow passes
- [ ] npm and Homebrew installation smoke tests pass against `v0.2.0`

## Prepare A Release

1. Update the version in:

   - `package.json`
   - `package-lock.json`
   - `src/cli.mjs`

2. Move changelog entries into a dated version section.
3. Verify locally:

```bash
npm test
npm pack --dry-run
npx bun@1.3.14 scripts/build-standalone.mjs --all
npm run package:standalone
npm run generate:homebrew
node scripts/verify-release-version.mjs v0.2.0
```

4. Push `main` and wait for the Test workflow.
5. Create and push an annotated `vX.Y.Z` tag.

The tag runs tests, builds and packages every target, verifies native x64/arm64
executables on GitHub-hosted runners, creates the GitHub Release, and publishes
the npm package through OIDC.

## Homebrew

Each GitHub Release includes `swap3d.rb`, generated from the SHA-256 values of
the macOS archives. The public `swap3d/homebrew-tap` workflow checks every six
hours, validates a changed cask with Homebrew, and commits it automatically.
No cross-repository write token is required.

## Installer URLs

Canonical release assets:

```text
https://github.com/swap3d/swap3d-cli/releases/latest/download/install.sh
https://github.com/swap3d/swap3d-cli/releases/latest/download/install.ps1
```

The branded `swap3d.studio` URLs should redirect to these assets only after the
first standalone release is healthy.

## Rollback

Published npm versions and immutable release assets are not overwritten.

For a broken release:

1. deprecate the npm version with a message pointing to the last healthy or
   fixed version
2. publish a patch release from a new tag
3. verify the Homebrew tap advances to the patch
4. keep the broken release available for auditability unless it exposes a
   security-sensitive artifact

Users can pin the shell installer with `--version X.Y.Z`, set
`SWAP3D_VERSION=X.Y.Z` for PowerShell, or install a specific npm version.

## Provenance

npm automatically generates provenance when a public package is published from
a public GitHub repository through Trusted Publishing. Private repositories can
use Trusted Publishing, but npm does not generate provenance for those
releases.
