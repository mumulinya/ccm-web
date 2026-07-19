// Behavior-freeze split from music.ts (part 2/2).

import * as fs from "fs";
import * as path from "path";
import { sendJson, CCM_DIR } from "../../core/utils";
import { loadMusicConfig, saveMusicConfig } from "../../core/db";
import { loadOrchestratorConfig, publicOrchestratorConfig } from "../collaboration/group-orchestrator";
import {
  BILI_UA,
  biliSearch,
  ensureBuvid3,
  ensureWbiKey,
  getBiliCookieHeader,
  signBiliParams,
} from "./bilibili";
import { neteaseSearch } from "./netease";
import {
  MUSIC_DIR,
  parseMusicFilename,
  searchLocalMusic,
} from "./library";
import {
  ackMusicRemoteCommand,
  claimMusicRemoteCommand,
  enqueueMusicRemoteCommand,
  loadMusicAgentConfig,
  loadMusicRemoteCommand,
  publicMusicAgentConfig,
  runMusicRemoteCommandQueueSelfTest,
  takeMusicRemoteCommand,
} from "./state";
import {
  callClaudeAgent,
  classifyMusicAgentAction,
  extractMusicIntent,
  getMusicHelpText,
  normalizeMusicAgentAction,
  normalizeMusicAgentMessages,
  writeSse,
} from "./agent";
import { handleMusicCoverApi, handleAnimeCoverApi } from "./cover";
import { classifySongEmotion, generateSongQuote } from "./llm-client";
import { signSearchResults, extractMusicConvertTarget, issueDownloadToken } from "./search-results";
import { musicDownloadJobs } from "./download-jobs";
import { musicLibraryState } from "./library-state";

export { runMusicAgentIntentSelfTest } from "./agent";
export { runMusicRemoteCommandQueueSelfTest } from "./state";

interface MusicCtx {
  getMusicPetAgent: () => any;
  setMusicPetState: (state: string, detail?: string, track?: any) => void;
  broadcastPetSpeech: (agent: string, payload: any) => void;
  MUSIC_PET_AGENT_NAME: string;
}

function startMusicConvertJob(message: string, keyword = "") {
  const target = extractMusicConvertTarget(message, keyword);
  if (!target) {
    return {
      ok: false,
      reply: "请提供 B 站 BV 号/链接，或网易云歌曲 ID，我帮你转码下载。",
    };
  }
  try {
    const token = issueDownloadToken(target.source, target.sourceId, target.title, target.artist);
    const job = musicDownloadJobs.create(target.source, token);
    return {
      ok: true,
      job,
      reply: `已创建${target.source === "bilibili" ? "B站" : "网易云"}下载转码任务：${job.title}（${job.id}）。可在下载中心查看进度。`,
    };
  } catch (error: any) {
    return {
      ok: false,
      reply: `创建转码任务失败：${error?.message || "未知错误"}`,
    };
  }
}

function readMusicJsonBody(req: any, maxBytes = 64 * 1024): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error("请求内容过大"));
        req.destroy();
        return;
      }
      chunks.push(Buffer.from(chunk));
    });
    req.on("end", () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf-8") || "{}")); }
      catch { reject(new Error("请求内容不是有效 JSON")); }
    });
    req.on("error", reject);
  });
}

const MUSIC_UPLOAD_MAX_BYTES = 100 * 1024 * 1024;
const MUSIC_EXTENSIONS = new Set([".mp3", ".wav", ".ogg", ".m4a", ".flac", ".aac"]);

function isSafeMusicFilename(filename: any) {
  const value = String(filename || "");
  return !!value && value === path.basename(value) && !value.includes("\0");
}

function isSupportedAudioBuffer(buffer: Buffer, ext: string) {
  if (buffer.length < 12 || !MUSIC_EXTENSIONS.has(ext)) return false;
  const ascii = buffer.subarray(0, 12).toString("ascii");
  if (ext === ".mp3" || ext === ".aac") return ascii.startsWith("ID3") || buffer[0] === 0xff;
  if (ext === ".wav") return ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WAVE";
  if (ext === ".ogg") return ascii.startsWith("OggS");
  if (ext === ".flac") return ascii.startsWith("fLaC");
  if (ext === ".m4a") return ascii.slice(4, 8) === "ftyp";
  return false;
}

