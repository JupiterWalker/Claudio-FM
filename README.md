# Claudio FM

**Claudio FM is a private AI radio station.**

It acts like a real DJ: it chooses music, speaks on air, bridges between songs, and keeps the station going based on your taste and the current moment.

Claudio is not a playlist generator or a chatbot that waits for commands. Open it, press play, and it begins programming a small radio show for you. It reads the hour, remembers your recent listening, follows your music taste, and turns each DJ line into spoken audio before the next song comes in.

## Preview

![Claudio FM preview](assets/claudio-fm-preview.png)

## What It Feels Like

Claudio is for moments when you do not want to build a playlist.

You might be working, cooking, resting, or just letting the afternoon pass. Claudio listens to the shape of that moment and creates a short set: a few songs, a warm opening, a bridge between tracks, and sometimes silence when the music should speak for itself.

You can also call into the station through the request line. Claudio can play a caller-style voice moment, take your message as a signal, adjust the mood, and keep the broadcast moving.

## What Claudio Does

- Chooses songs based on your taste and the current time.
- Opens a set with DJ narration.
- Takes listener calls through the request line.
- Speaks in short, separate radio segments.
- Bridges between songs like a live host.
- Turns DJ lines into voice with TTS.
- Keeps music buffered so the station can continue.
- Lets you choose whether the DJ speaks English or Chinese.
- Lets you control DJ voice volume and music volume separately.

## Why It Is Different

Most music apps help you find tracks.

Claudio tries to make the music feel hosted.

The important part is not just recommendation. It is the feeling that someone is running the station: choosing what fits, saying only what helps, leaving space when needed, and carrying one song into the next.

## Inspiration

The creative inspiration for Claudio FM came from the Douyin creator **mmguo**.

## Running Locally

Install dependencies:

```bash
yarn install
```

Create your environment file:

```bash
cp .env.example .env
```

Then configure the services you want to use, such as your local LLM CLI, TTS provider, and music provider settings.

### Required Configuration

Claudio uses the local Codex CLI for DJ planning, YouTube through `yt-dlp` for music, and Volcengine Doubao Speech for the default DJ voice. Make sure `codex` and `yt-dlp` are available on your `PATH`, then fill these values in `.env`:

```bash
brew install yt-dlp
```

```bash
LLM_PROVIDER=codex_cli
CODEX_CLI_COMMAND=codex
MUSIC_PROVIDER=youtube
VOLCENGINE_TTS_API_KEY=your_volcengine_tts_api_key
VOLCENGINE_TTS_RESOURCE_ID=volc.service_type.10029
VOLCENGINE_TTS_VOICE_TYPE=en_female_nadia_tips_emo_v2_mars_bigtts
VOLCENGINE_TTS_RESOURCE_ID_ZH=seed-tts-2.0
VOLCENGINE_TTS_VOICE_TYPE_ZH=zh_male_wennuanahu_uranus_bigtts
```

