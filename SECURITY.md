# Security Policy

## Supported Versions

Security fixes are provided for the latest published version of `@swap3d/cli`.

## Reporting a Vulnerability

Please report security issues privately instead of opening a public issue.

Contact:

- security@swap3d.studio

Include:

- affected command or workflow
- expected impact
- reproduction steps
- whether any API keys, files, or account data may have been exposed

## CLI Secret Handling

The CLI must not print API keys. Local API keys are stored in:

```text
~/.config/swap3d/config.json
```

The CLI writes this file with `0600` permissions when supported by the platform. CI should prefer `SWAP3D_API_KEY`.
