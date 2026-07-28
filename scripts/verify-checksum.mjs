#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const [manifestPath, archivePath] = process.argv.slice(2);
if (!manifestPath || !archivePath) {
  throw new Error('Usage: verify-checksum.mjs <SHA256SUMS> <archive>');
}

const archiveName = path.basename(archivePath);
const manifest = await fs.readFile(manifestPath, 'utf8');
const expectedLine = manifest
  .split(/\r?\n/)
  .map((line) => line.trim())
  .find((line) => line.endsWith(`  ${archiveName}`));

if (!expectedLine) {
  throw new Error(`No checksum found for ${archiveName}.`);
}

const expected = expectedLine.split(/\s+/)[0].toLowerCase();
const actual = crypto.createHash('sha256').update(await fs.readFile(archivePath)).digest('hex');
if (actual !== expected) {
  throw new Error(`Checksum mismatch for ${archiveName}.`);
}

process.stdout.write(`Checksum verified: ${archiveName}\n`);
