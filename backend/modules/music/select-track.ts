import {
  callAnthropicCompatibleChat,
  callOpenAiCompatibleChat,
  shouldUseAnthropic,
} from "../collaboration/group-orchestrator-llm-client";
import { loadMusicAgentConfig } from "./state";

const MUSIC_MATCH_MIN_SCORE = 80;

function normalizeTrackSearchText(value: any) {
  return String(value || "")
    .toLowerCase()
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .replace(/[《》「」『』()[\]（）【】"'`~!@#$%^&*_+=|\\:;，。,.?？!！、/\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isCjkToken(token: string) {
  return /^[\u4e00-\u9fff]+$/.test(token);
}

function splitMusicKeywordTokens(keyword: string) {
  return normalizeTrackSearchText(keyword)
    .replace(/\b(feat|ft|cover|live|伴奏|纯音乐|歌词版|完整版|官方|mv)\b/g, " ")
    .split(/[\s的]+/)
    .map((token) => token.trim())
    .filter((token) => {
      if (!token) return false;
      if (isCjkToken(token)) return true;
      return token.length >= 2;
    });
}

function parseArtistTitleKeyword(keyword: string) {
  const raw = String(keyword || "").trim();
  if (!raw) return { artist: "", title: "", tokens: [] as string[] };
  const deMatch = raw.match(/^(.+?)的(.+)$/);
  if (deMatch) {
    return {
      artist: normalizeTrackSearchText(deMatch[1]),
      title: normalizeTrackSearchText(deMatch[2]),
      tokens: splitMusicKeywordTokens(raw),
    };
  }
  const tokens = splitMusicKeywordTokens(raw);
  if (tokens.length >= 2) {
    return {
      artist: normalizeTrackSearchText(tokens.slice(0, -1).join(" ")),
      title: tokens[tokens.length - 1],
      tokens,
    };
  }
  return { artist: "", title: "", tokens };
}

export function scoreMusicCandidate(keyword: string, fields: any = {}) {
  const titleText = normalizeTrackSearchText(fields.title || fields.name || "");
  const artistText = normalizeTrackSearchText(fields.artist || fields.author || fields.singer || "");
  const haystack = normalizeTrackSearchText([
    fields.title,
    fields.name,
    fields.artist,
    fields.author,
    fields.singer,
    fields.album,
    fields.filename,
  ].filter(Boolean).join(" "));
  if (!haystack) return 0;

  const normalizedKeyword = normalizeTrackSearchText(keyword);
  const { artist: artistKw, title: titleKw, tokens } = parseArtistTitleKeyword(keyword);
  if (!normalizedKeyword && !tokens.length) return 0;
  if (normalizedKeyword && haystack.includes(normalizedKeyword)) return 100;
  if (titleKw) {
    const shortTitle = titleKw.length <= 2;
    const titleHit = shortTitle
      ? titleText.includes(titleKw)
      : (titleText.includes(titleKw) || haystack.includes(titleKw));
    if (!titleHit) {
      if (artistKw && (artistText.includes(artistKw) || haystack.includes(artistKw))) return 40;
      return 0;
    }
    if (artistKw) {
      const artistHit = artistText.includes(artistKw) || haystack.includes(artistKw);
      return artistHit ? 100 : 50;
    }
    return 85;
  }
  if (tokens.length > 0 && tokens.every((token) => haystack.includes(token))) return 80;
  if (tokens.length > 0) {
    const hit = tokens.filter((token) => haystack.includes(token)).length;
    if (!hit) return 0;
    return Math.round(40 * (hit / tokens.length));
  }
  return 0;
}

export function pickBestCandidateByScore(keyword: string, candidates: any[] = []) {
  let bestIndex = -1;
  let bestScore = 0;
  for (let i = 0; i < candidates.length; i++) {
    const item = candidates[i] || {};
    const score = scoreMusicCandidate(keyword, item);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }
  if (bestIndex < 0 || bestScore < MUSIC_MATCH_MIN_SCORE) {
    return { index: -1, score: bestScore, reason: "规则打分未找到足够匹配的歌曲" };
  }
  return { index: bestIndex, score: bestScore, reason: `规则打分选中第 ${bestIndex + 1} 首（${bestScore}）` };
}

function extractJsonObject(text: string) {
  const raw = String(text || "").trim();
  try { return JSON.parse(raw); } catch {}
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) try { return JSON.parse(fenced[1].trim()); } catch {}
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) try { return JSON.parse(raw.slice(start, end + 1)); } catch {}
  return null;
}

