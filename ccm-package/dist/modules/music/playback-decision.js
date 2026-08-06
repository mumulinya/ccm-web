"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveMusicPlaybackDecisionV2 = resolveMusicPlaybackDecisionV2;
exports.publicMusicPlaybackDecision = publicMusicPlaybackDecision;
exports.sameMusicPlaybackCandidate = sameMusicPlaybackCandidate;
const semantic_decision_runtime_1 = require("../../system/semantic-decision-runtime");
const bilibili_1 = require("./bilibili");
const douyin_1 = require("./douyin");
const music_catalog_1 = require("./music-catalog");
const netease_1 = require("./netease");
const search_results_1 = require("./search-results");
const select_track_1 = require("./select-track");
const state_1 = require("./state");
const platform_http_1 = require("./platform-http");
function cleanText(value, limit) {
    return String(value || "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, limit);
}
function sourceMode(value) {
    const mode = String(value || "").trim().toLowerCase();
    if (mode === "local")
        return "local";
    if (mode === "netease")
        return "netease";
    if (mode === "bilibili")
        return "bilibili";
    if (mode === "douyin")
        return "douyin";
    return "auto";
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
        ? "热门 华语 音乐 推荐"
        : decision.searchQuery;
    const requested = new Set(mode === "auto" ? ["local", "netease", "bilibili", "douyin"] : [mode]);
    const statuses = {
        local: { status: requested.has("local") ? "unavailable" : "not_requested", resultCount: 0 },
        netease: { status: requested.has("netease") ? "unavailable" : "not_requested", resultCount: 0 },
        bilibili: { status: requested.has("bilibili") ? "unavailable" : "not_requested", resultCount: 0 },
        douyin: { status: requested.has("douyin") ? "unavailable" : "not_requested", resultCount: 0 },
    };
    const jobs = [];
    if (requested.has("local"))
        jobs.push({ source: "local", promise: Promise.resolve().then(() => ({
                source: "local",
                candidates: (0, music_catalog_1.queryMusicCatalog)({ query: decision.strategy === "random" ? "" : query, limit: 20 }).tracks.map((item) => ({
                    source: "local",
                    sourceId: String(item.filename || ""),
                    filename: String(item.filename || ""),
                    title: cleanText(item.title || item.filename, 200),
                    artist: cleanText(item.artist || "未知歌手", 120),
                    duration: cleanText(item.duration || "", 40),
                })).filter(item => item.sourceId),
            })) });
    if (requested.has("netease"))
        jobs.push({ source: "netease", promise: (0, netease_1.neteaseSearch)(query).then(results => ({
                source: "netease",
                candidates: (0, search_results_1.signSearchResults)("netease", query, results, 12).map((item) => ({
                    source: "netease",
                    sourceId: String(item.songId || ""),
                    title: cleanText(item.title || item.songId, 200),
                    artist: cleanText(item.artist || "未知歌手", 120),
                    duration: cleanText(item.duration || "", 40),
                    downloadToken: String(item.downloadToken || ""),
                })).filter(item => item.sourceId),
            })) });
    if (requested.has("bilibili"))
        jobs.push({ source: "bilibili", promise: (0, bilibili_1.biliSearch)(query).then(results => ({
                source: "bilibili",
                candidates: (0, search_results_1.signSearchResults)("bilibili", query, results, 12).map((item) => ({
                    source: "bilibili",
                    sourceId: String(item.bvid || ""),
                    title: cleanText(item.title || item.bvid, 200),
                    artist: cleanText(item.author || "未知UP主", 120),
                    duration: cleanText(item.duration || "", 40),
                    downloadToken: String(item.downloadToken || ""),
                })).filter(item => item.sourceId),
            })) });
    if (requested.has("douyin"))
        jobs.push({ source: "douyin", promise: (0, douyin_1.douyinSearch)(query).then(results => ({
                source: "douyin",
                candidates: (0, search_results_1.signSearchResults)("douyin", query, results, 12).map((item) => ({
                    source: "douyin",
                    sourceId: String(item.awemeId || ""),
                    title: cleanText(item.title || item.awemeId, 200),
                    artist: cleanText(item.author || "抖音作者", 120),
                    duration: cleanText(item.duration || "", 40),
                    downloadToken: String(item.downloadToken || ""),
                })).filter(item => item.sourceId),
            })) });
    const settled = await Promise.allSettled(jobs.map(job => job.promise));
    const candidates = [];
    for (const [index, item] of settled.entries()) {
        if (item.status === "fulfilled") {
            statuses[item.value.source] = { status: "success", resultCount: item.value.candidates.length };
            candidates.push(...item.value.candidates);
            continue;
        }
        const platformError = (0, platform_http_1.publicMusicPlatformError)(item.reason);
        statuses[jobs[index].source] = { ...platformError, resultCount: 0 };
    }
    const unique = Array.from(new Map(candidates.map(candidate => [candidateIdentity(candidate), candidate])).values());
    return { candidates: unique, sourceStatuses: statuses };
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
        sourceStatuses: {
            local: { status: "not_requested", resultCount: 0 },
            netease: { status: "not_requested", resultCount: 0 },
            bilibili: { status: "not_requested", resultCount: 0 },
            douyin: { status: "not_requested", resultCount: 0 },
        },
    };
    if (intent.action === "none") {
        return makeDecision({ ...base, status: "resolved", candidates: [], selectedCandidate: null, reply: "这条消息不需要操作播放器。", reason: intent.reason, selectionReceipt: null });
    }
    if ((intent.strategy === "mood_recommendation" || intent.strategy === "genre_recommendation") && input.aiRecommendationEnabled === false) {
        return makeDecision({ ...base, status: "rejected", candidates: [], selectedCandidate: null, reply: "AI推荐已关闭，当前不会根据心情或场景自动选歌。", reason: "ai_recommendation_disabled", selectionReceipt: null });
    }
    const searched = await searchCandidates(intent);
    const candidates = searched.candidates;
    base.sourceStatuses = searched.sourceStatuses;
    if (!candidates.length) {
        const failed = Object.values(searched.sourceStatuses).some(status => !["success", "not_requested"].includes(status.status));
        return makeDecision({
            ...base,
            status: "rejected",
            candidates: [],
            selectedCandidate: null,
            reply: failed ? "音乐平台暂时不可用，未执行播放，请稍后重试。" : "没有找到符合这次要求的歌曲。",
            reason: failed ? "all_sources_unavailable" : "no_candidates",
            selectionReceipt: null,
        });
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
    if (intent.strictMatch) {
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