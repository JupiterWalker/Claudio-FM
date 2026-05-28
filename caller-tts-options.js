function optionalEnv(key) {
  return process.env[key] || undefined;
}

function callerTtsOptions() {
  return {
    role: 'caller',
    provider: process.env.CALLER_TTS_PROVIDER || process.env.TTS_PROVIDER || 'volcengine',
    apiKey: process.env.CALLER_TTS_API_KEY || process.env.VOLCENGINE_TTS_API_KEY,
    endpoint: process.env.CALLER_TTS_ENDPOINT || process.env.VOLCENGINE_TTS_ENDPOINT,
    resourceId: optionalEnv('CALLER_TTS_RESOURCE_ID'),
    voiceType: optionalEnv('CALLER_TTS_VOICE_TYPE'),
    voiceId: process.env.CALLER_FISH_VOICE_ID || process.env.FISH_VOICE_ID,
    voice: process.env.CALLER_KOKORO_VOICE || process.env.KOKORO_VOICE,
    model: process.env.CALLER_KOKORO_MODEL || process.env.KOKORO_MODEL,
    baseUrl: process.env.CALLER_KOKORO_API_BASE || process.env.KOKORO_API_BASE,
    format: process.env.CALLER_TTS_FORMAT || process.env.VOLCENGINE_TTS_FORMAT,
    sampleRate: process.env.CALLER_TTS_SAMPLE_RATE || process.env.VOLCENGINE_TTS_SAMPLE_RATE,
    additions: process.env.CALLER_TTS_ADDITIONS || process.env.VOLCENGINE_TTS_ADDITIONS,
  };
}

module.exports = { callerTtsOptions };
