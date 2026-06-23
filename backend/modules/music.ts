import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { spawn } from "child_process";
import { sendJson, CCM_DIR, PUBLIC_DIR } from "../utils";
import { loadMusicConfig, saveMusicConfig } from "../db";
import { loadOrchestratorConfig, publicOrchestratorConfig } from "./group-orchestrator";

// B站相关常量与模块级变量
const BILI_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
let wbiMixinKey = "";
let wbiCacheTime = 0;
let buvid3 = "";

const WBI_MIXIN_TABLE = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35,
  27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13,
  37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4,
  22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52
];

const MUSIC_DIR = path.join(CCM_DIR, "music");
const MUSIC_REMOTE_COMMAND_FILE = path.join(CCM_DIR, "music-remote-command.json");
if (!fs.existsSync(MUSIC_DIR)) fs.mkdirSync(MUSIC_DIR, { recursive: true });

function saveMusicRemoteCommand(command: any) {
  const payload = {
    id: `music_${Date.now().toString(36)}_${crypto.randomBytes(2).toString("hex")}`,
    created_at: new Date().toISOString(),
    consumed: false,
    ...command,
  };
  fs.writeFileSync(MUSIC_REMOTE_COMMAND_FILE, JSON.stringify(payload, null, 2), "utf-8");
  return payload;
}

function loadMusicRemoteCommand() {
  try {
    if (!fs.existsSync(MUSIC_REMOTE_COMMAND_FILE)) return null;
    return JSON.parse(fs.readFileSync(MUSIC_REMOTE_COMMAND_FILE, "utf-8"));
  } catch {
    return null;
  }
}

function loadMusicAgentConfig() {
  const llm = loadOrchestratorConfig();
  const music = loadMusicConfig();
  return {
    ...llm,
    proxy: music.proxy || "",
  };
}

function publicMusicAgentConfig() {
  const config = loadMusicAgentConfig();
  return {
    ...publicOrchestratorConfig(config),
    source: "orchestrator",
    sourceLabel: "系统设置 / 统一大模型配置",
  };
}

function getMixinKey(orig: string): string {
  return WBI_MIXIN_TABLE.map(n => orig[n]).join("").substring(0, 32);
}

async function ensureBuvid3(): Promise<string> {
  if (buvid3) return buvid3;
  try {
    const res = await fetch("https://www.bilibili.com", {
      method: "GET",
      headers: { "User-Agent": BILI_UA },
      redirect: "follow",
    });
    let cookieStrings: string[] = [];
    if (typeof res.headers.getSetCookie === "function") {
      cookieStrings = res.headers.getSetCookie();
    } else {
      const rawCookie = res.headers.get("set-cookie");
      if (rawCookie) {
        cookieStrings = rawCookie.split(/,\s*/);
      }
    }
    for (const c of cookieStrings) {
      const match = c.match(/buvid3=([^;]+)/);
      if (match) {
        buvid3 = match[1];
        console.log("[WBI] 获取 buvid3 成功:", buvid3);
        return buvid3;
      }
    }
  } catch (e: any) {
    console.log("[WBI] 获取 buvid3 失败:", e.message);
  }
  buvid3 = crypto.randomUUID() + "infoc";
  return buvid3;
}

async function refreshWbiKey() {
  try {
    await ensureBuvid3();
    const res = await fetch("https://api.bilibili.com/x/web-interface/nav", {
      headers: { "User-Agent": BILI_UA, "Referer": "https://www.bilibili.com", "Cookie": `buvid3=${buvid3}` }
    });
    const text = await res.text();
    if (!text.trim().startsWith("{")) {
      console.log("[WBI] nav 返回非 JSON:", text.substring(0, 80));
      return;
    }
    const data = JSON.parse(text);
    const img = data?.data?.wbi_img?.img_url || "";
    const sub = data?.data?.wbi_img?.sub_url || "";
    const imgKey = img.split("/").pop()?.split(".")[0] || "";
    const subKey = sub.split("/").pop()?.split(".")[0] || "";
    wbiMixinKey = getMixinKey(imgKey + subKey);
    wbiCacheTime = Date.now();
    console.log("[WBI] key 已刷新:", wbiMixinKey.substring(0, 8) + "...");
  } catch (e: any) {
    console.log("[WBI] 刷新失败:", e.message);
  }
}

async function ensureWbiKey() {
  if (!wbiMixinKey || Date.now() - wbiCacheTime > 12 * 60 * 60 * 1000) {
    await refreshWbiKey();
  }
}

function signBiliParams(params: Record<string, string>): string {
  const wts = Math.floor(Date.now() / 1000);
  params.wts = String(wts);
  const sorted = Object.keys(params).sort().map(k => `${k}=${encodeURIComponent(params[k])}`).join("&");
  const hash = crypto.createHash("md5").update(sorted + wbiMixinKey).digest("hex");
  params.w_rid = hash;
  return Object.keys(params).map(k => `${k}=${encodeURIComponent(params[k])}`).join("&");
}

async function biliSearch(keyword: string): Promise<any[]> {
  try {
    await ensureBuvid3();
    await ensureWbiKey();

    const params: Record<string, string> = {
      search_type: "video",
      keyword: keyword,
      page: "1",
      order: "totalrank"
    };

    const signedQs = signBiliParams(params);
    const cfg = loadMusicConfig();

    let oldHttpProxy = process.env.HTTP_PROXY;
    let oldHttpsProxy = process.env.HTTPS_PROXY;
    if (cfg.proxy) {
      process.env.HTTP_PROXY = cfg.proxy;
      process.env.HTTPS_PROXY = cfg.proxy;
    }

    const url = `https://api.bilibili.com/x/web-interface/search/type?${signedQs}`;

    try {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": BILI_UA,
          "Referer": "https://www.bilibili.com/",
          "Cookie": `buvid3=${buvid3}`,
          "Accept": "application/json, text/plain, */*",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
          "Origin": "https://www.bilibili.com",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-site"
        }
      });

      if (cfg.proxy) {
        if (oldHttpProxy) process.env.HTTP_PROXY = oldHttpProxy; else delete process.env.HTTP_PROXY;
        if (oldHttpsProxy) process.env.HTTPS_PROXY = oldHttpsProxy; else delete process.env.HTTPS_PROXY;
      }

      const text = await res.text();
      if (!text.trim().startsWith("{")) {
        console.log("[BiliSearch] non-JSON:", text.substring(0, 100));
        return [];
      }
      const data = JSON.parse(text);
      if (data.code !== 0) {
        console.log("[BiliSearch] API error:", data.code, data.message);
        return [];
      }
      const resultList = data.data?.result;
      if (!Array.isArray(resultList)) {
        console.log("[BiliSearch] result is not an array");
        return [];
      }
      const results = resultList.map((item: any) => ({
        bvid: item.bvid,
        title: (item.title || "").replace(/<[^>]*>/g, ""),
        author: item.author || "",
        duration: item.duration || "",
        play: item.play || 0,
        pic: item.pic ? (item.pic.startsWith("//") ? "https:" + item.pic : item.pic) : "",
      }));
      console.log("[BiliSearch] found", results.length, "results");
      return results;
    } catch (err) {
      if (cfg.proxy) {
        if (oldHttpProxy) process.env.HTTP_PROXY = oldHttpProxy; else delete process.env.HTTP_PROXY;
        if (oldHttpsProxy) process.env.HTTPS_PROXY = oldHttpsProxy; else delete process.env.HTTPS_PROXY;
      }
      throw err;
    }
  } catch (e: any) {
    console.log("[BiliSearch] error:", e.message);
    return [];
  }
}

async function neteaseSearch(keyword: string): Promise<any[]> {
  try {
    const searchUrl = `https://music.163.com/api/search/get/web?s=${encodeURIComponent(keyword)}&type=1&limit=20`;
    const searchRes = await fetch(searchUrl, {
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://music.163.com/",
        "Content-Type": "application/x-www-form-urlencoded",
      }
    });
    const data: any = await searchRes.json();
    const songs = data?.result?.songs || [];
    const results = songs.map((song: any) => {
      const artists = (song.artists || [])
        .map((a: any) => a.name)
        .filter((name: any) => name && name !== "undefined" && name !== "null")
        .join("/");
      const album = song.album?.name || "";
      const durationMs = song.duration || 0;
      const minutes = Math.floor(durationMs / 60000);
      const seconds = Math.floor((durationMs % 60000) / 1000);
      const durationStr = `${minutes}:${String(seconds).padStart(2, "0")}`;
      const picUrl = song.album?.picUrl || "";
      return {
        songId: song.id,
        title: song.name || "",
        artist: artists || "未知艺术家",
        album,
        duration: durationStr,
        pic: picUrl ? picUrl + "?param=120y120" : "",
      };
    });
    console.log("[NeteaseSearch] found", results.length, "results for:", keyword);
    return results;
  } catch (e: any) {
    console.log("[NeteaseSearch] error:", e.message);
    return [];
  }
}

async function getBiliAudioUrl(bvid: string): Promise<string> {
  await ensureBuvid3();
  await ensureWbiKey();

  const params = { bvid };
  const signedQs = signBiliParams(params);
  const viewUrl = `https://api.bilibili.com/x/web-interface/view?${signedQs}`;
  const viewRes = await fetch(viewUrl, {
    headers: {
      "User-Agent": BILI_UA,
      "Referer": "https://www.bilibili.com/",
      "Cookie": `buvid3=${buvid3}`,
      "Accept": "application/json, text/plain, */*"
    }
  });
  const viewData: any = await viewRes.json();
  if (viewData?.code !== 0) {
    throw new Error(`获取视频信息失败: ${viewData?.message || "未知错误"}`);
  }
  const cid = viewData?.data?.cid;
  if (!cid) {
    throw new Error("视频不存在或未能获取到播放标志 cid");
  }

  const playParams = {
    bvid,
    cid: String(cid),
    qn: "16",
    fnver: "0",
    fnval: "16",
    otype: "json"
  };
  const playQs = signBiliParams(playParams);
  const playUrl = `https://api.bilibili.com/x/player/wbi/playurl?${playQs}`;
  const playRes = await fetch(playUrl, {
    headers: {
      "User-Agent": BILI_UA,
      "Referer": "https://www.bilibili.com/",
      "Cookie": `buvid3=${buvid3}`,
      "Accept": "application/json, text/plain, */*"
    }
  });
  const playData: any = await playRes.json();
  if (playData?.code !== 0) {
    throw new Error(`获取播放地址失败: ${playData?.message || "未知错误"}`);
  }
  const audioList = playData?.data?.dash?.audio;
  if (!audioList || audioList.length === 0) {
    throw new Error("未找到对应的音频流直链");
  }
  return audioList[0].baseUrl || audioList[0].backupUrl[0];
}

