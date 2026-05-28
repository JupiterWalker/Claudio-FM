const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const { synthesize } = require('../tts');

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
    });
}

function installFetchStub(assertRequest) {
  const previousFetch = global.fetch;
  global.fetch = async (url, request) => {
    assertRequest(url, request);
    return {
      ok: true,
      body: [Buffer.from(JSON.stringify({
        code: 20000000,
        data: Buffer.from('audio').toString('base64'),
      }))],
    };
  };
  return () => {
    global.fetch = previousFetch;
  };
}

test('Volcengine TTS uses a Chinese voice for Chinese station text', async () => {
  let outPath = '';
  const restoreFetch = installFetchStub((url, request) => {
    assert.equal(url, 'https://tts.example.test');
    assert.equal(request.headers['X-Api-Resource-Id'], 'seed-tts-2.0');
    const body = JSON.parse(request.body);
    assert.equal(body.req_params.speaker, 'zh_male_wennuanahu_uranus_bigtts');
  });

  try {
    await withEnv({
      TTS_PROVIDER: 'volcengine',
      VOLCENGINE_TTS_ENDPOINT: 'https://tts.example.test',
      VOLCENGINE_TTS_API_KEY: 'test-key',
      VOLCENGINE_TTS_RESOURCE_ID: 'english-resource',
      VOLCENGINE_TTS_VOICE_TYPE: 'en_female_nadia_tips_emo_v2_mars_bigtts',
      VOLCENGINE_TTS_RESOURCE_ID_ZH: undefined,
      VOLCENGINE_TTS_VOICE_TYPE_ZH: undefined,
      CALLER_TTS_RESOURCE_ID: undefined,
      CALLER_TTS_VOICE_TYPE: undefined,
    }, async () => {
      outPath = await synthesize(`中文电台测试 ${Date.now()}`);
      assert.ok(fs.existsSync(outPath));
    });
  } finally {
    restoreFetch();
    if (outPath) fs.rmSync(outPath, { force: true });
  }
});

test('Volcengine TTS keeps the configured English voice for English station text', async () => {
  let outPath = '';
  const restoreFetch = installFetchStub((url, request) => {
    assert.equal(url, 'https://tts.example.test');
    assert.equal(request.headers['X-Api-Resource-Id'], 'english-resource');
    const body = JSON.parse(request.body);
    assert.equal(body.req_params.speaker, 'en_female_nadia_tips_emo_v2_mars_bigtts');
  });

  try {
    await withEnv({
      TTS_PROVIDER: 'volcengine',
      VOLCENGINE_TTS_ENDPOINT: 'https://tts.example.test',
      VOLCENGINE_TTS_API_KEY: 'test-key',
      VOLCENGINE_TTS_RESOURCE_ID: 'english-resource',
      VOLCENGINE_TTS_VOICE_TYPE: 'en_female_nadia_tips_emo_v2_mars_bigtts',
    }, async () => {
      outPath = await synthesize(`English station test ${Date.now()}`);
      assert.ok(fs.existsSync(outPath));
    });
  } finally {
    restoreFetch();
    if (outPath) fs.rmSync(outPath, { force: true });
  }
});
