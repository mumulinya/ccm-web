export type MusicSource = "netease" | "bilibili";
export type SignedMusicResult = {
    type: MusicSource;
    songId?: number | string;
    bvid?: string;
    title: string;
    artist?: string;
    author?: string;
    album?: string;
    duration?: string;
    pic?: string;
    downloadToken: string;
};
type TokenPayload = {
    v: 1;
    source: MusicSource;
    sourceId: string;
    title: string;
    artist: string;
    exp: number;
};
export declare function signSearchResults(source: MusicSource, query: string, results: any[], limit?: number): SignedMusicResult[];
export declare function verifyDownloadToken(token: any, expectedSource?: MusicSource): TokenPayload;
export declare function issueDownloadToken(source: MusicSource, sourceId: string, title: string, artist: string): string;
export declare function extractMusicConvertTarget(message: string, keyword?: string): {
    source: "bilibili";
    sourceId: string;
    title: string;
    artist: string;
} | {
    source: "netease";
    sourceId: string;
    title: string;
    artist: string;
};
export declare function runMusicSearchResultSelfTest(): {
    ok: boolean;
    first: string;
};
export {};
