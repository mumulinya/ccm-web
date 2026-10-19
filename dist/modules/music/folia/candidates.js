"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicMusicCandidate = publicMusicCandidate;
// 音乐助手候选的兼容投影。
function publicMusicCandidate(candidate) {
    const metadata = { ...(candidate?.recommendationReason ? { recommendationReason: candidate.recommendationReason } : {}), ...(candidate?.popularity ? { popularity: candidate.popularity } : {}) };
    return { ...projectCandidate(candidate), ...metadata };
}
function projectCandidate(candidate) {
    if (["qq", "kugou", "navidrome"].includes(candidate?.source))
        return { type: candidate.source, sourceId: candidate.sourceId, title: candidate.title, artist: candidate.artist, instanceId: candidate.instanceId, song: candidate.song };
    if (candidate?.source === "local") {
        return { type: "local", track: { filename: candidate.filename || candidate.sourceId, title: candidate.title, artist: candidate.artist } };
    }
    if (candidate?.source === "netease") {
        return { type: "netease", songId: candidate.sourceId, title: candidate.title, artist: candidate.artist, duration: candidate.duration };
    }
    if (candidate?.source === "douyin") {
        return { type: "douyin", awemeId: candidate.sourceId, title: candidate.title, author: candidate.artist, duration: candidate.duration, pic: candidate.pic, shareUrl: candidate.shareUrl, downloadable: true, searchChannel: candidate.searchChannel || "mcp" };
    }
    return { type: "bilibili", bvid: candidate?.sourceId, title: candidate?.title, author: candidate?.artist, duration: candidate?.duration };
}
//# sourceMappingURL=candidates.js.map