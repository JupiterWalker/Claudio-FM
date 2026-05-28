const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const DEFAULT_TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS || 120000);
const DEFAULT_PROVIDER = process.env.LLM_PROVIDER || 'codex_cli';
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';
const DEEPSEEK_REASONING_EFFORT = process.env.DEEPSEEK_REASONING_EFFORT || '';
const DEEPSEEK_THINKING = process.env.DEEPSEEK_THINKING || '';
const DEFAULT_CODEX_COMMAND = process.env.CODEX_CLI_COMMAND || 'codex';
const DEFAULT_CODEX_ARGS = [
  'exec',
  '--ignore-user-config',
  '--sandbox',
  'read-only',
  '--ephemeral',
  '--color',
  'never',
];

async function generateJson(prompt, options = {}) {
  const provider = options.provider || DEFAULT_PROVIDER;
  if (provider === 'codex_cli' || provider === 'codex') return callCodexCli(prompt, options);
  if (provider === 'deepseek') return callDeepSeek(prompt, options);
  if (provider === 'claude_cli') return callClaudeCli(prompt, options);
  throw new Error(`Unsupported LLM_PROVIDER: ${provider}`);
}

function splitArgs(value) {
  if (!value) return [];
  return value.split(/\s+/).map(arg => arg.trim()).filter(Boolean);
}

function buildCodexPrompt(prompt) {
  return [
    'You are Claudio FM. Return strict JSON only.',
    'Your entire response must be one JSON object. Use these fields when relevant: title, say, play, segments, intros, reason, mode.',
    'Do not include Markdown, code fences, commentary, or tool calls.',
    '',
    prompt,
  ].join('\n');
}

function hasOutputFileArg(args) {
  return args.includes('--output-last-message') || args.includes('-o');
}

function buildCodexArgs(outputFile, options = {}) {
  const configuredArgs = Array.isArray(options.args)
    ? options.args
    : splitArgs(options.args || process.env.CODEX_CLI_ARGS);
  const args = configuredArgs.length ? [...configuredArgs] : [...DEFAULT_CODEX_ARGS];
  const model = options.model || process.env.CODEX_MODEL || '';

  if (model && !args.includes('--model') && !args.includes('-m')) {
    args.push('--model', model);
  }
  if (!hasOutputFileArg(args)) {
    args.push('--output-last-message', outputFile);
  }
  if (!args.includes('-')) {
    args.push('-');
  }

  return args;
}

function tempOutputFile() {
  const suffix = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return path.join(os.tmpdir(), `claudio-codex-${suffix}.txt`);
}

function readFileIfPresent(file) {
  try {
    if (!fs.existsSync(file)) return '';
    return fs.readFileSync(file, 'utf8').trim();
  } catch {
    return '';
  }
}

function removeFileIfPresent(file) {
  try {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  } catch {}
}

function callCodexCli(prompt, options = {}) {
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const command = options.command || process.env.CODEX_CLI_COMMAND || DEFAULT_CODEX_COMMAND;
  const outputFile = tempOutputFile();
  const args = buildCodexArgs(outputFile, options);
  const wrappedPrompt = buildCodexPrompt(prompt);
  const startAt = Date.now();

  console.log(`[LLM:codex_cli] 调用中，command ${command}，prompt ${prompt.length} 字符…`);

  return new Promise((resolve, reject) => {
    let settled = false;
    const proc = spawn(command, args, {
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    function finishReject(err) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      removeFileIfPresent(outputFile);
      reject(err);
    }

    function finishResolve(raw) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const elapsed = ((Date.now() - startAt) / 1000).toFixed(1);
      const parsed = parseResponse(raw);
      logParsedResponse('codex_cli', elapsed, parsed, raw);
      removeFileIfPresent(outputFile);
      resolve(parsed);
    }

    const timer = setTimeout(() => {
      proc.kill();
      const stderrPreview = stderr.trim().slice(-800);
      console.error(`[LLM:codex_cli] 超时（${Math.round(timeoutMs / 1000)}s），已终止；prompt ${prompt.length} 字符`);
      if (stderrPreview) console.error(`[LLM:codex_cli] stderr 摘要: ${stderrPreview}`);
      finishReject(new Error('Codex CLI subprocess timed out'));
    }, timeoutMs);

    proc.stdout.on('data', d => { stdout += d.toString(); });
    proc.stderr.on('data', d => {
      stderr += d.toString();
      process.stderr.write(d);
    });
    proc.stdin.on('error', () => {});
    proc.stdin.end(wrappedPrompt);

    proc.on('close', (code, signal) => {
      if (settled) return;
      const output = readFileIfPresent(outputFile) || stdout.trim();
      if (code !== 0) {
        const exitDetail = signal ? `signal ${signal}` : `code ${code}`;
        const stderrPreview = stderr.trim().slice(-800);
        const suffix = stderrPreview ? `: ${stderrPreview}` : '';
        finishReject(new Error(`Codex CLI exited with ${exitDetail}${suffix}`));
        return;
      }
      if (!output) console.warn('[LLM:codex_cli] 警告：返回内容为空');
      finishResolve(output);
    });

    proc.on('error', err => {
      console.error('[LLM:codex_cli] 进程错误:', err.message);
      finishReject(new Error(`Failed to start Codex CLI "${command}": ${err.message}`));
    });
  });
}

