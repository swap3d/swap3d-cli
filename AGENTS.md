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

Do not add CLI commands that imply backend support which does not exist yet. In particular, usage lookup is currently a dashboard JWT endpoint in `swap3d-studio`, not an API-key endpoint.

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
```

The CLI intentionally has no runtime dependencies at MVP stage and requires Node.js 18+.
