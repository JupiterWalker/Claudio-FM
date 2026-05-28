const assert = require('node:assert/strict');
const test = require('node:test');

const musicPath = require.resolve('../music');
const ytDlpPath = require.resolve('../music-yt-dlp');
const neteasePath = require.resolve('../music-netease');

function freshMusic({ ytDlp, netease }) {
  delete require.cache[musicPath];
  delete require.cache[ytDlpPath];
  delete require.cache[neteasePath];

  require.cache[ytDlpPath] = {
    id: ytDlpPath,
    filename: ytDlpPath,
    loaded: true,
    exports: ytDlp,
  };
  require.cache[neteasePath] = {
    id: neteasePath,
    filename: neteasePath,
    loaded: true,
    exports: netease,
  };

  return require('../music');
}

function withMusicProvider(value, fn) {
  const previous = process.env.MUSIC_PROVIDER;
  if (value === undefined) delete process.env.MUSIC_PROVIDER;
  else process.env.MUSIC_PROVIDER = value;

  return Promise.resolve()
    .then(fn)
    .finally(() => {
      if (previous === undefined) delete process.env.MUSIC_PROVIDER;
      else process.env.MUSIC_PROVIDER = previous;

      delete require.cache[musicPath];
      delete require.cache[ytDlpPath];
      delete require.cache[neteasePath];
    });
}

test('getTrack defaults to YouTube through yt-dlp without calling Netease', async () => {
  let ytQuery = '';
  let neteaseCalled = false;
  const music = freshMusic({
    ytDlp: {
      searchUrl: async () => 'https://www.youtube.com/watch?v=test',
      getTrack: async query => {
        ytQuery = query;
        return { title: 'Teardrop', artist: 'Massive Attack', streamUrl: 'https://audio.example/teardrop' };
      },
    },
    netease: {
      getTrack: async () => {
        neteaseCalled = true;
        return { title: 'Wrong source', streamUrl: 'https://netease.example/song' };
      },
    },
  });

  await withMusicProvider(undefined, async () => {
    const track = await music.getTrack('Massive Attack - Teardrop');

    assert.equal(ytQuery, 'Massive Attack - Teardrop');
    assert.equal(neteaseCalled, false);
    assert.equal(track.streamUrl, 'https://audio.example/teardrop');
  });
});

test('getTrack treats MUSIC_PROVIDER=youtube as the yt-dlp source', async () => {
  const music = freshMusic({
    ytDlp: {
      searchUrl: async () => 'https://www.youtube.com/watch?v=test',
      getTrack: async query => ({ query, streamUrl: 'https://audio.example/song' }),
    },
    netease: {
      getTrack: async () => {
        throw new Error('Netease should not be used for youtube provider');
      },
    },
  });

  await withMusicProvider('youtube', async () => {
    const track = await music.getTrack('Portishead - Roads');

    assert.equal(track.query, 'Portishead - Roads');
    assert.equal(track.streamUrl, 'https://audio.example/song');
  });
});

test('getTrack still supports explicit Netease provider for compatibility', async () => {
  const music = freshMusic({
    ytDlp: {
      searchUrl: async () => 'https://www.youtube.com/watch?v=test',
      getTrack: async () => {
        throw new Error('YouTube should not be used for netease provider');
      },
    },
    netease: {
      getTrack: async query => ({ query, streamUrl: 'https://netease.example/song' }),
    },
  });

  await withMusicProvider('netease', async () => {
    const track = await music.getTrack('Faye Wong - Eyes On Me');

    assert.equal(track.query, 'Faye Wong - Eyes On Me');
    assert.equal(track.streamUrl, 'https://netease.example/song');
  });
});
