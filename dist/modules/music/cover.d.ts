/**
 * 随机动漫图：外网优先，本地 anime_covers 兜底
 * GET /api/music/anime-cover
 *   无参 / ?t=xxx     — 每次外网随机（浏览器防缓存可用 t）
 *   ?local=1          — 强制本地
 *   ?n=1..N           — 本地按序号
 *   ?seed=xxx         — 本地按种子稳定选
 */
export declare function handleAnimeCoverApi(res: any, parsed: any): boolean;
export declare function handleMusicCoverApi(res: any, parsed: any): boolean;
