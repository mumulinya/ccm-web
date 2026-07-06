"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.neteaseSearch = neteaseSearch;
async function neteaseSearch(keyword) {
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
        const data = await searchRes.json();
        const songs = data?.result?.songs || [];
        const results = songs.map((song) => {
            const artists = (song.artists || [])
                .map((a) => a.name)
                .filter((name) => name && name !== "undefined" && name !== "null")
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
    }
    catch (e) {
        console.log("[NeteaseSearch] error:", e.message);
        return [];
    }
}
//# sourceMappingURL=netease.js.map