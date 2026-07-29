"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveMusicPlaybackDecisionV2 = resolveMusicPlaybackDecisionV2;
exports.publicMusicPlaybackDecision = publicMusicPlaybackDecision;
exports.sameMusicPlaybackCandidate = sameMusicPlaybackCandidate;
const semantic_decision_runtime_1 = require("../../system/semantic-decision-runtime");
const bilibili_1 = require("./bilibili");
const library_1 = require("./library");
const netease_1 = require("./netease");
const search_results_1 = require("./search-results");
const select_track_1 = require("./select-track");
const state_1 = require("./state");
function cleanText(value, limit) {
    return String(value || "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, limit);
}
function sourceMode(value) {
    const mode = String(value || "").trim().toLowerCase();
    if (mode === "local")
        return "local";
    if (mode === "netease")
        return "netease";
    return "bilibili";
}
function candidateIdentity(candidate) {
    return `${candidate.source}:${candidate.sourceId}`;
}
function makeDecision(input) {
    const createdAt = new Date().toISOString();
    const core = {
        schema: "ccm-music-playback-decision-v2",
        version: 2,
        ...input,
        createdAt,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1_000).toISOString(),
    };
    const checksum = (0, semantic_decision_runtime_1.semanticDecisionChecksum)({
        ...core,
        candidates: core.candidates.map(item => ({ ...item, downloadToken: undefined })),
        selectedCandidate: core.selectedCandidate ? { ...core.selectedCandidate, downloadToken: undefined } : null,
    });
    return { ...core, id: `music_decision_${checksum.slice(0, 20)}`, checksum };
}
async function searchCandidates(decision) {
    const mode = sourceMode(decision.sourceMode);
    const query = decision.strategy === "random"
        ? (mode === "netease" ? "热门 华语" : mode === "bilibili" ? "音乐 推荐" : "")
        : decision.searchQuery;
    if (mode === "local") {
        return (0, library_1.searchLocalMusic)(query).slice(0, 20).map((item) => ({
            source: "local",
            sourceId: String(item.filename || ""),
            filename: String(item.filename || ""),
            title: cleanText(item.title || item.filename, 200),
            artist: cleanText(item.artist || "未知歌手", 120),
            duration: cleanText(item.duration || "", 40),
        })).filter(item => item.sourceId);
    }
    if (mode === "netease") {
        return (0, search_results_1.signSearchResults)("netease", query, await (0, netease_1.neteaseSearch)(query), 12).map((item) => ({
            source: "netease",
            sourceId: String(item.songId || ""),
            title: cleanText(item.title || item.songId, 200),
            artist: cleanText(item.artist || "未知歌手", 120),
            duration: cleanText(item.duration || "", 40),
            downloadToken: String(item.downloadToken || ""),
        })).filter(item => item.sourceId);
    }
    return (0, search_results_1.signSearchResults)("bilibili", query, await (0, bilibili_1.biliSearch)(query), 12).map((item) => ({
        source: "bilibili",
        sourceId: String(item.bvid || ""),
        title: cleanText(item.title || item.bvid, 200),
        artist: cleanText(item.author || "未知UP主", 120),
        duration: cleanText(item.duration || "", 40),
        downloadToken: String(item.downloadToken || ""),
    })).filter(item => item.sourceId);
}
async function resolveMusicPlaybackDecisionV2(input) {
    const intent = input.intent;
    const requestId = cleanText(input.requestId || intent.semanticDecisionReceipt?.inputChecksum || cryptoRandomId(), 160);
    const base = {
        requestId,
        originalRequest: intent.originalRequest,
        action: intent.action,
        strategy: intent.strategy,
        sourceMode: sourceMode(intent.sourceMode),
        searchQuery: intent.searchQuery,
        intentReceipt: intent.semanticDecisionReceipt || null,
    };
    if (intent.action === "none") {
        return makeDecision({ ...base, status: "resolved", candidates: [], selectedCandidate: null, reply: "这条消息不需要操作播放器。", reason: intent.reason, selectionReceipt: null });
    }
    if ((intent.strategy === "mood_recommendation" || intent.strategy === "genre_recommendation") && input.aiRecommendationEnabled === false) {
        return makeDecision({ ...base, status: "rejected", candidates: [], selectedCandidate: null, reply: "AI推荐已关闭，当前不会根据心情或场景自动选歌。", reason: "ai_recommendation_disabled", selectionReceipt: null });
    }
    const candidates = await searchCandidates(intent);
    if (!candidates.length) {
        return makeDecision({ ...base, status: "rejected", candidates: [], selectedCandidate: null, reply: "没有找到符合这次要求的歌曲。", reason: "no_candidates", selectionReceipt: null });
    }
    if (intent.action === "search") {
        return makeDecision({ ...base, status: "resolved", candidates, selectedCandidate: null, reply: `找到 ${candidates.length} 个结果。`, reason: intent.reason, selectionReceipt: null });
    }
    if (intent.action === "convert") {
        return makeDecision({ ...base, status: "awaiting_user_selection", candidates, selectedCandidate: null, reply: "请选择需要下载或转换的结果。", reason: "conversion_requires_exact_candidate", selectionReceipt: null });
    }
    if (input.aiAutoSelectEnabled === false) {
        return makeDecision({ ...base, status: "awaiting_user_selection", candidates, selectedCandidate: null, reply: "已找到结果，请选择要播放的歌曲。", reason: "ai_auto_select_disabled", selectionReceipt: null });
    }
    let selected = null;
    let reply = "";
    let reason = intent.reason;
    let selectionReceipt = null;
    if (intent.strategy === "random") {
        selected = candidates[Math.floor(Math.random() * candidates.length)] || null;
        reason = "explicit_random_request";
    }
    else if (intent.strictMatch) {
        const strong = candidates
            .map(candidate => ({ candidate, score: (0, select_track_1.scoreMusicCandidate)(intent.searchQuery, candidate) }))
            .filter(item => item.score >= 80);
        if (strong.length === 1) {
            selected = strong[0].candidate;
            reason = "unique_exact_candidate";
        }
    }
    if (!selected) {
        const selection = await (0, select_track_1.selectMusicTrack)({
            keyword: intent.searchQuery,
            originalRequest: intent.originalRequest,
            selectionMode: intent.strictMatch ? "exact" : intent.strategy === "artist_random" ? "artist_random" : "recommendation",
            randomize: intent.randomize,
            candidates,
            modelConfig: input.modelConfig || (0, state_1.loadMusicAgentConfig)(),
        });
        if (!selection.success || selection.rejected || !Number.isInteger(selection.index) || !candidates[selection.index]) {
            return makeDecision({ ...base, status: "rejected", candidates, selectedCandidate: null, reply: "没有找到足够匹配的歌曲，未执行播放。", reason: selection.reason || "selection_rejected", selectionReceipt: selection.semanticDecisionReceipt || null });
        }
        selected = candidates[selection.index];
        reply = cleanText(selection.reply, 500);
        reason = selection.reason || intent.reason;
        selectionReceipt = selection.semanticDecisionReceipt || null;
    }
    if (!selected) {
        return makeDecision({ ...base, status: "rejected", candidates, selectedCandidate: null, reply: "没有确定可播放歌曲。", reason: "selection_empty", selectionReceipt });
    }
    const label = selected.artist ? `《${selected.title}》 - ${selected.artist}` : `《${selected.title}》`;
    return makeDecision({
        ...base,
        status: "resolved",
        candidates,
        selectedCandidate: selected,
        reply: reply || `已为你选择 ${label}，正在准备播放。`,
        reason,
        selectionReceipt,
    });
}
function cryptoRandomId() {
    return `music_request_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
function publicMusicPlaybackDecision(decision) {
    if (!decision)
        return null;
    const strip = (candidate) => candidate ? { ...candidate, downloadToken: undefined } : null;
    return {
        ...decision,
        candidates: decision.candidates.map(item => strip(item)),
        selectedCandidate: strip(decision.selectedCandidate),
    };
}
function sameMusicPlaybackCandidate(left, right) {
    return candidateIdentity(left) === candidateIdentity(right);
}
//# sourceMappingURL=playback-decision.js.map