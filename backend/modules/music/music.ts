import * as fs from "fs";
import * as path from "path";
import { spawn } from "child_process";
import { sendJson, CCM_DIR } from "../../core/utils";
import { loadMusicConfig, saveMusicConfig } from "../../core/db";
import { loadOrchestratorConfig, publicOrchestratorConfig } from "../collaboration/group-orchestrator";
import {
  BILI_UA,
  biliSearch,
  ensureBuvid3,
  ensureWbiKey,
  getBiliAudioUrl,
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
  MUSIC_REMOTE_COMMAND_FILE,
  loadMusicAgentConfig,
  loadMusicRemoteCommand,
  publicMusicAgentConfig,
  saveMusicRemoteCommand,
} from "./state";
import {
  callClaudeAgent,
  classifyMusicAgentAction,
  extractMusicIntent,
  getMusicHelpText,
  normalizeMusicAgentAction,
  writeSse,
} from "./agent";
import { handleMusicCoverApi } from "./cover";

export { runMusicAgentIntentSelfTest } from "./agent";

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
    req.on("end", async () => {
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

        const agentAction = await classifyMusicAgentAction(cfg, message, chatMode, history || []);
        writeSse(res, {
          type: "music_action",
          action: agentAction,
          intent: agentAction.type,
          keyword: agentAction.keyword,
        });

        const intent = {
          type: agentAction.type === "play_music" ? "play" : agentAction.type === "search_music" ? "search" : agentAction.type === "convert_music" ? "convert" : "help",
          keyword: agentAction.keyword,
        };
        let toolContext = "";
        if (intent.type === "search" || intent.type === "play") {
          if (chatMode === "local") {
            const localResults = searchLocalMusic(intent.keyword);
            toolContext = `\n\n[工具结果] 本地搜索 "${intent.keyword}" 找到 ${localResults.length} 首：\n${localResults.slice(0, 5).map((t, i) => `${i + 1}. ${t.title} - ${t.artist} (文件: ${t.filename})`).join("\n")}`;
            messages[messages.length - 1].content += toolContext;
            await callClaudeAgent(cfg, systemPrompt, messages, res, chatMode);
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
          await callClaudeAgent(cfg, systemPrompt, messages, res, chatMode);
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

  // === 歌曲封面同源代理（支持二次元哈希缓存） ===
  if (pathname === "/api/music/cover" && req.method === "GET") {
    return handleMusicCoverApi(res, parsed);
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
        const action = normalizeMusicAgentAction(
          { action: intent.type === "play" ? "play_music" : intent.type === "search" ? "search_music" : intent.type === "convert" ? "convert_music" : "none", keyword: intent.keyword },
          message,
          chatMode,
          "simple-fallback",
        );
        const result: any = { intent: intent.type, keyword: intent.keyword, action };

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
