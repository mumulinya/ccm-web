// Behavior-freeze split from music.ts (part 1/2).

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
  buildLocalTrackMeta,
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
import { handleMusicCoverApi } from "./cover";
import { classifySongEmotion, generateSongQuote } from "./llm-client";
import { signSearchResults, extractMusicConvertTarget, issueDownloadToken } from "./search-results";
import { musicDownloadJobs } from "./download-jobs";
import { musicLibraryState } from "./library-state";
import { selectMusicTrack } from "./select-track";

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

export function handleMusicApiPartA(pathname: string, req: any, res: any, parsed: any, ctx: MusicCtx): boolean {
  if (!pathname.startsWith("/api/music")) return false;

  if (pathname === "/api/music/download-jobs" && req.method === "GET") {
    sendJson(res, { success: true, jobs: musicDownloadJobs.list() });
    return true;
  }
  if (pathname === "/api/music/download-jobs" && req.method === "DELETE") {
    sendJson(res, { success: true, jobs: musicDownloadJobs.clearFinished() });
    return true;
  }

  if (pathname === "/api/music/library-state" && req.method === "GET") {
    sendJson(res, { success: true, state: musicLibraryState.get() });
    return true;
  }
  if (pathname === "/api/music/library-state/favorite" && req.method === "POST") {
    readMusicJsonBody(req).then(body => {
      try { sendJson(res, { success: true, state: musicLibraryState.toggleFavorite(body.filename, body.favorite) }); }
      catch (error: any) { sendJson(res, { success: false, error: error?.message || "更新收藏失败" }, 400); }
    }).catch((error: any) => sendJson(res, { success: false, error: error?.message }, 400));
    return true;
  }
  if (pathname === "/api/music/library-state/queue" && req.method === "PUT") {
    readMusicJsonBody(req).then(body => {
      try { sendJson(res, { success: true, state: musicLibraryState.setQueue(body.tracks) }); }
      catch (error: any) { sendJson(res, { success: false, error: error?.message || "更新播放队列失败" }, 400); }
    }).catch((error: any) => sendJson(res, { success: false, error: error?.message }, 400));
    return true;
  }
  if (pathname === "/api/music/library-state/playlists" && req.method === "POST") {
    readMusicJsonBody(req).then(body => {
      try { sendJson(res, { success: true, state: musicLibraryState.createPlaylist(body.name) }); }
      catch (error: any) { sendJson(res, { success: false, error: error?.message || "创建歌单失败" }, 400); }
    }).catch((error: any) => sendJson(res, { success: false, error: error?.message }, 400));
    return true;
  }
  const playlistMatch = pathname.match(/^\/api\/music\/library-state\/playlists\/([^/]+)$/);
  if (playlistMatch && ["PUT", "DELETE"].includes(req.method)) {
    const id = decodeURIComponent(playlistMatch[1]);
    if (req.method === "DELETE") {
      try { sendJson(res, { success: true, state: musicLibraryState.deletePlaylist(id) }); }
      catch (error: any) { sendJson(res, { success: false, error: error?.message || "删除歌单失败" }, 400); }
    } else {
      readMusicJsonBody(req).then(body => {
        try { sendJson(res, { success: true, state: musicLibraryState.updatePlaylist(id, body) }); }
        catch (error: any) { sendJson(res, { success: false, error: error?.message || "更新歌单失败" }, 400); }
      }).catch((error: any) => sendJson(res, { success: false, error: error?.message }, 400));
    }
    return true;
  }

  const downloadJobMatch = pathname.match(/^\/api\/music\/download-jobs\/([^/]+)(?:\/(cancel|retry))?$/);
  if (downloadJobMatch && req.method === "GET" && !downloadJobMatch[2]) {
    const job = musicDownloadJobs.get(decodeURIComponent(downloadJobMatch[1]));
    sendJson(res, job ? { success: true, job } : { success: false, error: "下载任务不存在" }, job ? 200 : 404);
    return true;
  }
  if (downloadJobMatch && req.method === "DELETE" && !downloadJobMatch[2]) {
    try { sendJson(res, { success: true, jobs: musicDownloadJobs.removeFinished(decodeURIComponent(downloadJobMatch[1])) }); }
    catch (error: any) { sendJson(res, { success: false, error: error?.message || "清理下载任务失败" }, 400); }
    return true;
  }
  if (downloadJobMatch && req.method === "POST" && downloadJobMatch[2]) {
    try {
      const id = decodeURIComponent(downloadJobMatch[1]);
      const job = downloadJobMatch[2] === "cancel" ? musicDownloadJobs.cancel(id) : musicDownloadJobs.retry(id);
      sendJson(res, { success: true, job });
    } catch (error: any) {
      sendJson(res, { success: false, error: error?.message || "更新下载任务失败" }, 400);
    }
    return true;
  }

  if ((pathname === "/api/music/download-jobs" || pathname === "/api/music/download" || pathname === "/api/music/convert" || pathname === "/api/music/convert-netease") && req.method === "POST") {
    readMusicJsonBody(req).then(body => {
      try {
        const source = pathname === "/api/music/convert-netease" || body.source === "netease" || body.songId ? "netease" : "bilibili";
        const job = musicDownloadJobs.create(source, String(body.downloadToken || ""));
        sendJson(res, { success: true, job, jobId: job.id }, 202);
      } catch (error: any) {
        sendJson(res, { success: false, error: error?.message || "创建下载任务失败" }, 400);
      }
    }).catch((error: any) => sendJson(res, { success: false, error: error?.message || "读取请求失败" }, 400));
    return true;
  }

  if (pathname === "/api/music/remote-command" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const type = String(payload.type || "play").trim() || "play";
        const keyword = String(payload.keyword || payload.query || "").trim();
        if (type !== "stop" && !keyword) return sendJson(res, { success: false, error: "缺少音乐关键词" }, 400);
        const command = enqueueMusicRemoteCommand({
          type,
          keyword: type === "stop" ? (keyword || "__stop__") : keyword,
          mode: String(payload.mode || "").trim(),
          source: payload.source || "global-agent",
        });
        sendJson(res, { success: true, command });
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message || "创建音乐播放指令失败" }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/music/remote-command" && req.method === "GET") {
    const claimed = claimMusicRemoteCommand();
    sendJson(res, {
      success: true,
      command: claimed,
      stale_hint: claimed?.status === "stale" ? "播放指令超时未完成，请确认 CCM Web 已打开" : "",
    });
    return true;
  }

  if (pathname === "/api/music/remote-command/take" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const command = takeMusicRemoteCommand(String(payload.id || ""));
        sendJson(res, { success: !!command, command });
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message || "领取音乐指令失败" }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/music/remote-command/ack" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const result = ackMusicRemoteCommand({
          id: String(payload.id || ""),
          status: payload.status === "failed" ? "failed" : "success",
          error: payload.error,
        });
        sendJson(res, result, result.success === false ? 400 : 200);
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message || "确认音乐指令失败" }, 400);
      }
    });
    return true;
  }

  // Legacy consume: treat as failed ack so the command can be retried instead of dropped.
  if (pathname === "/api/music/remote-command/consume" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const id = String(payload.id || loadMusicRemoteCommand()?.id || "").trim();
        if (id) ackMusicRemoteCommand({ id, status: "failed", error: "legacy_consume_without_play_result" });
        sendJson(res, { success: true, legacy: true });
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message || "消费音乐指令失败" }, 400);
      }
    });
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
        .map((f, i) => buildLocalTrackMeta(f, i))
        .sort((a, b) => a.title.localeCompare(b.title));
      sendJson(res, { success: true, tracks: files });
    } catch (e) {
      sendJson(res, { success: true, tracks: [] });
    }
    return true;
  }

  if (pathname === "/api/music/stream" && req.method === "GET") {
    const filename = parsed.query.file;
    if (!isSafeMusicFilename(filename)) return sendJson(res, { error: "无效文件名" }, 400);
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
      const match = String(range).match(/^bytes=(\d*)-(\d*)$/);
      let start = 0;
      let end = stat.size - 1;
      if (!match || (!match[1] && !match[2])) {
        res.writeHead(416, { "Content-Range": `bytes */${stat.size}`, "Accept-Ranges": "bytes", "Access-Control-Allow-Origin": "*" });
        res.end();
        return true;
      }
      if (!match[1]) {
        const suffixLength = Number(match[2]);
        if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) {
          res.writeHead(416, { "Content-Range": `bytes */${stat.size}`, "Accept-Ranges": "bytes", "Access-Control-Allow-Origin": "*" });
          res.end();
          return true;
        }
        start = Math.max(0, stat.size - suffixLength);
      } else {
        start = Number(match[1]);
        end = match[2] ? Number(match[2]) : stat.size - 1;
      }
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || start >= stat.size) {
        res.writeHead(416, { "Content-Range": `bytes */${stat.size}`, "Accept-Ranges": "bytes", "Access-Control-Allow-Origin": "*" });
        res.end();
        return true;
      }
      end = Math.min(end, stat.size - 1);
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
      sendJson(res, { success: true, results: signSearchResults("netease", String(query), results) });
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
      sendJson(res, { success: true, results: signSearchResults("bilibili", String(query), results) });
    }).catch((e: Error) => {
      sendJson(res, { success: false, error: e.message });
    });
    return true;
  }

  if (pathname === "/api/music/select-track" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", async () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const result = await selectMusicTrack({
          keyword: payload.keyword || payload.query || "",
          candidates: payload.candidates || payload.results || [],
        });
        sendJson(res, result, result.success === false && result.rejected ? 200 : 200);
      } catch (e: any) {
        sendJson(res, { success: false, rejected: true, index: -1, source: "reject", reason: e?.message || "选曲失败" }, 400);
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

当前模式: ${chatMode === "local" ? "本地模式（搜索本地曲库）" : chatMode === "netease" ? "网易云模式（搜索网易云音乐）" : "B站模式（搜索B站并转码）"}

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

        const messages = normalizeMusicAgentMessages(history || [], message, 10);

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
            writeSse(res, { type: "music_results", mode: "local", results: localResults.slice(0, 8).map(track => ({ type: "local", track })) });
            toolContext = `\n\n[工具结果] 本地搜索 "${intent.keyword}" 找到 ${localResults.length} 首：\n${localResults.slice(0, 5).map((t, i) => `${i + 1}. ${t.title} - ${t.artist} (文件: ${t.filename})`).join("\n")}`;
            messages[messages.length - 1].content += toolContext;
            await callClaudeAgent(cfg, systemPrompt, messages, res, chatMode);
          } else if (chatMode === "netease") {
            neteaseSearch(intent.keyword).then((rawResults: any[]) => {
              const neteaseResults = signSearchResults("netease", intent.keyword, rawResults);
              writeSse(res, { type: "music_results", mode: "netease", results: neteaseResults });
              toolContext = `\n\n[工具结果] 网易云搜索 "${intent.keyword}" 找到 ${neteaseResults.length} 个结果：\n${neteaseResults.slice(0, 8).map((r: any, i: number) => `${i + 1}. ${r.title} - ${(r.artist && r.artist !== "undefined" && r.artist !== "null" ? r.artist : "") || "未知歌手"} (${r.duration}) [ID: ${r.songId}]`).join("\n")}`;
              messages[messages.length - 1].content += toolContext;
              callClaudeAgent(cfg, systemPrompt, messages, res, chatMode);
            }).catch(() => {
              messages[messages.length - 1].content += "\n\n[工具结果] 网易云搜索失败";
              callClaudeAgent(cfg, systemPrompt, messages, res, chatMode);
            });
            return;
          } else {
            biliSearch(intent.keyword).then((rawResults: any[]) => {
              const biliResults = signSearchResults("bilibili", intent.keyword, rawResults);
              writeSse(res, { type: "music_results", mode: "bilibili", results: biliResults });
              toolContext = `\n\n[工具结果] B站搜索 "${intent.keyword}" 找到 ${biliResults.length} 个结果：\n${biliResults.slice(0, 5).map((r: any, i: number) => `${i + 1}. ${r.title} - ${r.author} (${r.duration}) [BV: ${r.bvid}]`).join("\n")}`;
              messages[messages.length - 1].content += toolContext;
              callClaudeAgent(cfg, systemPrompt, messages, res, chatMode);
            }).catch(() => {
              messages[messages.length - 1].content += "\n\n[工具结果] B站搜索失败";
              callClaudeAgent(cfg, systemPrompt, messages, res, chatMode);
            });
            return;
          }
        } else if (intent.type === "convert") {
          const convert = startMusicConvertJob(message, intent.keyword);
          writeSse(res, {
            type: "music_convert",
            success: convert.ok,
            reply: convert.reply,
            job: convert.job || null,
          });
          messages[messages.length - 1].content += `\n\n[工具结果] ${convert.reply}`;
          await callClaudeAgent(cfg, systemPrompt, messages, res, chatMode);
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
  return false;
}