function shouldUseAnthropicMusicApi(config: any) {
  return String(config?.format || "").trim().toLowerCase() === "anthropic" || shouldUseAnthropic(config);
}

/**
 * Pick the best track for a keyword from candidates.
 * Prefers model judgment; falls back to score matching when the model fails.
 */
export async function selectMusicTrack(input: { keyword?: string; candidates?: any[]; selectionMode?: string; randomize?: boolean; originalRequest?: string; allowModel?: boolean; modelConfig?: any } = {}) {
  const keyword = String(input.keyword || "").trim();
  const originalCandidates = Array.isArray(input.candidates) ? input.candidates.slice(0, 8) : [];
  const selectionMode = String(input.selectionMode || "exact").trim().toLowerCase();
  const strictMatch = selectionMode === "exact";
  if (!keyword) {
    return { success: false, index: -1, source: "reject", reason: "缺少点歌关键词", rejected: true };
  }
  if (!originalCandidates.length) {
    return { success: false, index: -1, source: "reject", reason: "没有可供选择的候选歌曲", rejected: true };
  }

  let candidateEntries = originalCandidates.map((candidate, index) => ({ candidate, index }));
  if (selectionMode === "artist_random") {
    const normalizedArtist = normalizeTrackSearchText(keyword);
    candidateEntries = candidateEntries
      .filter(({ candidate }) => normalizeTrackSearchText([
        candidate?.artist,
        candidate?.author,
        candidate?.singer,
        candidate?.title,
        candidate?.name,
      ].filter(Boolean).join(" ")).includes(normalizedArtist));
    if (!candidateEntries.length) {
      return { success: false, index: -1, source: "reject", reason: `候选中没有歌手“${keyword}”的作品`, rejected: true };
    }
  }

  const cfg = input.modelConfig || loadMusicAgentConfig();
  const canCallModel = input.allowModel !== false && Boolean(cfg?.enabled && cfg?.apiKey && cfg?.model);
  if (selectionMode === "artist_random" && input.randomize === true && canCallModel && candidateEntries.length > 1) {
    for (let i = candidateEntries.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidateEntries[i], candidateEntries[j]] = [candidateEntries[j], candidateEntries[i]];
    }
  }
  const candidates = candidateEntries.map((entry) => entry.candidate);
  const toOriginalIndex = (index: number) => candidateEntries[index]?.index ?? index;
  const fallback = pickBestCandidateByScore(keyword, candidates);

  if (canCallModel) {
    try {
      const listText = candidates.map((item, index) => {
        const title = String(item?.title || item?.name || "未知标题").slice(0, 120);
        const artist = String(item?.artist || item?.author || item?.singer || "未知歌手").slice(0, 80);
        return `${index}. 《${title}》 - ${artist}`;
      }).join("\n");
      const system = strictMatch
        ? `你是音乐点歌选曲器。根据用户要点的歌，从候选列表中选出最匹配的一首。
只输出 JSON，不要 Markdown。
规则：
1. 歌名必须对得上用户意图；不能只因歌手相同就选。
2. 不确定或没有足够匹配时返回 reject=true、index=-1。
3. index 是候选列表中的整数下标（从 0 开始）。
返回格式：{"index":0,"reject":false,"reason":"一句话依据"}`
        : selectionMode === "artist_random"
          ? `你是歌手作品选曲器。候选已经通过歌手字段筛选，全部属于用户指定的歌手。
结合用户完整原话判断是否还有情绪、场景或偏好，并从候选作品中选择一首。没有额外偏好时也必须选择，不要虚构候选外歌曲。
只输出 JSON，不要 Markdown。index 从 0 开始。
返回格式：{"index":0,"reject":false,"reason":"一句话依据"}`
          : `你是音乐推荐选曲器。根据用户的心情、场景或曲风，从搜索结果中选一首合适的歌。
只输出 JSON，不要 Markdown。不要要求歌名精确匹配；候选整体合理时必须选择。index 从 0 开始。
返回格式：{"index":0,"reject":false,"reason":"一句话依据"}`;
      const user = `用户原始请求：${String(input.originalRequest || keyword).slice(0, 500)}\n搜索主题：${keyword}\n\n候选列表：\n${listText}`;
      const requestConfig = { ...cfg, timeoutMs: Math.min(8_000, Math.max(5_000, Number(cfg.timeoutMs) || 8_000)) };
      const content = shouldUseAnthropicMusicApi(requestConfig)
        ? await callAnthropicCompatibleChat(requestConfig, {
          system,
          messages: [{ role: "user", content: user }],
          maxTokens: 180,
          temperature: 0,
          defaultTimeoutMs: 8_000,
          httpErrorPrefix: "点歌选曲失败",
        })
        : await callOpenAiCompatibleChat(requestConfig, {
          messages: [{ role: "system", content: system }, { role: "user", content: user }],
          maxTokens: 180,
          temperature: 0,
          defaultTimeoutMs: 8_000,
          httpErrorPrefix: "点歌选曲失败",
        });
      const parsed = extractJsonObject(content) || {};
      const rejected = parsed.reject === true || String(parsed.reject).toLowerCase() === "true";
      const index = Number(parsed.index);
      const reason = String(parsed.reason || "").trim().slice(0, 300);
      if (rejected || !Number.isInteger(index) || index < 0 || index >= candidates.length) {
        if (!strictMatch) {
          const fallbackIndex = Math.floor(Math.random() * candidates.length);
          return {
            success: true,
            index: toOriginalIndex(fallbackIndex),
            source: "recommendation-fallback",
            reason: reason || "模型未指定候选，从相关搜索结果中选择",
            rejected: false,
            candidate: candidates[fallbackIndex],
          };
        }
        return {
          success: false,
          index: -1,
          source: "reject",
          reason: reason || "模型认为没有足够匹配的歌曲",
          rejected: true,
        };
      }
      if (!strictMatch) {
        return {
          success: true,
          index: toOriginalIndex(index),
          source: selectionMode === "artist_random" ? "model-artist-selection" : "model-recommendation",
          reason: reason || `模型推荐第 ${index + 1} 首`,
          rejected: false,
          candidate: candidates[index],
        };
      }
      // 精确点歌仍要过规则分：点了歌手时不能接受「歌名撞车、歌手不对」的结果
      const modelScore = scoreMusicCandidate(keyword, candidates[index] || {});
      if (modelScore < MUSIC_MATCH_MIN_SCORE) {
        if (fallback.index >= 0) {
          return {
            success: true,
            index: toOriginalIndex(fallback.index),
            source: "fallback",
            reason: reason
              ? `${reason}；模型候选分不足(${modelScore})，改用规则选曲`
              : `模型候选分不足(${modelScore})，改用规则选曲`,
            rejected: false,
            candidate: candidates[fallback.index],
          };
        }
        return {
          success: false,
          index: -1,
          source: "reject",
          reason: reason || `模型候选匹配不足（${modelScore}）`,
          rejected: true,
        };
      }
      return {
        success: true,
        index: toOriginalIndex(index),
        source: "model",
        reason: reason || `模型选中第 ${index + 1} 首`,
        rejected: false,
        candidate: candidates[index],
      };
    } catch (error: any) {
      // Fall through to score-based selection.
      if (!strictMatch) {
        const index = Math.floor(Math.random() * candidates.length);
        return { success: true, index: toOriginalIndex(index), source: "recommendation-fallback", reason: `模型不可用，从相关候选中选择：${error?.message || error}`, rejected: false, candidate: candidates[index] };
      }
      if (fallback.index >= 0) {
        return {
          success: true,
          index: toOriginalIndex(fallback.index),
          source: "fallback",
          reason: `${fallback.reason}；模型不可用：${error?.message || error}`,
          rejected: false,
          candidate: candidates[fallback.index],
        };
      }
      return {
        success: false,
        index: -1,
        source: "reject",
        reason: `模型选曲失败且规则也未匹配：${error?.message || error}`,
        rejected: true,
      };
    }
  }

  if (!strictMatch) {
    const index = Math.floor(Math.random() * candidates.length);
    return { success: true, index: toOriginalIndex(index), source: "recommendation-fallback", reason: "未配置模型，从相关候选中选择", rejected: false, candidate: candidates[index] };
  }
  if (fallback.index >= 0) {
    return {
      success: true,
      index: toOriginalIndex(fallback.index),
      source: "fallback",
      reason: fallback.reason,
      rejected: false,
      candidate: candidates[fallback.index],
    };
  }
  return {
    success: false,
    index: -1,
    source: "reject",
    reason: fallback.reason || "未找到足够匹配的歌曲",
    rejected: true,
  };
}
