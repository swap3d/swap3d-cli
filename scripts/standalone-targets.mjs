export const STANDALONE_TARGETS = {
  'darwin-arm64': {
    bunTarget: 'bun-darwin-arm64',
    binaryFilename: 'swap3d-darwin-arm64',
    archiveFilename: 'swap3d-darwin-arm64.tar.gz',
    installedFilename: 'swap3d',
  },
  'darwin-x64': {
    bunTarget: 'bun-darwin-x64-baseline',
    binaryFilename: 'swap3d-darwin-x64',
    archiveFilename: 'swap3d-darwin-x64.tar.gz',
    installedFilename: 'swap3d',
  },
  'linux-arm64': {
    bunTarget: 'bun-linux-arm64',
    binaryFilename: 'swap3d-linux-arm64',
    archiveFilename: 'swap3d-linux-arm64.tar.gz',
    installedFilename: 'swap3d',
  },
  'linux-arm64-musl': {
    bunTarget: 'bun-linux-arm64-musl',
    binaryFilename: 'swap3d-linux-arm64-musl',
    archiveFilename: 'swap3d-linux-arm64-musl.tar.gz',
    installedFilename: 'swap3d',
  },
  'linux-x64': {
    bunTarget: 'bun-linux-x64-baseline',
    binaryFilename: 'swap3d-linux-x64',
    archiveFilename: 'swap3d-linux-x64.tar.gz',
    installedFilename: 'swap3d',
  },
  'linux-x64-musl': {
    bunTarget: 'bun-linux-x64-musl-baseline',
    binaryFilename: 'swap3d-linux-x64-musl',
    archiveFilename: 'swap3d-linux-x64-musl.tar.gz',
    installedFilename: 'swap3d',
  },
  'windows-arm64': {
    bunTarget: 'bun-windows-arm64',
    binaryFilename: 'swap3d-windows-arm64.exe',
    archiveFilename: 'swap3d-windows-arm64.zip',
    installedFilename: 'swap3d.exe',
  },
  'windows-x64': {
    bunTarget: 'bun-windows-x64-baseline',
    binaryFilename: 'swap3d-windows-x64.exe',
    archiveFilename: 'swap3d-windows-x64.zip',
    installedFilename: 'swap3d.exe',
  },
};
