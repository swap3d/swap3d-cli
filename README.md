# Swap3D CLI

Command-line client for the Swap3D developer API.

```bash
npm install -g @swap3d/cli
swap3d auth login --api-key sk_live_xxx
swap3d convert ./model.obj --to glb --out ./model.glb
```

You can also use it without installing:

```bash
npx @swap3d/cli formats
SWAP3D_API_KEY=sk_live_xxx npx @swap3d/cli convert ./model.obj --to glb
```

## Commands

```bash
swap3d auth login --api-key <key> [--api-url <url>]
swap3d auth status
swap3d auth logout

swap3d convert <file> --to glb [--out <file>]
swap3d convert <file> --to glb --no-wait

swap3d job status <jobId>
swap3d job download <jobId> --out <file>

swap3d formats
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
npx @swap3d/cli convert ./assets/model.obj --to glb --out ./dist/model.glb
```
