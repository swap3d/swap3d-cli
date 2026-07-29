#!/usr/bin/env node
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_API_URL,
  MAX_UPLOAD_BYTES,
  SOURCE_EXTENSIONS,
  Swap3DClient,
  Swap3DError,
  TARGET_FORMATS,
} from '@swap3d/sdk';

export const VERSION = '0.3.0';
export { DEFAULT_API_URL, MAX_UPLOAD_BYTES, SOURCE_EXTENSIONS, TARGET_FORMATS };

class CliError extends Error {
  constructor(message, { exitCode = 1 } = {}) {
    super(message);
    this.name = 'CliError';
    this.exitCode = exitCode;
  }
}

export function getConfigPath(env = process.env) {
  const baseDir = env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  return path.join(baseDir, 'swap3d', 'config.json');
}

export async function readConfig(env = process.env) {
  const configPath = getConfigPath(env);
  try {
    return JSON.parse(await fs.readFile(configPath, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return {};
    }
    throw new CliError(`Failed to read config: ${error.message}`);
  }
}

export async function writeConfig(config, env = process.env) {
  const configPath = getConfigPath(env);
  await fs.mkdir(path.dirname(configPath), { recursive: true, mode: 0o700 });
  await fs.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
  await fs.chmod(configPath, 0o600).catch(() => undefined);
  return configPath;
}

export function parseArgs(args) {
  const positionals = [];
  const options = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--') {
      positionals.push(...args.slice(index + 1));
      break;
    }

    if (!arg.startsWith('--') || arg === '-') {
      positionals.push(arg);
      continue;
    }

    const [rawKey, inlineValue] = arg.slice(2).split(/=(.*)/s, 2);
    const key = rawKey.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

    if (inlineValue !== undefined) {
      options[key] = inlineValue;
      continue;
    }

    const next = args[index + 1];
    if (next && !next.startsWith('--')) {
      options[key] = next;
      index += 1;
    } else {
      options[key] = true;
    }
  }

  return { positionals, options };
}

function normalizeApiUrl(apiUrl) {
  const value = String(apiUrl || DEFAULT_API_URL).trim();
  if (!value) {
    return DEFAULT_API_URL;
  }
  return value.replace(/\/+$/, '');
}

async function resolveRuntime(options = {}, env = process.env) {
  const config = await readConfig(env);
  const apiKey = options.apiKey || env.SWAP3D_API_KEY || config.apiKey || null;
  const apiUrl = normalizeApiUrl(options.apiUrl || env.SWAP3D_API_URL || config.apiUrl || DEFAULT_API_URL);

  return {
    apiKey,
    apiUrl,
    config,
    apiKeySource: options.apiKey ? 'option' : env.SWAP3D_API_KEY ? 'environment' : config.apiKey ? 'config' : null,
    apiUrlSource: options.apiUrl ? 'option' : env.SWAP3D_API_URL ? 'environment' : config.apiUrl ? 'config' : 'default',
  };
}

function requireApiKey(runtime) {
  if (!runtime.apiKey) {
    throw new CliError('Missing API key. Run `swap3d auth login --api-key <key>` or set SWAP3D_API_KEY.');
  }
}

function createClient({ apiUrl, apiKey }) {
  return new Swap3DClient({
    apiKey,
    baseUrl: normalizeApiUrl(apiUrl),
  });
}

function writeJson(out, payload) {
  out.write(`${JSON.stringify(payload, null, 2)}\n`);
}

function validateNodeVersion() {
  const major = Number(process.versions.node.split('.')[0]);
  if (major < 18) {
    throw new CliError('Swap3D CLI requires Node.js 18 or newer.');
  }
}

function validateTargetFormat(targetFormat) {
  const normalized = String(targetFormat || '').toLowerCase();
  if (!TARGET_FORMATS.includes(normalized)) {
    throw new CliError(`Unsupported target format: ${targetFormat || '(missing)'}. Supported: ${TARGET_FORMATS.join(', ')}`);
  }
  return normalized;
}