function parseMusicFilename(filename: string) {
  const name = filename.replace(/\.[^.]+$/, "");
  const bvidMatch = name.match(/(BV[\w]+)/i);
  const bvid = bvidMatch ? bvidMatch[1] : undefined;
  const cleaned = name.replace(/\[BV[\w]+\]/gi, "").replace(/BV[\w]+/gi, "").trim();
  const parts = cleaned.split(" - ");
  let artist = "未知艺术家", title = cleaned;
  if (parts.length >= 2) {
    artist = parts[0].trim();
    title = parts.slice(1).join(" - ").trim();
  }
  if (!title) title = name;
  return { artist, title, bvid };
}

function getMp3Cover(filePath: string): { mimeType: string, data: Buffer } | null {
  try {
    const fd = fs.openSync(filePath, "r");
    const stat = fs.fstatSync(fd);
    const tagSizeHeader = Buffer.alloc(10);
    fs.readSync(fd, tagSizeHeader, 0, 10, 0);

    if (tagSizeHeader.toString("ascii", 0, 3) !== "ID3") {
      fs.closeSync(fd);
      return null;
    }

    const version = tagSizeHeader[3];
    const tagSize = (tagSizeHeader[6] << 21) | (tagSizeHeader[7] << 14) | (tagSizeHeader[8] << 7) | tagSizeHeader[9];
    
    const tagBuffer = Buffer.alloc(tagSize);
    fs.readSync(fd, tagBuffer, 0, tagSize, 10);
    fs.closeSync(fd);

    let offset = 0;
    while (offset < tagSize - 10) {
      let frameId = "";
      if (version === 2) {
        frameId = tagBuffer.toString("ascii", offset, offset + 3);
      } else {
        frameId = tagBuffer.toString("ascii", offset, offset + 4);
      }

      if (!frameId || frameId[0] === "\0" || /[^A-Z0-9]/.test(frameId)) {
        break;
      }

      let frameSize = 0;
      let headerSize = 0;
      if (version === 2) {
        frameSize = (tagBuffer[offset + 3] << 16) | (tagBuffer[offset + 4] << 8) | tagBuffer[offset + 5];
        headerSize = 6;
      } else if (version === 3) {
        frameSize = tagBuffer.readUInt32BE(offset + 4);
        headerSize = 10;
      } else if (version === 4) {
        const b0 = tagBuffer[offset + 4];
        const b1 = tagBuffer[offset + 5];
        const b2 = tagBuffer[offset + 6];
        const b3 = tagBuffer[offset + 7];
        frameSize = (b0 << 21) | (b1 << 14) | (b2 << 7) | b3;
        headerSize = 10;
      }

      if (frameSize <= 0 || offset + headerSize + frameSize > tagSize) {
        break;
      }

      const isAPIC = frameId === "APIC" || frameId === "PIC";
      if (isAPIC) {
        const frameContent = tagBuffer.subarray(offset + headerSize, offset + headerSize + frameSize);
        let mimeType = "";
        let pictureDataOffset = 0;

        if (frameId === "APIC") {
          const encoding = frameContent[0];
          let mimeEnd = 1;
          while (mimeEnd < frameContent.length && frameContent[mimeEnd] !== 0) {
            mimeEnd++;
          }
          mimeType = frameContent.toString("ascii", 1, mimeEnd);
          
          let descStart = mimeEnd + 2;
          let descEnd = descStart;
          if (encoding === 1 || encoding === 2) {
            while (descEnd < frameContent.length - 1 && !(frameContent[descEnd] === 0 && frameContent[descEnd + 1] === 0)) {
              descEnd += 2;
            }
            pictureDataOffset = descEnd + 2;
          } else {
            while (descEnd < frameContent.length && frameContent[descEnd] !== 0) {
              descEnd++;
            }
            pictureDataOffset = descEnd + 1;
          }
        } else {
          const encoding = frameContent[0];
          const imageFormat = frameContent.toString("ascii", 1, 4);
          mimeType = imageFormat === "PNG" ? "image/png" : "image/jpeg";
          
          let descStart = 5;
          let descEnd = descStart;
          if (encoding === 1) {
            while (descEnd < frameContent.length - 1 && !(frameContent[descEnd] === 0 && frameContent[descEnd + 1] === 0)) {
              descEnd += 2;
            }
            pictureDataOffset = descEnd + 2;
          } else {
            while (descEnd < frameContent.length && frameContent[descEnd] !== 0) {
              descEnd++;
            }
            pictureDataOffset = descEnd + 1;
          }
        }

        const pictureData = frameContent.subarray(pictureDataOffset);
        return { mimeType, data: pictureData };
      }

      offset += headerSize + frameSize;
    }
  } catch (e) {
    console.error("[GetMp3Cover] error:", e);
  }
  return null;
}

const downloadingPaths = new Set<string>();
let activeCoverDownloads = 0;
const MAX_CONCURRENT_COVER_DOWNLOADS = 1;

async function downloadCoverInBackground(cachePath: string) {
  if (downloadingPaths.has(cachePath)) return;
  downloadingPaths.add(cachePath);
  try {
    for (const url of ["http://www.dmoe.cc/random.php", "http://api.btstu.cn/sjbz/api.php?lx=dongman&format=images", "http://t.alcy.cc/acg", "http://api.amrno.com/api/acg"]) {
      try {
        const resp = await fetch(url, {
          signal: AbortSignal.timeout(5000)
        });
        if (resp.ok) {
          const buffer = Buffer.from(await resp.arrayBuffer());
          fs.writeFileSync(cachePath, buffer);
          break;
        }
      } catch {}
    }
  } catch {} finally {
    downloadingPaths.delete(cachePath);
  }
}

function searchLocalMusic(keyword: string) {
  const q = keyword.toLowerCase();
  return fs.readdirSync(MUSIC_DIR)
    .filter(f => /\.(mp3|wav|ogg|m4a|flac|aac)$/i.test(f))
    .filter(f => f.toLowerCase().includes(q))
    .map((f, i) => {
      const stat = fs.statSync(path.join(MUSIC_DIR, f));
      const { artist, title, bvid } = parseMusicFilename(f);
      return { id: i, filename: f, title, artist, bvid, pic: `/api/music/cover?file=${encodeURIComponent(f)}`, size: stat.size };
    });
}

function extractMusicIntent(msg: string) {
  const lower = msg.toLowerCase();
  const playMatch = msg.match(/(?:播放|放一首?|听一首?|来一首?|来点|来些)(.+)/);
  if (playMatch) return { type: "play", keyword: playMatch[1].trim() };
  const searchMatch = msg.match(/(?:搜索|找|查找|有没有)(.+)/);
  if (searchMatch) return { type: "search", keyword: searchMatch[1].trim() };
  if (/(?:转换|转码|下载|转成|转为)/.test(lower)) return { type: "convert", keyword: "" };
  const cleaned = msg.replace(/[，。！？、]/g, " ").replace(/我想听|帮我找|推荐|一些|一点|的歌|的音乐|吧|呗|听听/g, "").trim();
  if (cleaned.length >= 2) return { type: "search", keyword: cleaned };
  return { type: "help", keyword: "" };
}

function getMusicHelpText(chatMode: string) {
  if (chatMode === "local") {
    return `🎵 本地音乐助手\n\n你可以说：\n• "播放 周杰伦" - 搜索并播放\n• "搜索 轻音乐" - 搜索本地曲库\n• "来首钢琴曲" - 自然语言搜索\n\n将 MP3 文件放入 ~/.cc-connect/music/ 目录`;
  }
  if (chatMode === "netease") {
    return `🎵 网易云音乐助手\n\n你可以说：\n• "我想听周杰伦的歌" - 搜索网易云\n• "搜索 轻音乐" - 搜索网易云音乐\n• "来首适合学习的音乐" - 智能推荐\n\n点击搜索结果可一键下载为本地 MP3`;
  }
  return `🎵 B站音乐助手\n\n你可以说：\n• "我想听周杰伦的歌" - 搜索B站\n• "搜索 轻音乐" - 搜索B站视频\n• "来首适合编程的音乐" - 智能推荐\n\n点击搜索结果可一键转码为本地 MP3`;
}

function writeSse(res: any, data: any) {
  if (!res || res.writableEnded || res.destroyed) return;
  try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch {}
}

const AGENT_TOOLS_LIST = [
  {
    name: "search_bilibili",
    description: "搜索B站视频。当用户想听音乐、看视频时使用此工具搜索。",
    input_schema: { type: "object", properties: { keyword: { type: "string", description: "搜索关键词" } }, required: ["keyword"] }
  },
  {
    name: "search_local",
    description: "搜索本地音乐库。当用户想播放本地已有的音乐时使用。",
    input_schema: { type: "object", properties: { keyword: { type: "string", description: "搜索关键词" } }, required: ["keyword"] }
  },
  {
    name: "search_netease",
    description: "搜索网易云音乐。当用户想从网易云搜索歌曲时使用此工具。",
    input_schema: { type: "object", properties: { keyword: { type: "string", description: "搜索关键词" } }, required: ["keyword"] }
  }
];

async function execToolCall(toolName: string, toolInput: any) {
  if (toolName === "search_bilibili") {
    const results = await biliSearch(toolInput.keyword || "");
    return results.slice(0, 5).map((r: any, i: number) =>
      `${i + 1}. ${r.title} - ${r.author} (${r.duration}) [BV: ${r.bvid}]`
    ).join("\n") || "没有找到相关结果";
  }
  if (toolName === "search_local") {
    const results = searchLocalMusic(toolInput.keyword || "");
    return results.slice(0, 5).map((t: any, i: number) =>
      `${i + 1}. ${t.title} - ${t.artist} (文件: ${t.filename})`
    ).join("\n") || "本地没有找到相关音乐";
  }
  if (toolName === "search_netease") {
    const results = await neteaseSearch(toolInput.keyword || "");
    return results.slice(0, 8).map((r: any, i: number) =>
      `${i + 1}. ${r.title} - ${(r.artist && r.artist !== "undefined" && r.artist !== "null" ? r.artist : "") || "未知歌手"} (${r.duration}) [ID: ${r.songId}]`
    ).join("\n") || "网易云没有找到相关音乐";
  }
  return "未知工具";
}