export function handleMusicApiPartB(pathname: string, req: any, res: any, parsed: any, ctx: MusicCtx): boolean {
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
            const quote = await generateSongQuote(cfg, String(title), String(artist || "未知"));
            if (quote) return sendJson(res, { success: true, quote });
          } catch (error: any) { console.warn("[MusicQuote] model fallback:", error?.message); }
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

  // === 歌曲封面同源代理（支持二次元哈希缓存） ===
  if (pathname === "/api/music/cover" && req.method === "GET") {
    return handleMusicCoverApi(res, parsed);
  }

  // === 动漫图：外网随机优先，本地 anime_covers 兜底 ===
  // GET /api/music/anime-cover | ?t=防缓存 | ?local=1 | ?n=1 | ?seed=xxx
  if (pathname === "/api/music/anime-cover" && req.method === "GET") {
    return handleAnimeCoverApi(res, parsed);
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

      // 封装阶段3的国内 IP + 科大讯飞高精度天气逻辑
      const fetchDomesticWeather = async () => {
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
                return result;
              }
            }
          }
        } catch (err: any) {
          console.warn("[Weather Proxy] Domestic IP weather failed:", err.message);
        }
        return null;
      };

      // 封装 wttr.in 天气逻辑
      const fetchWttrWeather = async (useHttps = true) => {
        try {
          let url = useHttps ? "https://wttr.in/?m&format=%C+%t&lang=zh" : "http://wttr.in/?m&format=%C+%t&lang=zh";
          if (lat && lon) {
            url = useHttps ? `https://wttr.in/${lat},${lon}?m&format=%C+%t&lang=zh` : `http://wttr.in/${lat},${lon}?m&format=%C+%t&lang=zh`;
          }
          const resp = await fetch(url, {
            headers: { "User-Agent": "curl/8.4.0" },
            signal: AbortSignal.timeout(3500)
          });
          const text = await resp.text();
          const translated = translateWeather(text);
          if (isHealthy(translated)) {
            return translated;
          }
        } catch (err: any) {
          console.warn(`[Weather Proxy] wttr.in (${useHttps ? "HTTPS" : "HTTP"}) failed:`, err.message);
        }
        return null;
      };

      // === 气象定位分流控制 ===
      if (lat && lon) {
        // 如果有 GPS 经纬度：优先走 wttr.in 经纬度精准天气
        let result = await fetchWttrWeather(true);
        if (result) { cleanProxy(); return sendJson(res, { success: true, weather: result }); }

        result = await fetchWttrWeather(false);
        if (result) { cleanProxy(); return sendJson(res, { success: true, weather: result }); }

        result = await fetchDomesticWeather();
        if (result) { cleanProxy(); return sendJson(res, { success: true, weather: result }); }
      } else {
        // 如果没有 GPS 经纬度（依靠 IP 定位）：优先走国内 IP 定位 + 科大讯飞精确市级天气（防范梯子/IP 粗识别偏移）
        let result = await fetchDomesticWeather();
        if (result) { cleanProxy(); return sendJson(res, { success: true, weather: result }); }

        result = await fetchWttrWeather(true);
        if (result) { cleanProxy(); return sendJson(res, { success: true, weather: result }); }

        result = await fetchWttrWeather(false);
        if (result) { cleanProxy(); return sendJson(res, { success: true, weather: result }); }
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
            const matched = await classifySongEmotion(cfg, String(title), String(artist || "未知"), emotionLabels);
            if (matched) return sendJson(res, { success: true, emotion: matched });
          } catch (error: any) { console.warn("[MusicEmotion] model fallback:", error?.message); }
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
    req.on("end", async () => {
      try {
        const { message, mode: chatMode, history } = JSON.parse(body);
        const cfg = loadMusicAgentConfig();
        let action: any;
        try {
          action = await classifyMusicAgentAction(cfg, message, chatMode, history || []);
        } catch {
          const intent = extractMusicIntent(message);
          action = normalizeMusicAgentAction(
            { action: intent.type === "play" ? "play_music" : intent.type === "search" ? "search_music" : intent.type === "convert" ? "convert_music" : "none", keyword: intent.keyword },
            message,
            chatMode,
            "simple-fallback",
          );
        }
        const intentType = action.type === "play_music" ? "play"
          : action.type === "search_music" ? "search"
          : action.type === "convert_music" ? "convert"
          : "none";
        const keyword = String(action.keyword || "").trim();
        const result: any = { intent: intentType, keyword, action };

        if (intentType === "search") {
          if (chatMode === "local") {
            const localResults = searchLocalMusic(keyword);
            result.localResults = localResults;
            result.reply = localResults.length > 0
              ? `在本地找到 ${localResults.length} 首匹配的音乐：`
              : `本地没有找到"${keyword}"相关音乐，试试切换到 B站模式？`;
            sendJson(res, { success: true, ...result });
          } else if (chatMode === "netease") {
            neteaseSearch(keyword).then((rawResults: any[]) => {
              const neteaseResults = signSearchResults("netease", keyword, rawResults);
              result.neteaseResults = neteaseResults;
              result.reply = neteaseResults.length > 0
                ? `在网易云找到 ${neteaseResults.length} 个相关结果：`
                : `网易云没有找到"${keyword}"相关的结果，换个关键词试试？`;
              sendJson(res, { success: true, ...result });
            }).catch((e: Error) => {
              result.reply = `搜索出错: ${e.message}`;
              sendJson(res, { success: true, ...result });
            });
          } else {
            biliSearch(keyword).then((rawResults: any[]) => {
              const biliResults = signSearchResults("bilibili", keyword, rawResults);
              result.biliResults = biliResults;
              result.reply = biliResults.length > 0
                ? `在B站找到 ${biliResults.length} 个相关结果：`
                : `没有找到"${keyword}"相关的结果，换个关键词试试？`;
              sendJson(res, { success: true, ...result });
            }).catch((e: Error) => {
              result.reply = `搜索出错: ${e.message}`;
              sendJson(res, { success: true, ...result });
            });
          }
        } else if (intentType === "convert") {
          const convert = startMusicConvertJob(String(message || ""), keyword);
          result.reply = convert.reply;
          if (convert.ok) result.downloadJob = convert.job;
          sendJson(res, { success: true, ...result });
        } else if (intentType === "play") {
          if (chatMode === "local") {
            const localResults = searchLocalMusic(keyword);
            result.localResults = localResults;
            result.autoPlay = localResults.length > 0;
            result.reply = localResults.length > 0
              ? `找到并播放：${localResults[0].title}`
              : `本地没有找到"${keyword}"`;
            sendJson(res, { success: true, ...result });
          } else if (chatMode === "netease") {
            neteaseSearch(keyword).then((rawResults: any[]) => {
              const neteaseResults = signSearchResults("netease", keyword, rawResults, 5);
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
            biliSearch(keyword).then((rawResults: any[]) => {
              const biliResults = signSearchResults("bilibili", keyword, rawResults, 3);
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
        sendJson(res, { success: false, error: e.message }, 400);
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
              "Cookie": getBiliCookieHeader(),
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
              "Cookie": getBiliCookieHeader()
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
                  "Cookie": getBiliCookieHeader(),
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

  if (pathname === "/api/music/upload" && req.method === "POST") {
    const ct = req.headers["content-type"] || "";
    if (!ct.includes("multipart/form-data")) return sendJson(res, { error: "需要 multipart/form-data" }, 400);
    const declaredLength = Number(req.headers["content-length"] || 0);
    if (declaredLength > MUSIC_UPLOAD_MAX_BYTES) return sendJson(res, { error: "上传文件不能超过 100 MB" }, 413);
    const chunks: Buffer[] = [];
    let received = 0;
    let rejected = false;
    req.on("data", (chunk: Buffer) => {
      if (rejected) return;
      received += chunk.length;
      if (received > MUSIC_UPLOAD_MAX_BYTES) {
        rejected = true;
        sendJson(res, { error: "上传文件不能超过 100 MB" }, 413);
        return;
      }
      chunks.push(Buffer.from(chunk));
    });
    req.on("end", () => {
      if (rejected) return;
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
            const filename = path.basename(filenameMatch[1]).replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").slice(0, 180);
            const ext = path.extname(filename).toLowerCase();
            if (isSafeMusicFilename(filename) && isSupportedAudioBuffer(body, ext)) {
              const filePath = path.join(MUSIC_DIR, filename);
              fs.writeFileSync(filePath, body);
              uploaded.push(filename);
            }
          }
        }
        if (!uploaded.length) return sendJson(res, { success: false, error: "没有检测到有效音频文件，请检查格式和文件内容" }, 400);
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
        if (!isSafeMusicFilename(filename)) return sendJson(res, { error: "无效文件名" }, 400);
        const filePath = path.join(MUSIC_DIR, filename);
        if (!fs.existsSync(filePath)) return sendJson(res, { error: "文件不存在" }, 404);
        fs.unlinkSync(filePath);
        musicLibraryState.removeTrack(filename);
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
            "Cookie": getBiliCookieHeader(),
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
