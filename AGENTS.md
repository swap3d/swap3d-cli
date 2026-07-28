# AGENTS.md

This repository contains the public Swap3D CLI npm package.

## Product Scope

The CLI is a developer-facing client for the Swap3D async developer API. It should stay aligned with the real backend API exposed by `swap3d/swap3d-studio`.

Current MVP scope:

- API key based authentication
- async conversion upload
- job status polling
- result download
- supported format listing

Out of scope for the first version:

- OAuth device flow
- dashboard/user-session endpoints
- local browser conversion
- payment or subscription management

## API Facts

Default API base URL:

- `https://api.swap3d.studio/api/v1`

Current API key endpoints:

- `POST /openapi/convert`
- `GET /openapi/convert/status/:jobId`
- `GET /openapi/usage`

Current public metadata endpoint:

- `GET /openapi/formats`

The current backend upload limit is `100 MB`.

Current supported target formats:

- `glb`
- `gltf`
- `glb2`
- `gltf2`

Current supported source extensions:

- `obj`
- `glb`
- `gltf`
- `fbx`
- `dae`
- `stl`
- `ply`
- `3ds`
- `blend`
- `step`
- `stp`
- `iges`
- `igs`
- `brep`

Do not add CLI commands that imply backend support which does not exist yet. Keep command behavior aligned with the production routes in `swap3d/swap3d-studio`.

## License

The repository is licensed under Apache-2.0. Keep `package.json`, `LICENSE`,
`NOTICE`, the README, and release notes aligned when licensing metadata changes.

## Security Rules

- Never print API keys.
- Prefer `SWAP3D_API_KEY` for CI.
- Store local API keys in the user config file with `0600` permissions when possible.
- Default to dry or read-only behavior for future destructive commands.
- Do not log full signed download URLs unless explicitly needed for debugging.

## Development

```bash
npm test
node src/cli.mjs formats
node src/cli.mjs auth status
npx bun@1.3.14 scripts/build-standalone.mjs
```

The CLI intentionally has no runtime dependencies at MVP stage and requires Node.js 18+.

## Distribution

The npm package and standalone binaries use the same `src/cli.mjs` entrypoint.
Standalone builds use Bun 1.3.14 with `.env` autoloading disabled.

Supported standalone targets:

- macOS x64 and arm64
- Linux glibc x64 and arm64
- Linux musl x64 and arm64
- Windows x64 and arm64

Release rules:

- `package.json`, `package-lock.json`, `src/cli.mjs`, and `CHANGELOG.md` must
  declare the same release version
- only a `vX.Y.Z` tag may trigger `.github/workflows/publish.yml`
- release archives must include `LICENSE`, `NOTICE`, and `README.md`
- installers must verify the matching entry in `SHA256SUMS`
- npm publishing must use the `publish.yml` Trusted Publisher
- GitHub release immutability must stay enabled for the repository
- the generated `swap3d.rb` release asset is synchronized by
  `swap3d/homebrew-tap`; do not hand-edit formula checksums

Relevant commands:

```bash
npx bun@1.3.14 scripts/build-standalone.mjs --all
npm run package:standalone
npm run generate:homebrew
node scripts/verify-release-version.mjs v0.2.2
```
