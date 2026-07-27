import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  DEFAULT_API_URL,
  downloadResult,
  getConfigPath,
  parseArgs,
  readConfig,
  runCli,
  submitConversion,
  writeConfig,
} from '../src/cli.mjs';

function createBufferWriter() {
  let value = '';
  return {
    write(chunk) {
      value += String(chunk);
    },
    value() {
      return value;
    },
  };
}

async function createTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'swap3d-cli-test-'));
}

test('parseArgs handles options, flags, and positionals', () => {
  assert.deepEqual(parseArgs(['model.obj', '--to', 'glb', '--no-wait', '--api-url=https://example.test']), {
    positionals: ['model.obj'],
    options: {
      to: 'glb',
      noWait: true,
      apiUrl: 'https://example.test',
    },
  });
});

test('config read/write uses XDG_CONFIG_HOME and preserves values', async () => {
  const tempDir = await createTempDir();
  const env = { XDG_CONFIG_HOME: tempDir };

  await writeConfig({ apiKey: 'sk_test_123', apiUrl: 'https://api.example.test/v1' }, env);

  assert.equal(getConfigPath(env), path.join(tempDir, 'swap3d', 'config.json'));
  assert.deepEqual(await readConfig(env), {
    apiKey: 'sk_test_123',
    apiUrl: 'https://api.example.test/v1',
  });
});

test('auth status reports configured API key without printing it', async () => {
  const tempDir = await createTempDir();
  const env = { XDG_CONFIG_HOME: tempDir };
  const out = createBufferWriter();
  const err = createBufferWriter();

  await runCli(['auth', 'login', '--api-key', 'sk_secret_should_not_print'], { out, err }, env);
  const loginOutput = out.value();
  assert.match(loginOutput, /Saved API key/);
  assert.doesNotMatch(loginOutput, /sk_secret/);

  const statusOut = createBufferWriter();
  await runCli(['auth', 'status'], { out: statusOut, err }, env);
  assert.match(statusOut.value(), /API key: configured/);
  assert.doesNotMatch(statusOut.value(), /sk_secret/);
});

test('submitConversion posts multipart data to the developer API', async () => {
  const tempDir = await createTempDir();
  const modelPath = path.join(tempDir, 'cube.obj');
  await fs.writeFile(modelPath, 'o cube\n');

  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify({
      message: 'Conversion started',
      jobId: 'job_123',
      statusUrl: '/api/v1/openapi/convert/status/job_123',
    }), {
      status: 202,
      headers: { 'content-type': 'application/json' },
    });
  };

  try {
    const result = await submitConversion({
      apiUrl: DEFAULT_API_URL,
      apiKey: 'sk_test_123',
      filePath: modelPath,
      targetFormat: 'glb',
    });

    assert.equal(result.jobId, 'job_123');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, `${DEFAULT_API_URL}/openapi/convert`);
    assert.equal(calls[0].options.method, 'POST');
    assert.equal(calls[0].options.headers.Authorization, 'Bearer sk_test_123');
    assert.ok(calls[0].options.body instanceof FormData);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('convert waits for completion and downloads the result', async () => {
  const tempDir = await createTempDir();
  const modelPath = path.join(tempDir, 'cube.obj');
  const outputPath = path.join(tempDir, 'cube.glb');
  await fs.writeFile(modelPath, 'o cube\n');

  const originalFetch = globalThis.fetch;
  const seenUrls = [];
  globalThis.fetch = async (url) => {
    seenUrls.push(String(url));
    if (String(url).endsWith('/openapi/convert')) {
      return new Response(JSON.stringify({ jobId: 'job_123' }), {
        status: 202,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (String(url).includes('/openapi/convert/status/job_123')) {
      return new Response(JSON.stringify({
        status: 'completed',
        result: {
          targetFormat: 'glb',
          downloadUrl: '/downloads/job_123.glb',
        },
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (String(url).endsWith('/downloads/job_123.glb')) {
      return new Response('converted-glb', { status: 200 });
    }
    return new Response('not found', { status: 404 });
  };

  try {
    const out = createBufferWriter();
    await runCli([
      'convert',
      modelPath,
      '--to',
      'glb',
      '--out',
      outputPath,
      '--poll-interval',
      '1',
    ], { out, err: createBufferWriter() }, {
      XDG_CONFIG_HOME: tempDir,
      SWAP3D_API_KEY: 'sk_test_123',
      SWAP3D_API_URL: 'https://api.example.test/api/v1',
    });

    assert.match(out.value(), /jobId: job_123/);
    assert.match(out.value(), /downloaded:/);
    assert.equal(await fs.readFile(outputPath, 'utf8'), 'converted-glb');
    assert.deepEqual(seenUrls, [
      'https://api.example.test/api/v1/openapi/convert',
      'https://api.example.test/api/v1/openapi/convert/status/job_123',
      'https://api.example.test/downloads/job_123.glb',
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('downloadResult writes response bytes to disk', async () => {
  const tempDir = await createTempDir();
  const outputPath = path.join(tempDir, 'asset.glb');
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => new Response('asset-bytes', { status: 200 });

  try {
    await downloadResult({
      apiUrl: 'https://api.example.test/api/v1',
      downloadUrl: 'https://cdn.example.test/asset.glb',
      outFile: outputPath,
    });
    assert.equal(await fs.readFile(outputPath, 'utf8'), 'asset-bytes');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
