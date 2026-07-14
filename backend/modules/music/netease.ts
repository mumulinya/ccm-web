export async function neteaseSearch(keyword: string): Promise<any[]> {
  try {
    const terms = String(keyword || "").trim().split(/[\s\-_/·・]+/).filter(term => term.length >= 2).slice(0, 2);
    const queries = Array.from(new Set([String(keyword || "").trim(), ...(terms.length > 1 ? terms : [])])).filter(Boolean);
    const batches = await Promise.all(queries.map(async query => {
      const limit = query === keyword ? 30 : 100;
      const searchUrl = `https://music.163.com/api/search/get/web?s=${encodeURIComponent(query)}&type=1&limit=${limit}`;
      const searchRes = await fetch(searchUrl, {
        method: "POST",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Referer": "https://music.163.com/",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        signal: AbortSignal.timeout(8000),
      });
      if (!searchRes.ok) return [];
      const data: any = await searchRes.json();
      return Array.isArray(data?.result?.songs) ? data.result.songs : [];
    }));
    const songs = Array.from(new Map(batches.flat().filter((song: any) => song?.id).map((song: any) => [String(song.id), song])).values());
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
    console.log("[NeteaseSearch] found", results.length, "merged results for:", keyword);
    return results;
  } catch (e: any) {
    console.log("[NeteaseSearch] error:", e.message);
    return [];
  }
}
