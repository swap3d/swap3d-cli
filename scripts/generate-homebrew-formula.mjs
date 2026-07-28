#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDir, '..');

function parseArguments(argv) {
  let checksumPath = path.join(repositoryRoot, 'dist', 'release', 'SHA256SUMS');
  let outputPath = path.join(repositoryRoot, 'dist', 'homebrew', 'Formula', 'swap3d.rb');

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

const formula = `class Swap3d < Formula
  desc "Command-line client for the Swap3D developer API"
  homepage "https://swap3d.studio/"
  version "${packageJson.version}"
  license "Apache-2.0"
  depends_on :macos

  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/swap3d/swap3d-cli/releases/download/v#{version}/swap3d-darwin-arm64.tar.gz"
      sha256 "${arm64Checksum}"
    else
      url "https://github.com/swap3d/swap3d-cli/releases/download/v#{version}/swap3d-darwin-x64.tar.gz"
      sha256 "${x64Checksum}"
    end
  end

  def install
    bin.install "swap3d"
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/swap3d --version")
  end
end
`;

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, formula, 'utf8');
process.stdout.write(`Generated Homebrew formula: ${outputPath}\n`);
