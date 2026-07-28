#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDir, '..');
const tag = process.argv[2];

if (!tag || !/^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(tag)) {
  throw new Error(`Expected a semantic version tag such as v0.2.0, received: ${tag || '(missing)'}`);
}

const packageJson = JSON.parse(await fs.readFile(path.join(repositoryRoot, 'package.json'), 'utf8'));
const expectedVersion = tag.slice(1);
if (packageJson.version !== expectedVersion) {
  throw new Error(`Tag ${tag} does not match package.json version ${packageJson.version}.`);
}

const cliSource = await fs.readFile(path.join(repositoryRoot, 'src', 'cli.mjs'), 'utf8');
if (!cliSource.includes(`export const VERSION = '${expectedVersion}';`)) {
  throw new Error(`src/cli.mjs does not declare version ${expectedVersion}.`);
}

const changelog = await fs.readFile(path.join(repositoryRoot, 'CHANGELOG.md'), 'utf8');
if (!changelog.includes(`## ${expectedVersion} - `)) {
  throw new Error(`CHANGELOG.md does not contain a dated ${expectedVersion} release section.`);
}

process.stdout.write(`Release version verified: ${tag}\n`);