async function callDeepSeek(prompt, options = {}) {
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY not set');
  }

  const OpenAI = await loadOpenAI();
  const client = new OpenAI({
    baseURL: process.env.DEEPSEEK_BASE_URL || DEEPSEEK_BASE_URL,
    apiKey: process.env.DEEPSEEK_API_KEY,
  });
  const model = options.model || process.env.DEEPSEEK_MODEL || DEEPSEEK_MODEL;
  const startAt = Date.now();
  console.log(`[LLM:deepseek] 调用中，model ${model}，prompt ${prompt.length} 字符…`);

  const request = {
    model,
    messages: [
      { role: 'system', content: 'You are Claudio FM. Return strict JSON only.' },
      { role: 'user', content: prompt },
    ],
    stream: false,
  };
  if (DEEPSEEK_THINKING) request.thinking = { type: DEEPSEEK_THINKING };
  if (DEEPSEEK_REASONING_EFFORT) request.reasoning_effort = DEEPSEEK_REASONING_EFFORT;

  const completion = await withTimeout(
    client.chat.completions.create(request),
    options.timeoutMs || DEFAULT_TIMEOUT_MS,
    `DeepSeek request timed out after ${Math.round((options.timeoutMs || DEFAULT_TIMEOUT_MS) / 1000)}s`
  );
  const elapsed = ((Date.now() - startAt) / 1000).toFixed(1);
  const raw = completion.choices?.[0]?.message?.content?.trim() || '';
  const parsed = parseResponse(raw);
  logParsedResponse('deepseek', elapsed, parsed, raw);
  return parsed;
}

async function loadOpenAI() {
  try {
    const mod = await import('openai');
    return mod.default || mod.OpenAI || mod;
  } catch (err) {
    throw new Error('OpenAI SDK not installed. Run `yarn add openai` or `npm install openai`.');
  }
}

function callClaudeCli(prompt, options = {}) {
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const startAt = Date.now();
  console.log(`[LLM:claude_cli] 调用中，prompt ${prompt.length} 字符…`);
  return new Promise((resolve, reject) => {
    const proc = spawn('claude', ['-p', prompt], {
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      proc.kill();
      const stderrPreview = stderr.trim().slice(-800);
      console.error(`[LLM:claude_cli] 超时（${Math.round(timeoutMs / 1000)}s），已终止；prompt ${prompt.length} 字符`);
      if (stderrPreview) console.error(`[LLM:claude_cli] stderr 摘要: ${stderrPreview}`);
      reject(new Error('Claude subprocess timed out'));
    }, timeoutMs);

    proc.stdout.on('data', d => { stdout += d.toString(); });
    proc.stderr.on('data', d => {
      stderr += d.toString();
      process.stderr.write(d);
    });

    proc.on('close', () => {
      clearTimeout(timer);
      const elapsed = ((Date.now() - startAt) / 1000).toFixed(1);
      const raw = stdout.trim();
      const parsed = parseResponse(raw);
      logParsedResponse('claude_cli', elapsed, parsed, raw);
      if (!raw) console.warn('[LLM:claude_cli] 警告：返回内容为空');
      resolve(parsed);
    });

    proc.on('error', err => {
      clearTimeout(timer);
      console.error('[LLM:claude_cli] 进程错误:', err.message);
      reject(err);
    });
  });
}

function withTimeout(promise, timeoutMs, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function parseResponse(raw) {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        title: parsed.title || '',
        say: parsed.say || '',
        play: Array.isArray(parsed.play) ? parsed.play : [],
        segments: Array.isArray(parsed.segments) ? parsed.segments : [],
        intros: Array.isArray(parsed.intros) ? parsed.intros : [],
        reason: parsed.reason || '',
        mode: parsed.mode || '',
      };
    } catch {}
  }
  return { title: '', say: raw || 'Okay.', play: [], segments: [], intros: [], reason: '', segue: '', mode: '' };
}

function logParsedResponse(provider, elapsed, parsed, raw) {
  const firstSegment = parsed.segments?.find(s => s?.text)?.text || parsed.say || '';
  const preview = firstSegment.slice(0, 60);
  console.log(`[LLM:${provider}] 响应 (${elapsed}s) → 「${parsed.title || '无标题'}」| ${parsed.play?.length || 0} 首 | segments: ${parsed.segments?.length || 0} | "${preview}${preview.length >= 60 ? '…' : ''}"`);
  if (!raw) console.warn(`[LLM:${provider}] 警告：返回内容为空`);
}

module.exports = { generateJson, parseResponse };
