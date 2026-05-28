const assert = require('node:assert/strict');
const test = require('node:test');

const optionsPath = require.resolve('../caller-tts-options');

function freshOptions() {
  delete require.cache[optionsPath];
  return require('../caller-tts-options');
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
      delete require.cache[optionsPath];
    });
}

test('caller TTS does not force station Volcengine voice when caller voice is unset', async () => {
  await withEnv({
    TTS_PROVIDER: 'volcengine',
    VOLCENGINE_TTS_API_KEY: 'station-key',
    VOLCENGINE_TTS_ENDPOINT: 'https://tts.example.test',
    VOLCENGINE_TTS_RESOURCE_ID: 'english-resource',
    VOLCENGINE_TTS_VOICE_TYPE: 'en_female_nadia_tips_emo_v2_mars_bigtts',
    CALLER_TTS_PROVIDER: undefined,
    CALLER_TTS_API_KEY: undefined,
    CALLER_TTS_ENDPOINT: undefined,
    CALLER_TTS_RESOURCE_ID: undefined,
    CALLER_TTS_VOICE_TYPE: undefined,
  }, async () => {
    const { callerTtsOptions } = freshOptions();
    const options = callerTtsOptions();

    assert.equal(options.role, 'caller');
    assert.equal(options.provider, 'volcengine');
    assert.equal(options.apiKey, 'station-key');
    assert.equal(options.endpoint, 'https://tts.example.test');
    assert.equal(options.resourceId, undefined);
    assert.equal(options.voiceType, undefined);
  });
});

test('caller TTS keeps explicit caller Volcengine voice overrides', async () => {
  await withEnv({
    TTS_PROVIDER: 'volcengine',
    VOLCENGINE_TTS_RESOURCE_ID: 'station-resource',
    VOLCENGINE_TTS_VOICE_TYPE: 'station-voice',
    CALLER_TTS_RESOURCE_ID: 'caller-resource',
    CALLER_TTS_VOICE_TYPE: 'caller-voice',
  }, async () => {
    const { callerTtsOptions } = freshOptions();
    const options = callerTtsOptions();

    assert.equal(options.resourceId, 'caller-resource');
    assert.equal(options.voiceType, 'caller-voice');
  });
});
