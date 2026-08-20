import { loadMusicAgentConfig } from "./state";
import { runSemanticDecision } from "../../system/semantic-decision-runtime";

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

/**
 * Pick the best track for a keyword from candidates.
 * Semantic selection is model-only; lexical scoring only validates an exact-song result.
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
  if (canCallModel) {
    try {
      const system = strictMatch
        ? `You are the CCM music track selector. Select the best candidate for the user's requested song.
Return JSON only; do not use Markdown.
Rules:
1. The title must match the user's intent; do not select solely because the artist matches.
2. If uncertain or no candidate is a sufficient match, return reject=true and index=-1.
3. index is the zero-based integer index in the candidate list.
Return: {"index":0,"reject":false,"reason":"short evidence basis"}`
        : selectionMode === "artist_random"
          ? `You are the artist catalog selector. Candidates were already filtered to the requested artist.
Use the complete user wording to identify any remaining mood, context, or preference and select one candidate. If there is no extra preference, still select one; never invent a song outside the candidates.
Return JSON only; do not use Markdown. index is zero-based.
Return: {"index":0,"reject":false,"reason":"short evidence basis"}`
          : `You are the music recommendation selector. Choose one suitable song from the search results based on the user's mood, context, or genre.
Return JSON only; do not use Markdown. The title need not match exactly; select when the candidate is broadly suitable. index is zero-based.
Return: {"index":0,"reject":false,"reason":"short evidence basis"}`;
      const selection = await runSemanticDecision({
        kind: "music_selection",
        identity: {
          scope: "music",
          scopeId: "music-player",
          sessionId: "music-singleton",
        },
        system: `${system}\nReturn a brief user-facing explanation of the selected song without mentioning candidate indexes or internal protocols.`,
        input: {
          originalRequest: String(input.originalRequest || keyword).slice(0, 500),
          searchTopic: keyword,
          selectionMode,
          candidates: candidates.map((item, index) => ({
            index,
            title: String(item?.title || item?.name || "未知标题").slice(0, 120),
            artist: String(item?.artist || item?.author || item?.singer || "未知歌手").slice(0, 80),
          })),
        },
        config: cfg,
        maxTokens: 300,
        validate: (value: any) => {
          const rejected = value?.reject === true || String(value?.reject).toLowerCase() === "true";
          const index = Number(value?.index);
          if (!rejected && (!Number.isInteger(index) || index < 0 || index >= candidates.length)) throw new Error("模型返回了无效候选索引");
          return {
            index: rejected ? -1 : index,
            reject: rejected,
            reason: String(value?.reason || "").trim().slice(0, 300),
            reply: String(value?.reply || "").trim().slice(0, 500),
            confidence: Math.max(0, Math.min(1, Number(value?.confidence ?? 1))),
          };
        },
        confidence: value => value.confidence,
      });
      const parsed = selection.value;
      const rejected = parsed.reject === true || String(parsed.reject).toLowerCase() === "true";
      const index = Number(parsed.index);
      const reason = String(parsed.reason || "").trim().slice(0, 300);
      if (rejected || !Number.isInteger(index) || index < 0 || index >= candidates.length) {
        return {
          success: false,
          index: -1,
          source: "reject",
          reason: reason || "模型认为没有足够匹配的歌曲",
          rejected: true,
          semanticDecisionReceipt: selection.receipt,
        };
      }
      if (!strictMatch) {
        return {
          success: true,
          index: toOriginalIndex(index),
          source: selectionMode === "artist_random" ? "model-artist-selection" : "model-recommendation",
          reason: reason || `模型推荐第 ${index + 1} 首`,
          reply: parsed.reply || `已选择《${String(candidates[index]?.title || candidates[index]?.name || "歌曲")}》。`,
          rejected: false,
          candidate: candidates[index],
          semanticDecisionReceipt: selection.receipt,
        };
      }
      // 精确点歌仍要过规则分：点了歌手时不能接受「歌名撞车、歌手不对」的结果
      const modelScore = scoreMusicCandidate(keyword, candidates[index] || {});
      if (modelScore < MUSIC_MATCH_MIN_SCORE) {
        return {
          success: false,
          index: -1,
          source: "reject",
          reason: reason || `模型候选匹配不足（${modelScore}）`,
          rejected: true,
          semanticDecisionReceipt: selection.receipt,
        };
      }
      return {
        success: true,
        index: toOriginalIndex(index),
        source: "model",
        reason: reason || `模型选中第 ${index + 1} 首`,
        reply: parsed.reply || `已选择《${String(candidates[index]?.title || candidates[index]?.name || "歌曲")}》。`,
        rejected: false,
        candidate: candidates[index],
        semanticDecisionReceipt: selection.receipt,
      };
    } catch (error: any) {
      return {
        success: false,
        index: -1,
        source: "reject",
        reason: `模型选曲失败，未使用本地语义替代：${error?.message || error}`,
        rejected: true,
      };
    }
  }
  return {
    success: false,
    index: -1,
    source: "reject",
    reason: "统一大模型未配置，未执行本地选曲替代",
    rejected: true,
  };
}
