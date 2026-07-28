# Swap3D CLI Release Plan

## Goal

Publish `@swap3d/cli` as the official command-line client for the Swap3D developer API.

## Current Scope

- API-key authentication
- async conversion upload
- job status polling
- result download
- supported format listing

## Release Gates

- [x] package name and GitHub repository are aligned: `@swap3d/cli` / `swap3d/swap3d-cli`
- [x] package has no runtime dependencies
- [x] package requires Node.js 18+
- [x] package contents are constrained by `files`
- [x] GitHub Actions test workflow passes on `main`
- [ ] npm trusted publisher is configured for `swap3d/swap3d-cli`
- [ ] first npm publish succeeds with public access
- [ ] package install smoke passes through npm:

```bash
npm install -g @swap3d/cli
swap3d formats
```

## npm Publishing

The package is scoped, so first publish must be public:

```bash
npm publish --access public
```

Preferred publishing path:

1. Create or verify npm organization `swap3d`.
2. Ensure the npm account has publish access to `@swap3d`.
3. Configure npm Trusted Publisher:
   - Package: `@swap3d/cli`
   - Publisher: GitHub Actions
   - Repository: `swap3d/swap3d-cli`
   - Workflow: `publish.yml`
4. Publish by creating a GitHub release or manually running the publish workflow.

The publish workflow uses Node.js 24 and upgrades to the latest npm CLI before publishing so the GitHub Actions environment satisfies npm trusted publishing requirements.

## Provenance

The repository is currently private. npm documents that provenance is not generated from private GitHub repositories, even with trusted publishing.

When the CLI repository becomes public, update the publish workflow to use:

```bash
npm publish --provenance --access public
```

## Next Feature Gates

- [x] backend exposes API-key authenticated `GET /openapi/usage`
- [x] backend exposes machine-readable `GET /openapi/formats`
- [x] CLI supports `swap3d usage`
- [x] CLI `formats` can read live API capability metadata and fall back to built-in metadata
- [x] CLI commands support `--json` for automation
- [ ] production smoke can run against a dedicated test API key
