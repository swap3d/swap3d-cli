#!/usr/bin/env node
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { STANDALONE_TARGETS } from './standalone-targets.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDir, '..');

function parseArguments(argv) {
  let inputDir = path.join(repositoryRoot, 'dist', 'standalone');
  let outDir = path.join(repositoryRoot, 'dist', 'release');

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--input-dir') {
      inputDir = path.resolve(argv[index + 1]);
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

  return { inputDir, outDir };
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', ...options });
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}

async function sha256(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(await fs.readFile(filePath));
  return hash.digest('hex');
}

async function packageTarget(targetName, target, inputDir, stagingRoot, outDir) {
  const sourceBinary = path.join(inputDir, target.binaryFilename);
  await fs.access(sourceBinary);

  const payloadDir = path.join(stagingRoot, targetName);
  await fs.mkdir(payloadDir, { recursive: true });

  const installedBinary = path.join(payloadDir, target.installedFilename);
  await fs.copyFile(sourceBinary, installedBinary);
  if (!targetName.startsWith('windows-')) {
    await fs.chmod(installedBinary, 0o755);
  }

  for (const filename of ['LICENSE', 'NOTICE', 'README.md']) {
    await fs.copyFile(path.join(repositoryRoot, filename), path.join(payloadDir, filename));
  }

  const archivePath = path.join(outDir, target.archiveFilename);
  if (target.archiveFilename.endsWith('.zip')) {
    await run('zip', ['-q', '-r', archivePath, '.'], { cwd: payloadDir });
  } else {
    await run('tar', ['-czf', archivePath, '-C', payloadDir, '.']);
  }

  return archivePath;
}

const { inputDir, outDir } = parseArguments(process.argv.slice(2));
const stagingRoot = path.join(outDir, '.staging');

await fs.rm(outDir, { recursive: true, force: true });
await fs.mkdir(stagingRoot, { recursive: true });

const archives = [];
for (const [targetName, target] of Object.entries(STANDALONE_TARGETS)) {
  archives.push(await packageTarget(targetName, target, inputDir, stagingRoot, outDir));
}

const installerFiles = [];
for (const filename of ['install.sh', 'install.ps1']) {
  const destination = path.join(outDir, filename);
  await fs.copyFile(path.join(repositoryRoot, 'install', filename), destination);
  installerFiles.push(destination);
}
await fs.chmod(path.join(outDir, 'install.sh'), 0o755);

const checksumLines = [];
for (const distributionFile of [...archives, ...installerFiles].sort()) {
  checksumLines.push(`${await sha256(distributionFile)}  ${path.basename(distributionFile)}`);
}
await fs.writeFile(path.join(outDir, 'SHA256SUMS'), `${checksumLines.join('\n')}\n`, 'utf8');
await fs.rm(stagingRoot, { recursive: true, force: true });

process.stdout.write(`Packaged ${archives.length} standalone archives and installers in ${outDir}\n`);
