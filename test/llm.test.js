const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const llmPath = require.resolve('../llm');

function freshLlm() {
  delete require.cache[llmPath];
  return require('../llm');
}

function withEnv(values, fn) {
  const previous = {};
  for (const [key, value] of Object.entries(values)) {
    previous[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  return Promise.resolve()
    .then(fn)
    .finally(() => {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
      delete require.cache[llmPath];
    });
}

function writeCliStub(source) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'claudio-codex-cli-'));
  const file = path.join(dir, 'codex-stub.js');
  fs.writeFileSync(file, source, { mode: 0o755 });
  return file;
}

test('generateJson defaults to local Codex CLI and parses JSON output', async () => {
  const cli = writeCliStub(`#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
const prompt = fs.readFileSync(0, 'utf8');
if (!args.includes('exec')) {
  console.error('missing exec subcommand');
  process.exit(2);
}
if (args.includes('--ask-for-approval')) {
  console.error('codex exec does not support --ask-for-approval');
  process.exit(4);
}
if (!prompt.includes('Return strict JSON only') || !prompt.includes('Pick one song')) {
  console.error('prompt was not wrapped for JSON-only Codex output');
  process.exit(3);
}
const response = JSON.stringify({
  title: 'Local Codex Set',
  say: 'Here comes the first track.',
  play: ['Massive Attack - Teardrop']
});
const outputIndex = args.findIndex(arg => arg === '--output-last-message' || arg === '-o');
if (outputIndex >= 0) fs.writeFileSync(args[outputIndex + 1], response);
else process.stdout.write(response);
`);

  await withEnv({
    LLM_PROVIDER: undefined,
    CODEX_CLI_COMMAND: cli,
    CODEX_CLI_ARGS: undefined,
    DEEPSEEK_API_KEY: undefined,
  }, async () => {
    const { generateJson } = freshLlm();
    const result = await generateJson('Pick one song');

    assert.equal(result.title, 'Local Codex Set');
    assert.deepEqual(result.play, ['Massive Attack - Teardrop']);
  });
});

test('generateJson starts Codex CLI without user MCP config', async () => {
  const cli = writeCliStub(`#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.readFileSync(0, 'utf8');
if (!args.includes('--ignore-user-config')) {
  console.error('missing --ignore-user-config');
  process.exit(5);
}
const outputIndex = args.findIndex(arg => arg === '--output-last-message' || arg === '-o');
const response = JSON.stringify({ title: 'Clean CLI', play: [] });
if (outputIndex >= 0) fs.writeFileSync(args[outputIndex + 1], response);
else process.stdout.write(response);
`);

  await withEnv({
    LLM_PROVIDER: 'codex_cli',
    CODEX_CLI_COMMAND: cli,
    CODEX_CLI_ARGS: undefined,
  }, async () => {
    const { generateJson } = freshLlm();
    const result = await generateJson('Pick one song');

    assert.equal(result.title, 'Clean CLI');
  });
});

test('generateJson rejects when Codex CLI exits unsuccessfully', async () => {
  const cli = writeCliStub(`#!/usr/bin/env node
console.error('codex failed');
process.exit(42);
`);

  await withEnv({
    LLM_PROVIDER: 'codex_cli',
    CODEX_CLI_COMMAND: cli,
  }, async () => {
    const { generateJson } = freshLlm();
    await assert.rejects(
      generateJson('Pick one song'),
      /Codex CLI exited with code 42/
    );
  });
});
