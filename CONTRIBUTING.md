# Contributing To Swap3D CLI

Thanks for helping improve Swap3D CLI.

## Before You Start

- Check existing issues before opening a new one.
- Keep proposals within the CLI's scope: authentication, cloud conversion,
  job status, downloads, usage, and format metadata.
- Report vulnerabilities privately by following [SECURITY.md](SECURITY.md).
  Do not open a public issue for a security report.

## Development

Swap3D CLI requires Node.js 18 or newer. Its API transport and public
capability metadata come from the official `@swap3d/sdk`.

```shell
git clone https://github.com/swap3d/swap3d-cli.git
cd swap3d-cli
npm install
npm test
```

Run the CLI directly during development:

```shell
node src/cli.mjs --help
node src/cli.mjs formats --offline
```

## Making Changes

- Keep behavior aligned with the production Swap3D developer API.
- Do not add commands for backend capabilities that do not exist.
- Never print, commit, or include API keys in fixtures.
- Preserve support for Node.js 18 and newer.
- Add or update tests for behavior changes.
- Update the README when commands, options, installation, or user-facing
  behavior changes.

## Testing

Run the full test suite before opening a pull request:

```shell
npm test
```

For distribution or installer changes, also run the relevant checks:

```shell
sh -n install/install.sh
npx bun@1.3.14 scripts/build-standalone.mjs --all
npm run package:standalone
```

## Pull Requests

Pull requests should:

- explain the user-visible problem and the chosen solution
- stay focused on one change
- include tests or explain why tests are not needed
- link related issues when applicable
- call out compatibility or security implications

Maintainers handle versioning, release tags, npm publication, and Homebrew
synchronization after a change is approved.