async function validateInputFile(filePath) {
  if (!filePath) {
    throw new CliError('Missing input file.');
  }

  const absolutePath = path.resolve(filePath);
  const stat = await fs.stat(absolutePath).catch((error) => {
    if (error?.code === 'ENOENT') {
      throw new CliError(`Input file not found: ${filePath}`);
    }
    throw error;
  });

  if (!stat.isFile()) {
    throw new CliError(`Input path is not a file: ${filePath}`);
  }

  if (stat.size > MAX_UPLOAD_BYTES) {
    throw new CliError(`Input file exceeds the 100 MB API upload limit: ${filePath}`);
  }

  const extension = path.extname(absolutePath).slice(1).toLowerCase();
  if (!SOURCE_EXTENSIONS.includes(extension)) {
    throw new CliError(`Unsupported source extension: .${extension || 'unknown'}. Supported: ${SOURCE_EXTENSIONS.join(', ')}`);
  }

  return { absolutePath, size: stat.size, extension };
}

function defaultOutputPath(inputFile, targetFormat) {
  const parsed = path.parse(inputFile);
  const extension = targetFormat === 'gltf2' ? 'gltf' : targetFormat === 'glb2' ? 'glb' : targetFormat;
  return path.join(parsed.dir, `${parsed.name}.${extension}`);
}

export async function submitConversion({ apiUrl, apiKey, filePath, targetFormat }) {
  const file = await validateInputFile(filePath);
  const normalizedTargetFormat = validateTargetFormat(targetFormat);
  const bytes = await fs.readFile(file.absolutePath);
  const blob = new Blob([bytes]);

  return createClient({ apiUrl, apiKey }).createConversion({
    file: blob,
    fileName: path.basename(file.absolutePath),
    targetFormat: normalizedTargetFormat,
  });
}

export async function getJobStatus({ apiUrl, apiKey, jobId }) {
  if (!jobId) {
    throw new CliError('Missing job id.');
  }

  return createClient({ apiUrl, apiKey }).getConversionStatus(jobId);
}

export async function getUsage({ apiUrl, apiKey }) {
  return createClient({ apiUrl, apiKey }).getUsage();
}

export async function getFormats({ apiUrl }) {
  return createClient({ apiUrl }).getFormats();
}

async function pollJob({ apiUrl, apiKey, jobId, intervalMs, timeoutMs, out }) {
  let lastStatus = null;
  const status = await createClient({ apiUrl, apiKey }).waitForConversion(jobId, {
    intervalMs,
    timeoutMs,
    onStatus: (current) => {
      if (out && current.status !== lastStatus) {
        out.write(`status: ${current.status}\n`);
        lastStatus = current.status;
      }
    },
  });

  if (status.status === 'failed') {
    throw new CliError(`Conversion failed: ${status.error || 'unknown error'}`);
  }

  if (status.status === 'expired') {
    throw new CliError(status.error?.message || 'Conversion output expired.');
  }

  return status;
}

export async function downloadResult({ apiUrl, downloadUrl, outFile }) {
  if (!downloadUrl) {
    throw new CliError('Completed job did not include a download URL.');
  }
  const response = await createClient({ apiUrl }).download(downloadUrl);

  await fs.mkdir(path.dirname(path.resolve(outFile)), { recursive: true });
  await pipeline(Readable.fromWeb(response.body), fsSync.createWriteStream(outFile));
}

function printHelp(out = process.stdout) {
  out.write(`Swap3D CLI ${VERSION}

Usage:
  swap3d auth login --api-key <key> [--api-url <url>]
  swap3d auth status
  swap3d auth logout
  swap3d convert <file> --to glb [--out <file>] [--no-wait] [--json]
  swap3d job status <jobId> [--json]
  swap3d job download <jobId> --out <file> [--json]
  swap3d usage [--json]
  swap3d formats [--json] [--offline]

Environment:
  SWAP3D_API_KEY   API key for CI and non-interactive usage
  SWAP3D_API_URL   API base URL, default ${DEFAULT_API_URL}
`);
}

function getBuiltInFormatsPayload(source = 'built-in') {
  return {
    targetFormats: TARGET_FORMATS,
    sourceExtensions: SOURCE_EXTENSIONS,
    uploadLimitBytes: MAX_UPLOAD_BYTES,
    source,
  };
}

function printFormats(payload, out = process.stdout) {
  const uploadLimitMb = Math.round(payload.uploadLimitBytes / 1024 / 1024);
  out.write(`Target formats:
  ${payload.targetFormats.join(', ')}

Source extensions:
  ${payload.sourceExtensions.map((item) => `.${item}`).join(', ')}

Upload limit:
  ${uploadLimitMb} MB

Source:
  ${payload.source}
`);
}

