const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const statePath = require.resolve('../state');

function freshState(dbPath) {
  const previous = process.env.CLAUDIO_DB_PATH;
  process.env.CLAUDIO_DB_PATH = dbPath;
  delete require.cache[statePath];
  const state = require('../state');

  return {
    state,
    cleanup() {
      if (previous === undefined) delete process.env.CLAUDIO_DB_PATH;
      else process.env.CLAUDIO_DB_PATH = previous;
      delete require.cache[statePath];
      fs.rmSync(path.dirname(dbPath), { recursive: true, force: true });
    },
  };
}

test('listPlays returns played tracks in pages with stable newest-first order', () => {
  const dbPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'claudio-state-')), 'state.sqlite');
  const { state, cleanup } = freshState(dbPath);

  try {
    state.addPlay({ title: 'First', artist: 'Artist A', source_url: 'https://audio.example/1' });
    state.addPlay({ title: 'Second', artist: 'Artist B', source_url: 'https://audio.example/2' });
    state.addPlay({ title: 'Third', artist: 'Artist C', source_url: 'https://audio.example/3' });

    assert.deepEqual(
      state.listPlays({ limit: 2, offset: 0 }).map(track => track.title),
      ['Third', 'Second']
    );
    assert.deepEqual(
      state.listPlays({ limit: 2, offset: 2 }).map(track => track.title),
      ['First']
    );
  } finally {
    cleanup();
  }
});
