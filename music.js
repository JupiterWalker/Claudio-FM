const netease = require('./music-netease');
const ytDlp = require('./music-yt-dlp');

function normalizeProvider(provider) {
  const value = (provider || 'youtube').trim().toLowerCase();
  if (value === 'yt-dlp' || value === 'ytdlp' || value === 'youtube') return 'youtube';
  return value;
}

async function getStreamUrl(query) {
  const track = await getTrack(query);
  return track?.streamUrl || null;
}

async function getTrack(query) {
  const provider = normalizeProvider(process.env.MUSIC_PROVIDER);
  console.log(`[音乐] 搜索: "${query}" (来源: ${provider})`);

  if (provider === 'youtube') {
    const ytTrack = await ytDlp.getTrack(query);
    if (ytTrack) {
      console.log(`[音乐] YouTube 找到: ${ytTrack.title || query}`);
    } else {
      console.log(`[音乐] YouTube 未找到: "${query}"`);
    }
    return ytTrack;
  }

  if (provider === 'auto') {
    const ytTrack = await ytDlp.getTrack(query);
    if (ytTrack) {
      console.log(`[音乐] YouTube 找到: ${ytTrack.title || query}`);
      return ytTrack;
    }
    console.log(`[音乐] YouTube 未找到，尝试网易云…`);
  }

  if (provider === 'netease' || provider === 'auto') {
    const neteaseTrack = await netease.getTrack(query);
    if (neteaseTrack) {
      console.log(`[音乐] 网易云找到: ${neteaseTrack.title || query}`);
      return neteaseTrack;
    }
    if (provider === 'netease') {
      console.log(`[音乐] 网易云未找到: "${query}"`);
      return null;
    }
    console.log(`[音乐] 网易云未找到: "${query}"`);
    return null;
  }

  throw new Error(`Unsupported MUSIC_PROVIDER: ${provider}`);
}

module.exports = { getStreamUrl, getTrack, searchUrl: ytDlp.searchUrl };
