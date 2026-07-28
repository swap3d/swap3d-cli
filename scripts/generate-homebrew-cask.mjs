#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDir, '..');

function parseArguments(argv) {
  let checksumPath = path.join(repositoryRoot, 'dist', 'release', 'SHA256SUMS');
  let outputPath = path.join(repositoryRoot, 'dist', 'homebrew', 'Casks', 'swap3d.rb');

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--checksums') {
      checksumPath = path.resolve(argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg === '--out') {
      outputPath = path.resolve(argv[index + 1]);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return { checksumPath, outputPath };
}

function checksumFor(manifest, filename) {
  const line = manifest
    .split(/\r?\n/)
    .map((value) => value.trim())
    .find((value) => value.endsWith(`  ${filename}`));

  if (!line) {
    throw new Error(`Missing checksum for ${filename}.`);
  }
  return line.split(/\s+/)[0];
}

const { checksumPath, outputPath } = parseArguments(process.argv.slice(2));
const packageJson = JSON.parse(await fs.readFile(path.join(repositoryRoot, 'package.json'), 'utf8'));
const manifest = await fs.readFile(checksumPath, 'utf8');
const arm64Checksum = checksumFor(manifest, 'swap3d-darwin-arm64.tar.gz');
const x64Checksum = checksumFor(manifest, 'swap3d-darwin-x64.tar.gz');

const cask = `cask "swap3d" do
  arch arm: "arm64", intel: "x64"

  version "${packageJson.version}"
  sha256 arm:   "${arm64Checksum}",
         intel: "${x64Checksum}"

  url "https://github.com/swap3d/swap3d-cli/releases/download/v#{version}/swap3d-darwin-#{arch}.tar.gz",
      verified: "github.com/swap3d/swap3d-cli/"
  name "Swap3D CLI"
  desc "Command-line client for the Swap3D developer API"
  homepage "https://swap3d.studio/"

  livecheck do
    url :url
    strategy :github_latest
  end

  binary "swap3d"

  zap trash: "~/.config/swap3d"
end
`;

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, cask, 'utf8');
process.stdout.write(`Generated Homebrew cask: ${outputPath}\n`);
