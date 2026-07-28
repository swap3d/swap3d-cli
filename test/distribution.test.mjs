import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { execFile as execFileCallback } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { VERSION } from '../src/cli.mjs';

const execFile = promisify(execFileCallback);
const testDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(testDir, '..');

test('package and CLI versions remain aligned', async () => {
  const packageJson = JSON.parse(await fs.readFile(path.join(repositoryRoot, 'package.json'), 'utf8'));
  assert.equal(VERSION, packageJson.version);
});

test('release checksum verifier accepts exact bytes and rejects tampering', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'swap3d-checksum-test-'));
  const archivePath = path.join(tempDir, 'asset.tar.gz');
  const manifestPath = path.join(tempDir, 'SHA256SUMS');

  try {
    const original = Buffer.from('original release bytes');
    const checksum = crypto.createHash('sha256').update(original).digest('hex');
    await fs.writeFile(archivePath, original);
    await fs.writeFile(manifestPath, `${checksum}  asset.tar.gz\n`);

    await execFile(process.execPath, [
      path.join(repositoryRoot, 'scripts', 'verify-checksum.mjs'),
      manifestPath,
      archivePath,
    ]);

    await fs.writeFile(archivePath, 'tampered release bytes');
    await assert.rejects(
      execFile(process.execPath, [
        path.join(repositoryRoot, 'scripts', 'verify-checksum.mjs'),
        manifestPath,
        archivePath,
      ]),
      /Checksum mismatch/,
    );
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test('Homebrew formula generator uses release archive checksums', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'swap3d-formula-test-'));
  const manifestPath = path.join(tempDir, 'SHA256SUMS');
  const outputPath = path.join(tempDir, 'swap3d.rb');
  const arm64Checksum = 'a'.repeat(64);
  const x64Checksum = 'b'.repeat(64);

  try {
    await fs.writeFile(
      manifestPath,
      `${arm64Checksum}  swap3d-darwin-arm64.tar.gz\n${x64Checksum}  swap3d-darwin-x64.tar.gz\n`,
    );

    await execFile(process.execPath, [
      path.join(repositoryRoot, 'scripts', 'generate-homebrew-formula.mjs'),
      '--checksums',
      manifestPath,
      '--out',
      outputPath,
    ]);

    const formula = await fs.readFile(outputPath, 'utf8');
    assert.match(formula, new RegExp(`version "${VERSION.replaceAll('.', '\\.')}"`));
    assert.ok(formula.includes(arm64Checksum));
    assert.ok(formula.includes(x64Checksum));
    assert.ok(formula.includes('bin.install "swap3d"'));
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test('shell installer parses as POSIX shell', { skip: process.platform === 'win32' }, async () => {
  await execFile('sh', ['-n', path.join(repositoryRoot, 'install', 'install.sh')]);
});

test('shell installer rejects an invalid version before downloading', { skip: process.platform === 'win32' }, async () => {
  await assert.rejects(
    execFile('sh', [path.join(repositoryRoot, 'install', 'install.sh'), '--version', 'not-a-version']),
    /invalid version/,
  );
});