async function handleAuth(args, io, env) {
  const { positionals, options } = parseArgs(args);
  const action = positionals[0];

  if (action === 'login') {
    if (!options.apiKey) {
      throw new CliError('Usage: swap3d auth login --api-key <key> [--api-url <url>]');
    }
    const current = await readConfig(env);
    const next = {
      ...current,
      apiKey: String(options.apiKey),
      apiUrl: normalizeApiUrl(options.apiUrl || current.apiUrl || DEFAULT_API_URL),
    };
    const configPath = await writeConfig(next, env);
    io.out.write(`Saved API key to ${configPath}\n`);
    return;
  }

  if (action === 'status') {
    const runtime = await resolveRuntime(options, env);
    if (options.json) {
      writeJson(io.out, {
        apiUrl: runtime.apiUrl,
        apiUrlSource: runtime.apiUrlSource,
        apiKeyConfigured: Boolean(runtime.apiKey),
        apiKeySource: runtime.apiKeySource,
      });
      return;
    }
    io.out.write(`API URL: ${runtime.apiUrl} (${runtime.apiUrlSource})\n`);
    io.out.write(`API key: ${runtime.apiKey ? `configured (${runtime.apiKeySource})` : 'not configured'}\n`);
    return;
  }

  if (action === 'logout') {
    const current = await readConfig(env);
    delete current.apiKey;
    const configPath = await writeConfig(current, env);
    io.out.write(`Removed saved API key from ${configPath}\n`);
    return;
  }

  throw new CliError('Usage: swap3d auth <login|status|logout>');
}

async function handleConvert(args, io, env) {
  const { positionals, options } = parseArgs(args);
  const inputFile = positionals[0];
  const targetFormat = validateTargetFormat(options.to || options.targetFormat);
  const runtime = await resolveRuntime(options, env);
  requireApiKey(runtime);

  const result = await submitConversion({
    apiUrl: runtime.apiUrl,
    apiKey: runtime.apiKey,
    filePath: inputFile,
    targetFormat,
  });

  if (options.json && options.noWait) {
    writeJson(io.out, result);
    return;
  }

  if (!options.json) {
    io.out.write(`jobId: ${result.jobId}\n`);
  }

  if (options.noWait) {
    io.out.write(`statusUrl: ${result.statusUrl}\n`);
    return;
  }

  const status = await pollJob({
    apiUrl: runtime.apiUrl,
    apiKey: runtime.apiKey,
    jobId: result.jobId,
    intervalMs: Number(options.pollInterval || 2000),
    timeoutMs: Number(options.timeout || 15 * 60 * 1000),
    out: options.json ? null : io.out,
  });

  const outFile = options.out || defaultOutputPath(inputFile, targetFormat);
  await downloadResult({
    apiUrl: runtime.apiUrl,
    downloadUrl: status.result?.downloadUrl,
    outFile,
  });
  if (options.json) {
    writeJson(io.out, {
      jobId: result.jobId,
      status: status.status,
      output: outFile,
      result: {
        targetFormat: status.result?.targetFormat,
        outputExpiresAt: status.result?.outputExpiresAt,
      },
    });
    return;
  }
  io.out.write(`downloaded: ${outFile}\n`);
}

