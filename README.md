# Swap3D CLI

Command-line client for the Swap3D developer API.

## Install

### npm

```bash
npm install -g @swap3d/cli
swap3d --version
```

You can also run the package without a global installation:

```bash
npx @swap3d/cli formats
```

### macOS And Linux

The standalone installer does not require Node.js:

```bash
curl -fsSL https://github.com/swap3d/swap3d-cli/releases/latest/download/install.sh | sh
```

Install a specific version or directory:

```bash
curl -fsSL https://github.com/swap3d/swap3d-cli/releases/latest/download/install.sh |
  sh -s -- --version 0.2.1 --install-dir "$HOME/.local/bin"
```

### Windows

Run from Windows PowerShell without administrator privileges:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -c "irm https://github.com/swap3d/swap3d-cli/releases/latest/download/install.ps1 | iex"
```

The execution-policy override applies only to that PowerShell process. The
installer verifies the release checksum and adds its user-local installation
directory to the user `PATH`.

### Homebrew

```bash
brew install swap3d/tap/swap3d
```

## Quickstart

```bash
swap3d auth login --api-key sk_live_xxx
swap3d convert ./model.obj --to glb --out ./model.glb
swap3d usage
```

For CI, prefer an environment variable instead of saving a local config:

```bash
SWAP3D_API_KEY=sk_live_xxx npx @swap3d/cli convert ./model.obj --to glb
```

## Commands

```bash
swap3d auth login --api-key <key> [--api-url <url>]
swap3d auth status
swap3d auth logout

swap3d convert <file> --to glb [--out <file>]
swap3d convert <file> --to glb --no-wait [--json]

swap3d job status <jobId>
swap3d job download <jobId> --out <file>

swap3d usage [--json]
swap3d formats [--json] [--offline]
swap3d help
```

## Authentication

The CLI uses Swap3D API keys. Resolution order:

1. `--api-key`
2. `SWAP3D_API_KEY`
3. saved config from `swap3d auth login`

Saved config lives at:

```text
~/.config/swap3d/config.json
```

The CLI writes this file with `0600` permissions when the platform supports it.

## API URL

Default:

```text
https://api.swap3d.studio/api/v1
```

Override order:

1. `--api-url`
2. `SWAP3D_API_URL`
3. saved config
4. default production URL

## Current API Limits

`swap3d formats` reads live API capability metadata from `/openapi/formats` when available and falls back to built-in metadata if the endpoint is unreachable. Use `swap3d formats --offline` to skip the API request.

Target formats:

- `glb`
- `gltf`
- `glb2`
- `gltf2`

Source extensions:

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

Upload limit: `100 MB`.

Conversion is asynchronous: the CLI uploads the file, polls the job status, and downloads the result when it is ready.

## CI Example

```bash
export SWAP3D_API_KEY=sk_live_xxx
npx @swap3d/cli convert ./assets/model.obj --to glb --out ./dist/model.glb --json
```

Use JSON output for scripts:

```bash
swap3d usage --json
swap3d job status <jobId> --json
```

## License

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) and
[NOTICE](NOTICE).
