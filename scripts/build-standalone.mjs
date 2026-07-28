#!/usr/bin/env bun
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { STANDALONE_TARGETS } from './standalone-targets.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDir, '..');

function parseArguments(argv) {
  const selectedTargets = [];
  let outDir = path.join(repositoryRoot, 'dist', 'standalone');
  let buildAll = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--all') {
      buildAll = true;
      continue;
    }
    if (arg === '--target') {
      selectedTargets.push(argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg === '--out-dir') {
      outDir = path.resolve(argv[index + 1]);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (buildAll && selectedTargets.length > 0) {
    throw new Error('Use either --all or --target, not both.');
  }

  if (buildAll) {
    return { outDir, selectedTargets: Object.keys(STANDALONE_TARGETS) };
  }

  if (selectedTargets.length > 0) {
    return { outDir, selectedTargets };
  }

  const platform = os.platform() === 'win32' ? 'windows' : os.platform();
  const architecture = os.arch() === 'x64' ? 'x64' : os.arch();
  return { outDir, selectedTargets: [`${platform}-${architecture}`] };
}

async function assertVersionAlignment() {
  const packageJson = JSON.parse(await fs.readFile(path.join(repositoryRoot, 'package.json'), 'utf8'));
  const cliSource = await fs.readFile(path.join(repositoryRoot, 'src', 'cli.mjs'), 'utf8');
  const expectedDeclaration = `export const VERSION = '${packageJson.version}';`;

  if (!cliSource.includes(expectedDeclaration)) {
    throw new Error(`CLI version does not match package.json version ${packageJson.version}.`);
  }
}

async function buildTarget(targetName, outDir) {
  const target = STANDALONE_TARGETS[targetName];
  if (!target) {
    throw new Error(
      `Unknown target: ${targetName}. Supported targets: ${Object.keys(STANDALONE_TARGETS).join(', ')}`,
    );
  }

  const outfile = path.join(outDir, target.binaryFilename);
  const result = await Bun.build({
    entrypoints: [path.join(repositoryRoot, 'src', 'cli.mjs')],
    minify: true,
    compile: {
      target: target.bunTarget,
      outfile,
      autoloadDotenv: false,
      autoloadBunfig: false,
      autoloadPackageJson: false,
    },
  });

  if (!result.success) {
    const details = result.logs.map((log) => String(log)).join('\n');
    throw new Error(`Failed to build ${targetName}${details ? `:\n${details}` : ''}`);
  }

  process.stdout.write(`${targetName}: ${outfile}\n`);
}

const { outDir, selectedTargets } = parseArguments(process.argv.slice(2));
await assertVersionAlignment();
await fs.mkdir(outDir, { recursive: true });

for (const targetName of selectedTargets) {
  await buildTarget(targetName, outDir);
}
