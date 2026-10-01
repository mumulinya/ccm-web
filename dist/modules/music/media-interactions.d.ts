export declare function musicInteractionIdentity(body: any): {
    v: 1;
    source: import("./search-results").MusicSource;
    sourceId: string;
    title: string;
    artist: string;
    exp: number;
} | {
    source: any;
    sourceId: any;
};
export declare function ensureNeteaseRequest(body: any): Promise<void>;
export declare function readMediaComments(body: any): Promise<any>;
export declare function handleMusicInteractions(pathname: string, req: any, res: any): boolean;