- Activate and get the Doubao Speech API key from [Volcengine Speech Settings](https://console.volcengine.com/speech/new/setting/activate?ResourceID=volc.service_type.10029&projectName=default).
- Doubao Speech currently includes 20,000 free characters for the 1.0 voice model and 20,000 free characters for the 2.0 voice model.

Start Claudio:

```bash
yarn start
```

With the default `MUSIC_PROVIDER=youtube`, Claudio searches YouTube with
`yt-dlp` and does not start the NeteaseCloudMusicApi sidecar. If you explicitly
set `MUSIC_PROVIDER=netease` or `MUSIC_PROVIDER=auto`, startup checks the local
Netease sidecar. If `NETEASE_COOKIE` is not configured and no saved local cookie
exists, it creates a Netease QR login page at `data/netease/qr-login.html`.
Scan it with the Netease Cloud Music app to save a local cookie for later runs.
The saved cookie stays under `data/netease/` and is ignored by Git.

Open:

```text
http://localhost:8080
```

## Current Version

`v1.1.1` is the single-user radio version.

It is designed for one local listener experience: one private station, one local playback session, and one AI DJ running the show.

---

# Claudio FM 中文介绍

![Claudio FM preview](assets/claudio-fm-preview.png)

**Claudio FM 是一个 AI 私人电台。**

它会像真正的 DJ 一样，根据你的品味和当下时刻，自动选歌、播报、串场和续播。

Claudio 不是歌单生成器，也不是等你下命令的聊天机器人。你打开它，按下播放，它就开始为你经营一小段电台节目：看现在是什么时间，参考你的音乐品味和最近播放，挑几首合适的歌，再把每一句 DJ 播报转成语音，插入到音乐之间。

## 它听起来像什么

Claudio 适合那些你不想自己整理歌单的时刻。

你可能在工作、做饭、休息，或者只是想让下午自然流过去。Claudio 会感知这个时刻的气氛，生成一小组节目：几首歌，一段开场，歌曲之间的串场，以及在该安静时的留白。

你也可以通过 request line 打进电台。Claudio 会播放一段类似听众来电的声音，把你的话当成一个信号，调整接下来的节目方向，然后继续播下去。

## Claudio FM 会做什么

- 根据你的品味和当前时间选歌。
- 在一组歌曲开始前进行 DJ 开场。
- 通过 request line 接听听众来电。
- 把播报拆成一句一句的电台片段。
- 像真实主持人一样在歌曲之间串场。
- 用 TTS 把 DJ 文案转成语音。
- 自动补歌，让电台继续播下去。
- 支持选择 DJ 使用英文或中文播报。
- 支持分别控制 DJ 音量和音乐音量。

## 它特别在哪里

大多数音乐产品是在帮你找歌。

Claudio 想做的是让音乐“有人主持”。

重点不只是推荐了哪几首歌，而是有一个 AI DJ 在后台运营这档节目：判断当下适合什么，知道什么时候该说话，什么时候该安静，以及如何把一首歌自然带到下一首歌。

## 创意来源

Claudio FM 的创意灵感来自抖音博主 **mmguo**。

## 本地运行

安装依赖：

```bash
yarn install
```

创建环境变量文件：

```bash
cp .env.example .env
```

然后配置你要使用的本地 LLM CLI、TTS 和音乐服务。

### 必要配置

Claudio 默认使用本地 Codex CLI 生成 DJ 节目内容，通过 `yt-dlp` 从 YouTube 查找音乐，并使用火山引擎豆包语音生成 DJ 声音。请先确认 `codex` 和 `yt-dlp` 在 `PATH` 中可用，然后在 `.env` 中填写：

```bash
brew install yt-dlp
```

```bash
LLM_PROVIDER=codex_cli
CODEX_CLI_COMMAND=codex
MUSIC_PROVIDER=youtube
VOLCENGINE_TTS_API_KEY=你的_火山引擎_豆包语音_API_Key
VOLCENGINE_TTS_RESOURCE_ID=volc.service_type.10029
VOLCENGINE_TTS_VOICE_TYPE=en_female_nadia_tips_emo_v2_mars_bigtts
VOLCENGINE_TTS_RESOURCE_ID_ZH=seed-tts-2.0
VOLCENGINE_TTS_VOICE_TYPE_ZH=zh_male_wennuanahu_uranus_bigtts
```

- 豆包语音 API Key 激活与获取地址：[火山引擎语音技术控制台](https://console.volcengine.com/speech/new/setting/activate?ResourceID=volc.service_type.10029&projectName=default)。
- 豆包语音目前赠送 1.0 语音模型 20,000 字免费用量，以及 2.0 语音模型 20,000 字免费用量。

启动 Claudio：

```bash
yarn start
```

默认 `MUSIC_PROVIDER=youtube` 时，Claudio 会通过 `yt-dlp` 搜索 YouTube，
不会启动 NeteaseCloudMusicApi sidecar。如果显式设置 `MUSIC_PROVIDER=netease`
或 `MUSIC_PROVIDER=auto`，启动时才会检查本地网易云 sidecar。如果没有配置
`NETEASE_COOKIE`，也没有已保存的本地 cookie，它会生成网易云二维码登录页：
`data/netease/qr-login.html`。用网易云音乐 App 扫码后，Claudio 会把 cookie
保存到 `data/netease/`，后续启动自动复用；该目录会被 Git 忽略。

打开：

```text
http://localhost:8080
```

## 当前版本

`v1.1.1` 是单人电台版本。

它面向一个本地听众体验：一个私人电台、一个本地播放会话，以及一个在后台运营节目的 AI DJ。