async function callClaudeAgent(cfg: any, system: string, messages: any[], res: any, chatMode: string) {
  const apiUrl = (cfg.apiUrl || "https://api.anthropic.com").replace(/\/$/, "");
  const format = String(cfg.format || "auto");
  const isAnthropicCompat = format === "anthropic"
    || format === "anthropic-compatible"
    || (format === "auto" && (apiUrl.includes("anthropic") || apiUrl.endsWith("/anthropic")));
  const isOpenAICompat = !isAnthropicCompat;
  const tools = chatMode === "local"
    ? AGENT_TOOLS_LIST.filter((t: any) => t.name === "search_local")
    : chatMode === "netease"
      ? AGENT_TOOLS_LIST.filter((t: any) => t.name === "search_netease" || t.name === "search_local")
      : AGENT_TOOLS_LIST;

  if (isOpenAICompat) {
    await callOpenAICompat(cfg, system, messages, tools, res);
  } else {
    await callAnthropicNative(cfg, system, messages, tools, res);
  }
}

async function callOpenAICompat(cfg: any, system: string, messages: any[], tools: any[], res: any) {
  const apiUrl = (cfg.apiUrl || "").replace(/\/$/, "");
  const model = cfg.model || "claude-sonnet-4-20250514";

  let fetchUrl: string;
  if (apiUrl.includes("/chat/completions")) fetchUrl = apiUrl;
  else if (apiUrl.endsWith("/v1")) fetchUrl = `${apiUrl}/chat/completions`;
  else if (apiUrl.includes("/v1/")) fetchUrl = apiUrl;
  else fetchUrl = `${apiUrl}/v1/chat/completions`;

  const toolDesc = tools.map(t => `- ${t.name}: ${t.description}`).join("\n");
  const enhancedSystem = system + `\n\n可用工具：\n${toolDesc}\n\n当你需要搜索时，输出格式：\n<tool_call>\n{"name": "工具名", "arguments": {"keyword": "关键词"}}\n</tool_call>\n\n搜索结果会自动返回给你，然后你再回复用户。`;

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${cfg.apiKey}`,
  };
  const openaiMessages = [{ role: "system", content: enhancedSystem }, ...messages];
  const body = JSON.stringify({ model, max_tokens: 1024, messages: openaiMessages, stream: true });

  try {
    const apiRes = await fetch(fetchUrl, { method: "POST", headers, body });
    if (!apiRes.ok) {
      const t = await apiRes.text();
      res.write(`data: ${JSON.stringify({ type: "error", text: `API ${apiRes.status}: ${t.substring(0, 200)}` })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
      res.end();
      return;
    }
    const reader = apiRes.body?.getReader();
    if (!reader) return;
    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";

    const read = (): Promise<void> => reader.read().then(({ done, value }) => {
      if (done) {
        const toolMatch = fullText.match(/<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/);
        if (toolMatch) {
          try {
            const toolCall = JSON.parse(toolMatch[1]);
            const toolName = toolCall.name;
            const toolArgs = toolCall.arguments || {};
            res.write(`data: ${JSON.stringify({ type: "tool_call", name: toolName, args: toolArgs })}\n\n`);
            execToolCall(toolName, toolArgs).then(toolResult => {
              res.write(`data: ${JSON.stringify({ type: "tool_result", name: toolName, result: toolResult })}\n\n`);
              const newMessages = [...messages,
                { role: "assistant", content: fullText },
                { role: "user", content: `[工具结果: ${toolName}]\n${toolResult}\n\n请根据搜索结果回复用户。` }
              ];
              callOpenAICompat(cfg, system, newMessages, [], res);
            });
            return;
          } catch {}
        }
        res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
        res.end();
        return;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") continue;
        try {
          const parsed = JSON.parse(data);
          if (parsed.choices?.[0]?.delta?.content) {
            const text = parsed.choices[0].delta.content;
            fullText += text;
            res.write(`data: ${JSON.stringify({ type: "text", text })}\n\n`);
          }
        } catch {}
      }
      return read();
    });
    await read();
  } catch (e: any) {
    res.write(`data: ${JSON.stringify({ type: "error", text: `连接失败: ${e.message}` })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();
  }
}

async function callAnthropicNative(cfg: any, system: string, messages: any[], tools: any[], res: any) {
  const apiUrl = (cfg.apiUrl || "https://api.anthropic.com").replace(/\/$/, "");
  const model = cfg.model || "claude-sonnet-4-20250514";
  const fetchUrl = apiUrl.endsWith("/v1/messages")
    ? apiUrl
    : apiUrl.endsWith("/v1")
      ? `${apiUrl}/messages`
      : `${apiUrl}/v1/messages`;

  const headers = {
    "Content-Type": "application/json",
    "x-api-key": cfg.apiKey,
    "anthropic-version": "2023-06-01",
  };
  const toolDefs = tools.length > 0 ? { tools } : {};
  const body = JSON.stringify({ model, max_tokens: 1024, system, messages, stream: true, ...toolDefs });

  try {
    const apiRes = await fetch(fetchUrl, { method: "POST", headers, body });
    if (!apiRes.ok) {
      const t = await apiRes.text();
      res.write(`data: ${JSON.stringify({ type: "error", text: `API ${apiRes.status}: ${t.substring(0, 200)}` })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
      res.end();
      return;
    }
    const reader = apiRes.body?.getReader();
    if (!reader) return;
    const decoder = new TextDecoder();
    let buffer = "";
    let toolCallId = "";
    let toolName = "";
    let toolInputJson = "";

    const read = (): Promise<void> => reader.read().then(({ done, value }) => {
      if (done) {
        if (toolName && toolInputJson) {
          try {
            const toolInput = JSON.parse(toolInputJson);
            res.write(`data: ${JSON.stringify({ type: "tool_call", name: toolName, args: toolInput })}\n\n`);
            execToolCall(toolName, toolInput).then(toolResult => {
              res.write(`data: ${JSON.stringify({ type: "tool_result", name: toolName, result: toolResult })}\n\n`);
              const newMessages = [
                ...messages,
                { role: "assistant", content: [{ type: "tool_use", id: toolCallId, name: toolName, input: toolInput }] },
                { role: "user", content: [{ type: "tool_result", tool_use_id: toolCallId, content: toolResult }] }
              ];
              callAnthropicNative(cfg, system, newMessages, tools, res);
            });
          } catch {}
          return;
        }
        res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
        res.end();
        return;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === "content_block_start" && parsed.content_block?.type === "tool_use") {
            toolCallId = parsed.content_block.id;
            toolName = parsed.content_block.name;
            toolInputJson = "";
          }
          if (parsed.type === "content_block_delta") {
            if (parsed.delta?.type === "input_json_delta") {
              toolInputJson += parsed.delta.partial_json || "";
            }
            if (parsed.delta?.text) {
              res.write(`data: ${JSON.stringify({ type: "text", text: parsed.delta.text })}\n\n`);
            }
          }
        } catch {}
      }
      return read();
    });
    await read();
  } catch (e: any) {
    res.write(`data: ${JSON.stringify({ type: "error", text: `连接失败: ${e.message}` })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();
  }
}

interface MusicCtx {
  getMusicPetAgent: () => any;
  setMusicPetState: (state: string, detail?: string, track?: any) => void;
  broadcastPetSpeech: (agent: string, payload: any) => void;
  MUSIC_PET_AGENT_NAME: string;
}

export function handleMusicApi(
  pathname: string,
  req: any,
  res: any,
  parsed: any,
  ctx: MusicCtx
): boolean {
  if (!pathname.startsWith("/api/music")) return false;

  if (pathname === "/api/music/remote-command" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const keyword = String(payload.keyword || payload.query || "").trim();
        if (!keyword) return sendJson(res, { success: false, error: "缺少音乐关键词" }, 400);
        const command = saveMusicRemoteCommand({ type: "play", keyword, source: payload.source || "global-agent" });
        sendJson(res, { success: true, command });
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message || "创建音乐播放指令失败" }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/music/remote-command" && req.method === "GET") {
    const command = loadMusicRemoteCommand();
    sendJson(res, { success: true, command: command && !command.consumed ? command : null });
    return true;
  }

  if (pathname === "/api/music/remote-command/consume" && req.method === "POST") {
    const command = loadMusicRemoteCommand();
    if (command) {
      command.consumed = true;
      command.consumed_at = new Date().toISOString();
      fs.writeFileSync(MUSIC_REMOTE_COMMAND_FILE, JSON.stringify(command, null, 2), "utf-8");
    }
    sendJson(res, { success: true });
    return true;
  }

  if (pathname === "/api/music/pet-state" && req.method === "GET") {
    sendJson(res, { success: true, agent: ctx.getMusicPetAgent() });
    return true;
  }

  if (pathname === "/api/music/pet-state" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const data = JSON.parse(body || "{}");
        ctx.setMusicPetState(data.state || "idle", data.detail || "", data.track || null);
        sendJson(res, { success: true, agent: ctx.getMusicPetAgent() });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/music/pet-speech" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const data = JSON.parse(body || "{}");
        ctx.broadcastPetSpeech(ctx.MUSIC_PET_AGENT_NAME, {
          role: data.role || "assistant",
          text: data.text || "",
          mode: data.mode || "replace",
          final: !!data.final,
          source: data.source || "music",
        });
        sendJson(res, { success: true });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/music/list" && req.method === "GET") {
    try {
      const files = fs.readdirSync(MUSIC_DIR)
        .filter(f => /\.(mp3|wav|ogg|m4a|flac|aac)$/i.test(f))
        .map((f, i) => {
          const stat = fs.statSync(path.join(MUSIC_DIR, f));
          const { artist, title, bvid } = parseMusicFilename(f);
          return { id: i, filename: f, title, artist, bvid, pic: `/api/music/cover?file=${encodeURIComponent(f)}`, size: stat.size, modified: stat.mtime.toISOString() };
        })
        .sort((a, b) => a.title.localeCompare(b.title));
      sendJson(res, { success: true, tracks: files });
    } catch (e) {
      sendJson(res, { success: true, tracks: [] });
    }
    return true;
  }

  if (pathname === "/api/music/stream" && req.method === "GET") {
    const filename = parsed.query.file;
    if (!filename || filename.includes("..")) return sendJson(res, { error: "无效文件名" }, 400);
    const filePath = path.join(MUSIC_DIR, filename);
    if (!fs.existsSync(filePath)) return sendJson(res, { error: "文件不存在" }, 404);
    const stat = fs.statSync(filePath);
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      ".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg",
      ".m4a": "audio/mp4", ".flac": "audio/flac", ".aac": "audio/aac"
    };
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": end - start + 1,
        "Content-Type": mimeTypes[ext] || "audio/mpeg",
        "Access-Control-Allow-Origin": "*",
      });
      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        "Content-Length": stat.size,
        "Content-Type": mimeTypes[ext] || "audio/mpeg",
        "Access-Control-Allow-Origin": "*",
      });
      fs.createReadStream(filePath).pipe(res);
    }
    return true;
  }

  if (pathname === "/api/music/search-netease" && req.method === "GET") {
    const query = parsed.query.q || "";
    if (!query) {
      sendJson(res, { success: true, results: [] });
      return true;
    }
    neteaseSearch(query as string).then(results => {
      sendJson(res, { success: true, results });
    }).catch((e: Error) => {
      sendJson(res, { success: false, error: e.message });
    });
    return true;
  }

  if (pathname === "/api/music/search" && req.method === "GET") {
    const query = parsed.query.q || "";
    if (!query) {
      sendJson(res, { success: true, results: [] });
      return true;
    }
    biliSearch(query as string).then(results => {
      sendJson(res, { success: true, results });
    }).catch((e: Error) => {
      sendJson(res, { success: false, error: e.message });
    });
    return true;
  }

  if (pathname === "/api/music/download" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", async () => {
      try {
        const { bvid, title, author } = JSON.parse(body);
        if (!bvid) return sendJson(res, { error: "缺少 bvid" }, 400);
        const safeName = `${author || "unknown"} - ${title || bvid} [${bvid}]`.replace(/[<>:"/\\|?*]/g, "_").substring(0, 100);
        const outputFile = path.join(MUSIC_DIR, `${safeName}.mp3`);
        if (fs.existsSync(outputFile)) return sendJson(res, { success: true, message: "文件已存在" });

        let audioUrl: string;
        try {
          audioUrl = await getBiliAudioUrl(bvid);
        } catch (e: any) {
          return sendJson(res, { success: false, error: `解析失败: ${e.message}` });
        }

        const headers = `User-Agent: ${BILI_UA}\r\nReferer: https://www.bilibili.com/\r\n`;
        const child = spawn("ffmpeg", [
          "-headers", headers,
          "-i", audioUrl,
          "-y",
          "-q:a", "0",
          outputFile
        ], { stdio: "ignore", windowsHide: true });
        child.on("close", (code) => {
          if (code === 0 && fs.existsSync(outputFile)) {
            sendJson(res, { success: true, filename: path.basename(outputFile) });
          } else {
            sendJson(res, { success: false, error: "下载转码失败，请确保安装了 ffmpeg" });
          }
        });
        child.on("error", () => {
          sendJson(res, { success: false, error: "ffmpeg 未安装或未加入环境变量" });
        });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/music/config" && req.method === "GET") {
    sendJson(res, {
      success: true,
      config: publicMusicAgentConfig()
    });
    return true;
  }

  if (pathname === "/api/music/config" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const updates = JSON.parse(body);
        const cfg = loadMusicConfig();
        if (updates.proxy !== undefined) cfg.proxy = updates.proxy;
        saveMusicConfig(cfg);
        sendJson(res, { success: true, config: publicMusicAgentConfig() });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/music/agent" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { message, mode: chatMode, history } = JSON.parse(body);
        const cfg = loadMusicAgentConfig();
        if (!cfg.enabled) {
          return sendJson(res, { success: false, error: "请先在系统设置启用统一大模型配置" });
        }
        if (!cfg.apiKey) {
          return sendJson(res, { success: false, error: "请先到系统设置 → 统一大模型配置 中填写 API Key" });
        }
        if (!cfg.model) {
          return sendJson(res, { success: false, error: "请先到系统设置 → 统一大模型配置 中填写模型名称" });
        }

        const systemPrompt = `你是一个音乐助手 Agent。用户会告诉你想听什么音乐，你需要帮助他们搜索和推荐。

你有三个工具可用：
1. search_bilibili(keyword) - 搜索B站视频
2. search_local(keyword) - 搜索本地音乐库
3. search_netease(keyword) - 搜索网易云音乐

当前模式: \${chatMode === "local" ? "本地模式（搜索本地曲库）" : chatMode === "netease" ? "网易云模式（搜索网易云音乐）" : "B站模式（搜索B站并转码）"}

## 推荐输出格式（严格遵守）
当你向用户推荐歌曲时，先用自然语言简要介绍，然后 **必须** 将曲目放在独立的 \`\`\`tracks 代码块中。格式如下：

### B站模式：
\`\`\`tracks
[
  {"bvid":"BV1xxxxx","title":"视频标题","author":"UP主","duration":"4:32"}
]
\`\`\`

### 网易云模式：
\`\`\`tracks
[
  {"songId":12345,"title":"歌曲名","artist":"歌手名","duration":"4:32"}
]
\`\`\`

### 本地模式：
\`\`\`tracks
[
  {"filename":"文件名.mp3","title":"歌曲名称","artist":"歌手"}
]
\`\`\`

关键规则：
1. 代码块标记必须用 \`\`\`tracks 开头，\`\`\` 结尾，各占独立一行。
2. 数据必须是合法 JSON 数组，必须从工具返回的结果中提取字段（不要编造或修改 uri、bvid、filename、songId 等核心标识）。
3. 如果用户只是闲聊、提问，不需要输出 tracks 代码块。
4. 回复使用中文，简洁友好。`;

        const messages = [];
        for (const msg of (history || []).slice(-10)) {
          if (msg.role === "operator") messages.push({ role: "user", content: msg.content });
          else if (msg.role === "agent") messages.push({ role: "assistant", content: msg.content });
        }
        messages.push({ role: "user", content: message });

        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "Access-Control-Allow-Origin": "*",
        });

        const intent = extractMusicIntent(message);
        let toolContext = "";
        if (intent.type === "search" || intent.type === "play") {
          if (chatMode === "local") {
            const localResults = searchLocalMusic(intent.keyword);
            toolContext = `\n\n[工具结果] 本地搜索 "${intent.keyword}" 找到 ${localResults.length} 首：\n${localResults.slice(0, 5).map((t, i) => `${i + 1}. ${t.title} - ${t.artist} (文件: ${t.filename})`).join("\n")}`;
            messages[messages.length - 1].content += toolContext;
            callClaudeAgent(cfg, systemPrompt, messages, res, chatMode);
          } else if (chatMode === "netease") {
            neteaseSearch(intent.keyword).then((neteaseResults: any[]) => {
              toolContext = `\n\n[工具结果] 网易云搜索 "${intent.keyword}" 找到 ${neteaseResults.length} 个结果：\n${neteaseResults.slice(0, 8).map((r: any, i: number) => `${i + 1}. ${r.title} - ${(r.artist && r.artist !== "undefined" && r.artist !== "null" ? r.artist : "") || "未知歌手"} (${r.duration}) [ID: ${r.songId}]`).join("\n")}`;
              messages[messages.length - 1].content += toolContext;
              callClaudeAgent(cfg, systemPrompt, messages, res, chatMode);
            }).catch(() => {
              messages[messages.length - 1].content += "\n\n[工具结果] 网易云搜索失败";
              callClaudeAgent(cfg, systemPrompt, messages, res, chatMode);
            });
            return;
          } else {
            biliSearch(intent.keyword).then((biliResults: any[]) => {
              toolContext = `\n\n[工具结果] B站搜索 "${intent.keyword}" 找到 ${biliResults.length} 个结果：\n${biliResults.slice(0, 5).map((r: any, i: number) => `${i + 1}. ${r.title} - ${r.author} (${r.duration}) [BV: ${r.bvid}]`).join("\n")}`;
              messages[messages.length - 1].content += toolContext;
              callClaudeAgent(cfg, systemPrompt, messages, res, chatMode);
            }).catch(() => {
              messages[messages.length - 1].content += "\n\n[工具结果] B站搜索失败";
              callClaudeAgent(cfg, systemPrompt, messages, res, chatMode);
            });
            return;
          }
        } else {
          callClaudeAgent(cfg, systemPrompt, messages, res, chatMode);
        }
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  // === AI 歌曲金句接口 ===
  if (pathname === "/api/music/song-quote" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: any) => body += chunk);
    req.on("end", async () => {
      try {
        const { title, artist } = JSON.parse(body);
        if (!title) {
          return sendJson(res, { success: false, error: "Missing title" }, 400);
        }
        const cleanTitle = String(title).toLowerCase();
        const cfg = loadOrchestratorConfig();
        if (cfg.enabled && cfg.apiKey && cfg.model) {
          try {
            const prompt = `你是一个音乐感悟助手。请根据歌曲"${title}"（歌手：${artist || "未知"}），用一句话写出听这首歌时的心情感悟，要有诗意，20字以内，不要引号。`;
            const llmRes: any = await fetch(cfg.apiUrl + "/chat/completions", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
              body: JSON.stringify({ model: cfg.model, messages: [{ role: "user", content: prompt }], max_tokens: 60, temperature: 0.9 }),
              signal: AbortSignal.timeout(8000)
            });
            const llmData: any = await llmRes.json();
            const quote = llmData?.choices?.[0]?.message?.content?.trim();
            if (quote) return sendJson(res, { success: true, quote });
          } catch (_) {}
        }
        // Fallback
        const GENERAL_QUOTES = [
          "音符流淌的瞬间，世界突然变得温柔了起来。",
          "愿这首歌的旋律，能轻轻抚平你心底所有的褶皱。",
          "有些话说不出，但音乐已帮你唱完了所有的思绪。",
          "在旋律的缝隙里，藏着对生活最真挚的热爱与期待。",
          "音乐是心灵的避难所，今晚就在这旋律中安心放空吧。",
          "每一个跃动的音符，都是时间写给你的无声情书。",
          "任凭窗外风雨飘摇，耳机里永远有属于你的晴空。",
          "生活虽有颠簸，但音乐总会在合适的角落给你拥抱。",
          "沉浸在旋律里，让那些疲惫在温柔的歌声中渐渐消散。",
          "每一首歌都是一个漂流瓶，恰好在这个瞬间被你拾起。"
        ];
        sendJson(res, { success: true, quote: GENERAL_QUOTES[Math.floor(Math.random() * GENERAL_QUOTES.length)] });
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message }, 500);
      }
    });
    return true;
  }

  // === 歌曲封面同源代理（支持 MP3 解析与二次元哈希缓存） ===
  if (pathname === "/api/music/cover" && req.method === "GET") {
    const filename = parsed.query.file;
    if (!filename || filename.includes("..")) {
      res.writeHead(400);
      res.end("Bad Request");
      return true;
    }
    const filePath = path.join(MUSIC_DIR, filename);
    if (!fs.existsSync(filePath)) {
      res.writeHead(404);
      res.end("Not Found");
      return true;
    }



    const COVERS_CACHE_DIR = path.join(MUSIC_DIR, ".covers");
    if (!fs.existsSync(COVERS_CACHE_DIR)) {
      fs.mkdirSync(COVERS_CACHE_DIR, { recursive: true });
    }
    
    const hash = crypto.createHash("md5").update(filename).digest("hex");
    const cachePath = path.join(COVERS_CACHE_DIR, `${hash}.jpg`);

    if (fs.existsSync(cachePath)) {
      const buffer = fs.readFileSync(cachePath);
      res.writeHead(200, {
        "Content-Type": "image/jpeg",
        "Content-Length": buffer.length,
        "Cache-Control": "public, max-age=31536000"
      });
      res.end(buffer);
      return true;
    }

    (async () => {
      const cfg = loadMusicConfig();
      let oldHttpProxy = process.env.HTTP_PROXY;
      let oldHttpsProxy = process.env.HTTPS_PROXY;
      if (cfg.proxy) {
        process.env.HTTP_PROXY = cfg.proxy;
        process.env.HTTPS_PROXY = cfg.proxy;
      }

      const cleanProxy = () => {
        if (cfg.proxy) {
          if (oldHttpProxy) process.env.HTTP_PROXY = oldHttpProxy; else delete process.env.HTTP_PROXY;
          if (oldHttpsProxy) process.env.HTTPS_PROXY = oldHttpsProxy; else delete process.env.HTTPS_PROXY;
        }
      };

      const fallbackToDefault = () => {
        cleanProxy();
        const animeCoversDir = path.join(PUBLIC_DIR, "anime_covers");
        if (fs.existsSync(animeCoversDir)) {
          const files = fs.readdirSync(animeCoversDir).filter(f => f.endsWith(".jpg") || f.endsWith(".png"));
          if (files.length > 0) {
            let sum = 0;
            for (let i = 0; i < hash.length; i++) {
              sum += hash.charCodeAt(i);
            }
            const index = sum % files.length;
            const chosenFile = files[index];
            const animePath = path.join(animeCoversDir, chosenFile);
            if (fs.existsSync(animePath)) {
              const buffer = fs.readFileSync(animePath);
              try {
                fs.writeFileSync(cachePath, buffer);
              } catch (e) {
                // Ignore cache write error
              }
              res.writeHead(200, {
                "Content-Type": chosenFile.endsWith(".png") ? "image/png" : "image/jpeg",
                "Content-Length": buffer.length,
                "Cache-Control": "public, max-age=31536000"
              });
              res.end(buffer);
              return;
            }
          }
        }

        const defaultPath = path.join(PUBLIC_DIR, "room_window_bg.png");
        if (fs.existsSync(defaultPath)) {
          const buffer = fs.readFileSync(defaultPath);
          res.writeHead(200, {
            "Content-Type": "image/png",
            "Content-Length": buffer.length,
            "Cache-Control": "public, max-age=60"
          });
          res.end(buffer);
        } else {
          res.writeHead(404);
          res.end("Not Found");
        }
      };

      try {
        let success = false;
        let imgBuffer: Buffer | null = null;
        let mimeType = "image/jpeg";

        for (const url of ["http://www.dmoe.cc/random.php", "http://api.btstu.cn/sjbz/api.php?lx=dongman&format=images", "http://t.alcy.cc/acg", "http://api.amrno.com/api/acg"]) {
          try {
            const resp = await fetch(url, {
              signal: AbortSignal.timeout(4500)
            });
            if (resp.ok) {
              imgBuffer = Buffer.from(await resp.arrayBuffer());
              mimeType = resp.headers.get("content-type") || "image/jpeg";
              success = true;
              break;
            }
          } catch (e: any) {
            // 忽略单次连接失败
          }
        }

        if (success && imgBuffer) {
          fs.writeFileSync(cachePath, imgBuffer);
          cleanProxy();
          res.writeHead(200, {
            "Content-Type": mimeType,
            "Content-Length": imgBuffer.length,
            "Cache-Control": "public, max-age=31536000"
          });
          res.end(imgBuffer);
        } else {
          fallbackToDefault();
        }
      } catch (err: any) {
        fallbackToDefault();
      }
    })();
    return true;
  }

  // === 代理获取天气接口（三级高可用容灾版） ===
  if (pathname === "/api/music/weather" && req.method === "GET") {
    const lat = parsed.query.lat;
    const lon = parsed.query.lon;
    
    (async () => {
      const cfg = loadMusicConfig();
      let oldHttpProxy = process.env.HTTP_PROXY;
      let oldHttpsProxy = process.env.HTTPS_PROXY;
      if (cfg.proxy) {
        process.env.HTTP_PROXY = cfg.proxy;
        process.env.HTTPS_PROXY = cfg.proxy;
      }
      
      const cleanProxy = () => {
        if (cfg.proxy) {
          if (oldHttpProxy) process.env.HTTP_PROXY = oldHttpProxy; else delete process.env.HTTP_PROXY;
          if (oldHttpsProxy) process.env.HTTPS_PROXY = oldHttpsProxy; else delete process.env.HTTPS_PROXY;
        }
      };

      const isHealthy = (str: string) => {
        if (!str) return false;
        const s = str.trim();
        return s.length > 0 && s.length <= 25 && !s.includes("<") && !s.includes("{") && !s.includes("style");
      };

      const translateWeather = (raw: string) => {
        let cleaned = raw.trim().replace(/\+/g, "");
        const weatherMap: Record<string, string> = {
          "partly cloudy": "多云",
          "cloudy": "多云",
          "sunny": "晴",
          "clear": "晴",
          "overcast": "阴",
          "light rain": "小雨",
          "heavy rain": "大雨",
          "rain": "雨",
          "snow": "雪",
          "smoky haze": "霾",
          "haze": "霾",
          "fog": "雾",
          "mist": "雾",
          "windy": "有风",
          "thunderstorm": "雷阵雨"
        };
        let translated = cleaned;
        for (const eng of Object.keys(weatherMap)) {
          const reg = new RegExp(eng, "gi");
          translated = translated.replace(reg, weatherMap[eng]);
        }
        return translated;
      };

      // 阶段 1：HTTPS wttr.in
      try {
        let url = "https://wttr.in/?m&format=%C+%t&lang=zh";
        if (lat && lon) {
          url = `https://wttr.in/${lat},${lon}?m&format=%C+%t&lang=zh`;
        }
        const resp = await fetch(url, {
          headers: { "User-Agent": "curl/8.4.0" },
          signal: AbortSignal.timeout(3500)
        });
        const text = await resp.text();
        const translated = translateWeather(text);
        if (isHealthy(translated)) {
          cleanProxy();
          return sendJson(res, { success: true, weather: translated });
        }
      } catch (err: any) {
        console.warn("[Weather Proxy] Stage 1 (HTTPS wttr.in) failed:", err.message);
      }

      // 阶段 2：HTTP wttr.in (绕过 SSL 阻断)
      try {
        let url = "http://wttr.in/?m&format=%C+%t&lang=zh";
        if (lat && lon) {
          url = `http://wttr.in/${lat},${lon}?m&format=%C+%t&lang=zh`;
        }
        const resp = await fetch(url, {
          headers: { "User-Agent": "curl/8.4.0" },
          signal: AbortSignal.timeout(3500)
        });
        const text = await resp.text();
        const translated = translateWeather(text);
        if (isHealthy(translated)) {
          cleanProxy();
          return sendJson(res, { success: true, weather: translated });
        }
      } catch (err: any) {
        console.warn("[Weather Proxy] Stage 2 (HTTP wttr.in) failed:", err.message);
      }

      // 阶段 3：国内 IP-API + 科大讯飞天气
      try {
        const ipResp = await fetch("http://ip-api.com/json/?lang=zh-CN", {
          signal: AbortSignal.timeout(3000)
        });
        const ipData: any = await ipResp.json();
        if (ipData && ipData.status === "success" && ipData.city) {
          const city = ipData.city.replace(/市$/, "");
          const weatherUrl = `http://autodev.openspeech.cn/api/v1/weather?openId=12345678&city=${encodeURIComponent(city)}`;
          const wResp = await fetch(weatherUrl, {
            signal: AbortSignal.timeout(3000)
          });
          const wData: any = await wResp.json();
          if (wData && wData.code === 0 && wData.data && wData.data.list && wData.data.list.length > 0) {
            const item = wData.data.list[0];
            const wText = item.weather || "";
            const tempText = (item.temp && item.temp !== 0) ? `${item.temp}°C` : `${item.low}~${item.high}°C`;
            const result = `${wText} ${tempText}`.trim();
            if (isHealthy(result)) {
              cleanProxy();
              return sendJson(res, { success: true, weather: result });
            }
          }
        }
      } catch (err: any) {
        console.error("[Weather Proxy] Stage 3 (Domestic API Fallback) failed:", err.message);
      }

      cleanProxy();
      sendJson(res, { success: false, error: "所有天气接口获取均失败" });
    })();
    return true;
  }

  if (pathname === "/api/music/song-emotion" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: any) => body += chunk);
    req.on("end", async () => {
      try {
        const { title, artist } = JSON.parse(body);
        if (!title) {
          return sendJson(res, { success: false, error: "Missing title" }, 400);
        }
        const emotionLabels = ["惬意", "治愈", "温柔", "怀念", "放空", "舒缓", "思念", "平静", "动感", "感动"];
        const cfg = loadOrchestratorConfig();
        if (cfg.enabled && cfg.apiKey && cfg.model) {
          try {
            const prompt = `你是一个音乐情绪分析助手。根据歌曲名"${title}"（歌手：${artist || "未知"}），从以下标签选一个最符合的情绪，只输出标签本身：${emotionLabels.join("、")}`;
            const llmRes: any = await fetch(cfg.apiUrl + "/chat/completions", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
              body: JSON.stringify({ model: cfg.model, messages: [{ role: "user", content: prompt }], max_tokens: 20, temperature: 0.7 }),
              signal: AbortSignal.timeout(8000)
            });
            const llmData: any = await llmRes.json();
            const raw = llmData?.choices?.[0]?.message?.content?.trim() || "";
            const matched = emotionLabels.find(e => raw.includes(e));
            if (matched) return sendJson(res, { success: true, emotion: matched });
          } catch (_) {}
        }
        const t = String(title).toLowerCase();
        let fallback = "惬意";
        if (t.includes("晚安") || t.includes("夜")) fallback = "舒缓";
        else if (t.includes("思念") || t.includes("想你")) fallback = "思念";
        else if (t.includes("再见") || t.includes("离别")) fallback = "怀念";
        else if (t.includes("治愈") || t.includes("温暖")) fallback = "治愈";
        else if (t.includes("快乐") || t.includes("开心")) fallback = "动感";
        else fallback = emotionLabels[Math.floor(Math.random() * emotionLabels.length)];
        sendJson(res, { success: true, emotion: fallback });
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message }, 500);
      }
    });
    return true;
  }

  // === AI 歌曲金句接口 ===
  if (pathname === "/api/music/song-quote" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: any) => body += chunk);
    req.on("end", async () => {
      try {
        const { title, artist } = JSON.parse(body);
        if (!title) {
          return sendJson(res, { success: false, error: "Missing title" }, 400);
        }
        const cfg = loadOrchestratorConfig();
        if (cfg.enabled && cfg.apiKey && cfg.model) {
          try {
            const prompt = `你是一个音乐感悟助手。根据歌曲"${title}"（歌手：${artist || "未知"}），用一句话写出听这首歌的心情感悟，要有诗意，20字以内，不要引号。`;
            const llmRes = await fetch(cfg.apiUrl + "/chat/completions", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
              body: JSON.stringify({ model: cfg.model, messages: [{ role: "user", content: prompt }], max_tokens: 60, temperature: 0.9 }),
              signal: AbortSignal.timeout(8000)
            });
            const llmData: any = await llmRes.json();
            const quote = llmData?.choices?.[0]?.message?.content?.trim();
            if (quote) return sendJson(res, { success: true, quote });
          } catch (_) {}
        }
        const QUOTES = [
          "音符流淌的瞬间，世界突然变得温柔了起来。",
          "愿这首歌的旋律，能轻轻抚平你心底所有的褶皱。",
          "有些话说不出，但音乐已帮你唱完了所有的思绪。",
          "在旋律的缝隙里，藏着对生活最真挚的热爱与期待。",
          "音乐是心灵的避难所，今晚就在这旋律中安心放空吧。",
          "每一个跃动的音符，都是时间写给你的无声情书。",
          "任凭窗外风雨飘摇，耳机里永远有属于你的晴空。",
          "生活虽有颠簸，但音乐总会在合适的角落给你拥抱。",
          "沉浸在旋律里，让那些疲惫在温柔的歌声中渐渐消散。",
          "每一首歌都是一个漂流瓶，恰好在这个瞬间被你拾起。"
        ];
        sendJson(res, { success: true, quote: QUOTES[Math.floor(Math.random() * QUOTES.length)] });
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message }, 500);
      }
    });
    return true;
  }

  // === 歌曲情绪分析接口 ===
  if (pathname === "/api/music/song-emotion" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: any) => body += chunk);
    req.on("end", async () => {
      try {
        const { title, artist } = JSON.parse(body);
        if (!title) {
          return sendJson(res, { success: false, error: "Missing title" }, 400);
        }
        const emotionLabels = ["惬意", "治愈", "温柔", "怀念", "放空", "舒缓", "思念", "平静", "动感", "感动"];
        const cfg = loadOrchestratorConfig();
        if (cfg.enabled && cfg.apiKey && cfg.model) {
          try {
            const prompt = `你是音乐情绪分析助手。根据歌曲名"${title}"（歌手：${artist || "未知"}），从以下标签选一个最符合的情绪，只输出标签本身，不要解释：${emotionLabels.join("、")}`;
            const llmRes = await fetch(cfg.apiUrl + "/chat/completions", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
              body: JSON.stringify({ model: cfg.model, messages: [{ role: "user", content: prompt }], max_tokens: 20, temperature: 0.7 }),
              signal: AbortSignal.timeout(8000)
            });
            const llmData: any = await llmRes.json();
            const raw = llmData?.choices?.[0]?.message?.content?.trim() || "";
            const matched = emotionLabels.find(e => raw.includes(e));
            if (matched) return sendJson(res, { success: true, emotion: matched });
          } catch (_) {}
        }
        const t = String(title).toLowerCase();
        let fallback = "惬意";
        if (t.includes("晚安") || t.includes("夜")) fallback = "舒缓";
        else if (t.includes("思念") || t.includes("想你")) fallback = "思念";
        else if (t.includes("再见") || t.includes("离别")) fallback = "怀念";
        else if (t.includes("治愈") || t.includes("温暖")) fallback = "治愈";
        else if (t.includes("快乐") || t.includes("开心")) fallback = "动感";
        else fallback = emotionLabels[Math.floor(Math.random() * emotionLabels.length)];
        sendJson(res, { success: true, emotion: fallback });
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message }, 500);
      }
    });
    return true;
  }

  if (pathname === "/api/music/chat" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { message, mode: chatMode } = JSON.parse(body);
        const intent = extractMusicIntent(message);
        const result: any = { intent: intent.type, keyword: intent.keyword };

        if (intent.type === "search") {
          if (chatMode === "local") {
            const localResults = searchLocalMusic(intent.keyword);
            result.localResults = localResults;
            result.reply = localResults.length > 0
              ? `在本地找到 ${localResults.length} 首匹配的音乐：`
              : `本地没有找到"${intent.keyword}"相关音乐，试试切换到 B站模式？`;
            sendJson(res, { success: true, ...result });
          } else if (chatMode === "netease") {
            neteaseSearch(intent.keyword).then((neteaseResults: any[]) => {
              result.neteaseResults = neteaseResults;
              result.reply = neteaseResults.length > 0
                ? `在网易云找到 ${neteaseResults.length} 个相关结果：`
                : `网易云没有找到"${intent.keyword}"相关的结果，换个关键词试试？`;
              sendJson(res, { success: true, ...result });
            }).catch((e: Error) => {
              result.reply = `搜索出错: ${e.message}`;
              sendJson(res, { success: true, ...result });
            });
          } else {
            biliSearch(intent.keyword).then((biliResults: any[]) => {
              result.biliResults = biliResults;
              result.reply = biliResults.length > 0
                ? `在B站找到 ${biliResults.length} 个相关结果：`
                : `没有找到"${intent.keyword}"相关的结果，换个关键词试试？`;
              sendJson(res, { success: true, ...result });
            }).catch((e: Error) => {
              result.reply = `搜索出错: ${e.message}`;
              sendJson(res, { success: true, ...result });
            });
          }
        } else if (intent.type === "convert") {
          result.reply = "请提供B站视频链接或BV号，我帮你转码。";
          sendJson(res, { success: true, ...result });
        } else if (intent.type === "play") {
          if (chatMode === "local") {
            const localResults = searchLocalMusic(intent.keyword);
            result.localResults = localResults;
            result.autoPlay = localResults.length > 0;
            result.reply = localResults.length > 0
              ? `找到并播放：${localResults[0].title}`
              : `本地没有找到"${intent.keyword}"`;
            sendJson(res, { success: true, ...result });
          } else if (chatMode === "netease") {
            neteaseSearch(intent.keyword).then((neteaseResults: any[]) => {
              result.neteaseResults = neteaseResults.slice(0, 5);
              result.reply = neteaseResults.length > 0
                ? `找到以下结果，点击下载播放：`
                : `没有找到相关结果`;
              sendJson(res, { success: true, ...result });
            }).catch(() => {
              result.reply = "搜索出错";
              sendJson(res, { success: true, ...result });
            });
          } else {
            biliSearch(intent.keyword).then((biliResults: any[]) => {
              result.biliResults = biliResults.slice(0, 3);
              result.reply = biliResults.length > 0
                ? `找到以下结果，点击转码播放：`
                : `没有找到相关结果`;
              sendJson(res, { success: true, ...result });
            }).catch(() => {
              result.reply = "搜索出错";
              sendJson(res, { success: true, ...result });
            });
          }
        } else {
          result.reply = getMusicHelpText(chatMode);
          sendJson(res, { success: true, ...result });
        }
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/music/danmaku" && req.method === "GET") {
    const bvid = parsed.query.bvid;
    const title = parsed.query.title;
    const artist = parsed.query.artist;

    if (!bvid && !title) return sendJson(res, { error: "缺少 bvid 或 title" }, 400);

    (async () => {
      if (bvid) {
        let oldHttpProxy = process.env.HTTP_PROXY;
        let oldHttpsProxy = process.env.HTTPS_PROXY;
        const cfg = loadMusicConfig();
        if (cfg.proxy) {
          process.env.HTTP_PROXY = cfg.proxy;
          process.env.HTTPS_PROXY = cfg.proxy;
        }

        try {
          await ensureBuvid3();
          await ensureWbiKey();

          const params = { bvid: bvid as string };
          const signedQs = signBiliParams(params);

          const viewUrl = `https://api.bilibili.com/x/web-interface/view?${signedQs}`;
          const viewRes = await fetch(viewUrl, {
            headers: {
              "User-Agent": BILI_UA,
              "Referer": "https://www.bilibili.com/",
              "Cookie": `buvid3=${buvid3}`,
              "Accept": "application/json, text/plain, */*",
              "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
              "Origin": "https://www.bilibili.com",
              "Sec-Fetch-Dest": "empty",
              "Sec-Fetch-Mode": "cors",
              "Sec-Fetch-Site": "same-site"
            }
          });
          const viewData: any = await viewRes.json();
          const cid = viewData?.data?.cid;
          const aid = viewData?.data?.aid;
          const duration = viewData?.data?.duration || 300;

          if (!cid) {
            if (cfg.proxy) {
              if (oldHttpProxy) process.env.HTTP_PROXY = oldHttpProxy; else delete process.env.HTTP_PROXY;
              if (oldHttpsProxy) process.env.HTTPS_PROXY = oldHttpsProxy; else delete process.env.HTTPS_PROXY;
            }
            return sendJson(res, { success: true, danmaku: [] });
          }

          const dmRes = await fetch(`https://api.bilibili.com/x/v1/dm/list.so?oid=${cid}`, {
            headers: {
              "User-Agent": BILI_UA,
              "Referer": "https://www.bilibili.com/",
              "Cookie": `buvid3=${buvid3}`
            }
          });
          const xml = await dmRes.text();

          let replies: any[] = [];
          if (aid) {
            try {
              const replyUrl = `https://api.bilibili.com/x/v2/reply?type=1&oid=${aid}&sort=1`;
              const replyRes = await fetch(replyUrl, {
                headers: {
                  "User-Agent": BILI_UA,
                  "Referer": "https://www.bilibili.com/",
                  "Cookie": `buvid3=${buvid3}`,
                  "Accept": "application/json, text/plain, */*",
                }
              });
              const replyData: any = await replyRes.json();
              if (replyData && replyData.code === 0 && replyData.data?.replies) {
                replies = replyData.data.replies;
              }
            } catch (replyErr) {
              console.error("[Danmaku] Failed to fetch Bilibili replies:", replyErr);
            }
          }

          if (cfg.proxy) {
            if (oldHttpProxy) process.env.HTTP_PROXY = oldHttpProxy; else delete process.env.HTTP_PROXY;
            if (oldHttpsProxy) process.env.HTTPS_PROXY = oldHttpsProxy; else delete process.env.HTTPS_PROXY;
          }

          const items: any[] = [];
          const regex = /<d p="([^"]*)"[^>]*>([^<]*)<\/d>/g;
          let match;
          while ((match = regex.exec(xml)) !== null) {
            const attrs = match[1].split(",");
            const time = parseFloat(attrs[0]);
            const type = parseInt(attrs[1]) || 1;
            const color = parseInt(attrs[3]) || 16777215;
            const hexColor = "#" + color.toString(16).padStart(6, "0");
            items.push({ time, content: match[2], type, color: hexColor });
          }

          if (replies && replies.length > 0) {
            const maxReplies = Math.min(replies.length, 25);
            const interval = Math.max(6, Math.floor(duration / (maxReplies + 1)));
            for (let i = 0; i < maxReplies; i++) {
              const r = replies[i];
              const username = r.member?.uname || "路人";
              const message = (r.content?.message || "").replace(/\s+/g, " ").trim();
              if (!message) continue;

              const shortMsg = message.length > 60 ? message.substring(0, 60) + "..." : message;
              const content = `💬 [热评] ${username}: ${shortMsg}`;
              const time = 3 + i * interval + Math.random() * 2;
              const color = "#ff9f43";

              items.push({
                time,
                content,
                type: 1,
                color
              });
            }
          }

          sendJson(res, { success: true, danmaku: items });
        } catch (e: any) {
          if (cfg.proxy) {
            if (oldHttpProxy) process.env.HTTP_PROXY = oldHttpProxy; else delete process.env.HTTP_PROXY;
            if (oldHttpsProxy) process.env.HTTPS_PROXY = oldHttpsProxy; else delete process.env.HTTPS_PROXY;
          }
          sendJson(res, { success: false, error: e.message });
        }
      } else {
        try {
          const query = `${artist || ""} ${title}`.trim();
          console.log("[NeteaseComments] searching for:", query);
          const searchUrl = `https://music.163.com/api/search/get/web?s=${encodeURIComponent(query)}&type=1&limit=5`;
          const searchRes = await fetch(searchUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Referer": "https://music.163.com/",
            }
          });
          const searchData: any = await searchRes.json();
          const songs = searchData?.result?.songs || [];
          if (songs.length === 0) {
            return sendJson(res, { success: true, danmaku: [] });
          }
          const songId = songs[0].id;
          
          // 并发请求多页，获取更多评论（共 5 页，每页最多 40 条，累计最多 200 条评论 + 热评）
          const limit = 40;
          const offsets = [0, 40, 80, 120, 160];
          const promises = offsets.map(offset => {
            const commentsUrl = `https://music.163.com/api/v1/resource/comments/R_SO_4_${songId}?limit=${limit}&offset=${offset}`;
            return fetch(commentsUrl, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Referer": "https://music.163.com/",
              }
            }).then(r => r.json()).catch(() => ({}));
          });

          const results = await Promise.all(promises);
          
          let allHotComments: any[] = [];
          let allStandardComments: any[] = [];
          for (const data of results) {
            const d = data as any;
            if (d?.hotComments) {
              allHotComments = allHotComments.concat(d.hotComments);
            }
            if (d?.comments) {
              allStandardComments = allStandardComments.concat(d.comments);
            }
          }

          // 对热评和最新评论去重
          const uniqueHotMap = new Map();
          for (const c of allHotComments) {
            if (c?.commentId) uniqueHotMap.set(c.commentId, c);
          }
          const hotComments = Array.from(uniqueHotMap.values());

          const uniqueStandardMap = new Map();
          for (const c of allStandardComments) {
            if (c?.commentId && !uniqueHotMap.has(c.commentId)) {
              uniqueStandardMap.set(c.commentId, c);
            }
          }
          const standardComments = Array.from(uniqueStandardMap.values());
          const allComments = [...hotComments, ...standardComments];

          const items: any[] = [];
          const duration = 240;
          // 上限调高到 200 条，弹幕更加饱满热闹
          const maxComments = Math.min(allComments.length, 200);

          for (let i = 0; i < maxComments; i++) {
            const c = allComments[i];
            const username = c.user?.nickname || "网易云用户";
            const message = (c.content || "").replace(/\s+/g, " ").trim();
            if (!message) continue;

            const shortMsg = message.length > 80 ? message.substring(0, 80) + "..." : message;
            const isHot = i < hotComments.length;
            const content = isHot ? `💬 [网易云热评] ${username}: ${shortMsg}` : `💬 [评论] ${username}: ${shortMsg}`;
            
            // 采用更加随机且紧凑的散布方式，使弹幕不会死板地等距出现，而是产生密集的弹幕云效果
            const time = 3 + Math.random() * (duration - 13);
            const color = isHot ? "#ff4d4f" : "#a6a6a6";

            items.push({
              time,
              content,
              type: 1,
              color
            });
          }
          console.log("[NeteaseComments] loaded", items.length, "comments for songId:", songId);
          sendJson(res, { success: true, danmaku: items });
        } catch (e: any) {
          console.error("[NeteaseComments] error:", e.message);
          sendJson(res, { success: false, error: e.message });
        }
      }
    })();
    return true;
  }

  if (pathname === "/api/music/convert-netease" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", async () => {
      try {
        const { songId, title, artist } = JSON.parse(body);
        if (!songId) return sendJson(res, { error: "缺少 songId" }, 400);
        const safeName = `${artist || "unknown"} - ${title || songId}`.replace(/[<>:"/\\|?*]/g, "_").substring(0, 100);
        const outputFile = path.join(MUSIC_DIR, `${safeName}.mp3`);
        if (fs.existsSync(outputFile)) return sendJson(res, { success: true, filename: path.basename(outputFile), message: "文件已存在" });

        const audioUrl = `https://music.163.com/song/media/outer/url?id=${songId}.mp3`;
        const child = spawn("ffmpeg", [
          "-headers", "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36\r\nReferer: https://music.163.com/\r\n",
          "-i", audioUrl,
          "-y",
          "-q:a", "0",
          "-loglevel", "error",
          outputFile
        ], { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
        let stderr = "";
        child.stderr?.on("data", (d: Buffer) => { stderr += d.toString(); });
        child.on("close", (code: number) => {
          if (code === 0 && fs.existsSync(outputFile)) {
            const stat = fs.statSync(outputFile);
            if (stat.size > 1024) {
              sendJson(res, { success: true, filename: path.basename(outputFile) });
            } else {
              try { fs.unlinkSync(outputFile); } catch {}
              sendJson(res, { success: false, error: "该歌曲可能需要VIP或已下架，无法获取音频" });
            }
          } else {
            sendJson(res, { success: false, error: stderr.substring(0, 200) || "下载转码失败" });
          }
        });
        child.on("error", () => {
          sendJson(res, { success: false, error: "ffmpeg 未安装或未加入环境变量" });
        });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/music/convert" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", async () => {
      try {
        const { bvid, title, author } = JSON.parse(body);
        if (!bvid) return sendJson(res, { error: "缺少 bvid" }, 400);
        const safeName = `${author || "unknown"} - ${title || bvid} [${bvid}]`.replace(/[<>:"/\\|?*]/g, "_").substring(0, 100);
        const outputFile = path.join(MUSIC_DIR, `${safeName}.mp3`);
        if (fs.existsSync(outputFile)) return sendJson(res, { success: true, filename: path.basename(outputFile), message: "文件已存在" });
        
        let audioUrl: string;
        try {
          audioUrl = await getBiliAudioUrl(bvid);
        } catch (e: any) {
          return sendJson(res, { success: false, error: `解析失败: ${e.message}` });
        }

        const headers = `User-Agent: ${BILI_UA}\r\nReferer: https://www.bilibili.com/\r\n`;
        const child = spawn("ffmpeg", [
          "-headers", headers,
          "-i", audioUrl,
          "-y",
          "-q:a", "0",
          outputFile
        ], { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
        let stderr = "";
        child.stderr?.on("data", (d: Buffer) => { stderr += d.toString(); });
        child.on("close", (code: number) => {
          if (code === 0 && fs.existsSync(outputFile)) {
            sendJson(res, { success: true, filename: path.basename(outputFile) });
          } else {
            sendJson(res, { success: false, error: stderr.substring(0, 200) || "下载转码失败" });
          }
        });
        child.on("error", () => {
          sendJson(res, { success: false, error: "ffmpeg 未安装或未加入环境变量" });
        });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/music/upload" && req.method === "POST") {
    const ct = req.headers["content-type"] || "";
    if (!ct.includes("multipart/form-data")) return sendJson(res, { error: "需要 multipart/form-data" }, 400);
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      try {
        const buffer = Buffer.concat(chunks);
        const boundaryMatch = ct.match(/boundary=(.+)/);
        if (!boundaryMatch) return sendJson(res, { error: "无效请求" }, 400);
        const boundary = boundaryMatch[1];
        const boundaryBuf = Buffer.from(`--${boundary}`);
        const parts: Buffer[] = [];
        let start = buffer.indexOf(boundaryBuf) + boundaryBuf.length + 2;
        while (true) {
          const end = buffer.indexOf(boundaryBuf, start);
          if (end === -1) break;
          parts.push(buffer.slice(start, end - 2));
          start = end + boundaryBuf.length + 2;
        }
        const uploaded: string[] = [];
        for (const part of parts) {
          const headerEnd = part.indexOf("\r\n\r\n");
          if (headerEnd === -1) continue;
          const headerStr = part.slice(0, headerEnd).toString("utf-8");
          const body = part.slice(headerEnd + 4);
          const filenameMatch = headerStr.match(/filename="([^"]+)"/);
          if (filenameMatch && filenameMatch[1]) {
            const filename = filenameMatch[1].replace(/[<>:"/\\|?*]/g, "_");
            const ext = path.extname(filename).toLowerCase();
            if ([".mp3", ".wav", ".ogg", ".m4a", ".flac", ".aac"].includes(ext)) {
              const filePath = path.join(MUSIC_DIR, filename);
              fs.writeFileSync(filePath, body);
              uploaded.push(filename);
            }
          }
        }
        sendJson(res, { success: true, uploaded });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/music/delete" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { filename } = JSON.parse(body);
        if (!filename || filename.includes("..")) return sendJson(res, { error: "无效文件名" }, 400);
        const filePath = path.join(MUSIC_DIR, filename);
        if (!fs.existsSync(filePath)) return sendJson(res, { error: "文件不存在" }, 404);
        fs.unlinkSync(filePath);
        sendJson(res, { success: true });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/music/lyric" && req.method === "GET") {
    const filename = parsed.query.filename;
    const bvid = parsed.query.bvid;

    function parseLrc(lrc: string) {
      const lines = lrc.split("\n");
      const result: { time: number, text: string }[] = [];
      for (const line of lines) {
        const timeRegex = /\[(\d+):(\d+(?:\.\d+)?)\]/g;
        const text = line.replace(timeRegex, "").trim();
        if (!text) continue;
        let match;
        while ((match = timeRegex.exec(line)) !== null) {
          const min = parseInt(match[1]);
          const sec = parseFloat(match[2]);
          const time = min * 60 + sec;
          result.push({ time, text });
        }
      }
      return result.sort((a, b) => a.time - b.time);
    }

    function cleanLyricText(raw: string) {
      return String(raw || "")
        .replace(/<[^>]*>/g, " ")
        .replace(/https?:\/\/\S+/g, " ")
        .replace(/BV[\w]+/gi, " ")
        .replace(/【[^】]*】/g, " ")
        .replace(/\[[^\]]*\]/g, " ")
        .replace(/（[^）]*）/g, " ")
        .replace(/\([^)]+\)/g, " ")
        .replace(/[《》「」『』]/g, " ")
        .replace(/[|｜_/]/g, " ")
        .replace(/(hi[-\s]?res|无损|高音质|极致修复|动态歌词|歌词纯享版|歌词版|纯享|完整版|现场版|live|cover|翻唱|mv|official|lyrics|lyric|audio|video|1080p|1080|4k|2k|hd)/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
    }

    function pushQuery(target: Set<string>, value: string) {
      const query = cleanLyricText(value);
      if (query && query.length >= 2 && query.length <= 80) target.add(query);
    }

    function buildLyricQueries() {
      const queries = new Set<string>();
      const title = String(parsed.query.title || "");
      const parsedFile = filename ? parseMusicFilename(String(filename)) : null;
      const rawTexts = [title, parsedFile?.title || "", String(filename || "")].filter(Boolean);

      for (const raw of rawTexts) {
        const quoted = String(raw).match(/[《「『](.{1,80}?)[》」』]/);
        if (quoted?.[1]) {
          const song = quoted[1].trim();
          const before = String(raw).slice(0, quoted.index).replace(/【[^】]*】|\[[^\]]*\]|（[^）]*）|\([^)]+\)/g, " ").trim();
          const after = String(raw).slice((quoted.index || 0) + quoted[0].length).replace(/【[^】]*】|\[[^\]]*\]|（[^）]*）|\([^)]+\)/g, " ").trim();
          const artistAfter = after.replace(/^[-–—_:：\s]+/, "").split(/[-–—_:：|｜\s]/).filter(Boolean)[0] || "";
          const artistBefore = before.split(/[-–—_:：|｜\s]/).filter(Boolean).pop() || "";
          if (artistAfter) pushQuery(queries, `${artistAfter} ${song}`);
          if (artistBefore) pushQuery(queries, `${artistBefore} ${song}`);
          pushQuery(queries, song);
        }

        const dashParts = cleanLyricText(String(raw)).split(/\s*[-–—]\s*/).map((p) => p.trim()).filter(Boolean);
        if (dashParts.length >= 2) {
          pushQuery(queries, `${dashParts[0]} ${dashParts.slice(1).join(" ")}`);
          pushQuery(queries, `${dashParts[dashParts.length - 1]} ${dashParts.slice(0, -1).join(" ")}`);
        }
        pushQuery(queries, String(raw));
      }

      if (parsedFile?.artist && parsedFile.artist !== "未知艺术家") {
        pushQuery(queries, `${parsedFile.artist} ${parsedFile.title}`);
      }
      return Array.from(queries).slice(0, 6);
    }

    async function fetchNeteaseLyrics() {
      const queries = buildLyricQueries();
      for (const query of queries) {
        try {
          const searchUrl = `https://music.163.com/api/search/get/web?s=${encodeURIComponent(query)}&type=1&limit=10`;
          const searchRes = await fetch(searchUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Referer": "https://music.163.com/",
            }
          });
          const searchData: any = await searchRes.json();
          const songs = searchData?.result?.songs || [];
          for (let i = 0; i < Math.min(songs.length, 10); i++) {
            const songId = songs[i]?.id;
            if (!songId) continue;
            try {
              const lyricUrl = `https://music.163.com/api/song/lyric?id=${songId}&lv=1&kv=1&tv=-1`;
              const lyricRes = await fetch(lyricUrl, {
                headers: {
                  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                  "Referer": "https://music.163.com/",
                }
              });
              const lyricData: any = await lyricRes.json();
              const rawLyric = lyricData?.lrc?.lyric;
              if (rawLyric && /\[\d+:\d+(?:\.\d+)?\]/.test(rawLyric)) {
                const lyrics = parseLrc(rawLyric);
                if (lyrics.length > 0) {
                  console.log(`[Lyric] matched Netease lyric by query "${query}" (ID: ${songId}), ${lyrics.length} lines`);
                  return lyrics;
                }
              }
            } catch (singleErr: any) {
              console.error(`[Lyric] Failed to fetch Netease lyric for song ID ${songId}:`, singleErr.message);
            }
          }
        } catch (neteaseErr: any) {
          console.error(`[Lyric] Failed to search Netease lyrics by "${query}":`, neteaseErr.message);
        }
      }
      return null;
    }

    async function fetchBiliCcLyrics(targetBvid: string) {
      let oldHttpProxy = process.env.HTTP_PROXY;
      let oldHttpsProxy = process.env.HTTPS_PROXY;
      const cfg = loadMusicConfig();
      const restoreProxy = () => {
        if (!cfg.proxy) return;
        if (oldHttpProxy) process.env.HTTP_PROXY = oldHttpProxy; else delete process.env.HTTP_PROXY;
        if (oldHttpsProxy) process.env.HTTPS_PROXY = oldHttpsProxy; else delete process.env.HTTPS_PROXY;
      };
      if (cfg.proxy) {
        process.env.HTTP_PROXY = cfg.proxy;
        process.env.HTTPS_PROXY = cfg.proxy;
      }

      try {
        await ensureBuvid3();
        await ensureWbiKey();
        const params = { bvid: targetBvid };
        const signedQs = signBiliParams(params);
        const viewUrl = `https://api.bilibili.com/x/web-interface/view?${signedQs}`;
        const viewRes = await fetch(viewUrl, {
          headers: {
            "User-Agent": BILI_UA,
            "Referer": "https://www.bilibili.com/",
            "Cookie": `buvid3=${buvid3}`,
            "Accept": "application/json, text/plain, */*"
          }
        });
        const viewData: any = await viewRes.json();
        const subtitles = viewData?.data?.subtitle?.list || [];
        for (const subtitle of subtitles) {
          const subUrl = subtitle?.subtitle_url;
          if (!subUrl) continue;
          const fullSubUrl = subUrl.startsWith("//") ? `https:${subUrl}` : subUrl;
          const subRes = await fetch(fullSubUrl, {
            headers: {
              "User-Agent": BILI_UA,
              "Referer": `https://www.bilibili.com/video/${targetBvid}`,
            }
          });
          const subData: any = await subRes.json();
          if (subData && Array.isArray(subData.body)) {
            const lyrics = subData.body
              .map((item: any) => ({
                time: parseFloat(item.from),
                text: String(item.content || "").trim()
              }))
              .filter((item: any) => Number.isFinite(item.time) && item.text)
              .sort((a: any, b: any) => a.time - b.time);
            if (lyrics.length > 0) return lyrics;
          }
        }
      } catch (biliErr: any) {
        console.error("[Lyric] Failed to fetch Bilibili subtitles:", biliErr.message);
      } finally {
        restoreProxy();
      }
      return null;
    }

    (async () => {
      if (filename) {
        try {
          const safeFilename = String(filename);
          if (safeFilename.includes("..") || /[\\/]/.test(safeFilename)) {
            throw new Error("无效文件名");
          }
          const lrcName = safeFilename.replace(/\.[^.]+$/, ".lrc");
          const lrcPath = path.join(MUSIC_DIR, lrcName);
          if (fs.existsSync(lrcPath)) {
            const lrcContent = fs.readFileSync(lrcPath, "utf-8");
            const lyrics = parseLrc(lrcContent);
            return sendJson(res, { success: true, source: "local-lrc", lyrics });
          }
        } catch (lrcErr: any) {
          console.error("[Lyric] Failed to read local LRC:", lrcErr.message);
        }
      }

      if (bvid) {
        const biliLyrics = await fetchBiliCcLyrics(String(bvid));
        if (biliLyrics && biliLyrics.length > 0) {
          return sendJson(res, { success: true, source: "bili-cc", lyrics: biliLyrics });
        }
      }

      const neteaseLyrics = await fetchNeteaseLyrics();
      if (neteaseLyrics && neteaseLyrics.length > 0) {
        return sendJson(res, { success: true, source: "netease", lyrics: neteaseLyrics });
      }

      return sendJson(res, { success: true, source: "none", lyrics: [{ time: 0, text: "未检测到歌词字幕，听着旋律，静心聆听吧..." }] });
    })();
    return true;
  }

  return false;
}