async function handleJob(args, io, env) {
  const { positionals, options } = parseArgs(args);
  const action = positionals[0];
  const jobId = positionals[1];
  const runtime = await resolveRuntime(options, env);
  requireApiKey(runtime);

  if (action === 'status') {
    const status = await getJobStatus({ apiUrl: runtime.apiUrl, apiKey: runtime.apiKey, jobId });
    if (options.json) {
      writeJson(io.out, status);
    } else {
      io.out.write(`status: ${status.status}\n`);
      if (status.status === 'completed') {
        io.out.write(`targetFormat: ${status.result?.targetFormat || 'unknown'}\n`);
        if (status.result?.outputExpiresAt) {
          io.out.write(`outputExpiresAt: ${status.result.outputExpiresAt}\n`);
        }
      }
      if (status.error) {
        io.out.write(`error: ${typeof status.error === 'string' ? status.error : status.error.message}\n`);
      }
    }
    return;
  }

  if (action === 'download') {
    const outFile = options.out;
    if (!outFile) {
      throw new CliError('Usage: swap3d job download <jobId> --out <file>');
    }
    const status = await getJobStatus({ apiUrl: runtime.apiUrl, apiKey: runtime.apiKey, jobId });
    if (status.status !== 'completed') {
      throw new CliError(`Job is not completed. Current status: ${status.status}`);
    }
    await downloadResult({ apiUrl: runtime.apiUrl, downloadUrl: status.result?.downloadUrl, outFile });
    if (options.json) {
      writeJson(io.out, {
        jobId,
        status: status.status,
        output: outFile,
        result: {
          targetFormat: status.result?.targetFormat,
          outputExpiresAt: status.result?.outputExpiresAt,
        },
      });
      return;
    }
    io.out.write(`downloaded: ${outFile}\n`);
    return;
  }

  throw new CliError('Usage: swap3d job <status|download> <jobId>');
}

async function handleUsage(args, io, env) {
  const { options } = parseArgs(args);
  const runtime = await resolveRuntime(options, env);
  requireApiKey(runtime);

  const usage = await getUsage({ apiUrl: runtime.apiUrl, apiKey: runtime.apiKey });
  if (options.json) {
    writeJson(io.out, usage);
    return;
  }

  io.out.write(`plan: ${usage.plan || 'unknown'}\n`);
  io.out.write(`usage: ${usage.usageCount ?? 'unknown'} / ${usage.limit ?? 'unknown'}\n`);
  if (usage.remaining !== undefined) {
    io.out.write(`remaining: ${usage.remaining}\n`);
  }
  if (usage.monthStart) {
    io.out.write(`monthStart: ${usage.monthStart}\n`);
  }
}

async function handleFormats(args, io, env) {
  const { options } = parseArgs(args);
  const runtime = await resolveRuntime(options, env);

  let payload = getBuiltInFormatsPayload('built-in');
  if (!options.offline) {
    try {
      const live = await getFormats({ apiUrl: runtime.apiUrl });
      payload = {
        targetFormats: live.targetFormats || TARGET_FORMATS,
        sourceExtensions: live.sourceExtensions || SOURCE_EXTENSIONS,
        uploadLimitBytes: live.uploadLimitBytes || MAX_UPLOAD_BYTES,
        source: 'api',
      };
    } catch (error) {
      payload = {
        ...payload,
        source: 'built-in-fallback',
        warning: error.message,
      };
    }
  }

  if (options.json) {
    writeJson(io.out, payload);
    return;
  }

  printFormats(payload, io.out);
  if (payload.warning) {
    io.err.write(`Warning: ${payload.warning}\n`);
  }
}

export async function runCli(argv = process.argv.slice(2), io = { out: process.stdout, err: process.stderr }, env = process.env) {
  validateNodeVersion();
  const [command, ...rest] = argv;

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printHelp(io.out);
    return 0;
  }

  if (command === '--version' || command === '-v' || command === 'version') {
    io.out.write(`${VERSION}\n`);
    return 0;
  }

  if (command === 'formats') {
    await handleFormats(rest, io, env);
    return 0;
  }

  if (command === 'usage') {
    await handleUsage(rest, io, env);
    return 0;
  }

  if (command === 'auth') {
    await handleAuth(rest, io, env);
    return 0;
  }

  if (command === 'convert') {
    await handleConvert(rest, io, env);
    return 0;
  }

  if (command === 'job') {
    await handleJob(rest, io, env);
    return 0;
  }

  throw new CliError(`Unknown command: ${command}`);
}

function isCliEntrypoint() {
  if (!process.argv[1]) {
    return false;
  }

  try {
    return fsSync.realpathSync(fileURLToPath(import.meta.url)) === fsSync.realpathSync(process.argv[1]);
  } catch {
    return fileURLToPath(import.meta.url) === process.argv[1];
  }
}

if (import.meta.main === true || isCliEntrypoint()) {
  runCli().then((exitCode) => {
    process.exitCode = exitCode;
  }).catch((error) => {
    if (error instanceof CliError || error instanceof Swap3DError) {
      process.stderr.write(`Error: ${error.message}\n`);
      process.exitCode = error.exitCode || 1;
      return;
    }
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
}
