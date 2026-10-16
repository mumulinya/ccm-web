import { VideoProvider } from './accounts-store';
export declare const videoCollections: {
    bilibili: {
        id: string;
        name: string;
    }[];
    douyin: {
        id: string;
        name: string;
    }[];
};
export declare function requireVideoSession(owner: string, provider: VideoProvider): any;
export declare function readBiliLibrary(owner: string, kind: string, cursor: string, folder?: string, force?: boolean, signal?: AbortSignal): Promise<{
    collections: any;
    items: any[];
    nextCursor: any;
} | {
    items: import("../search-results").SignedMusicResult[];
    nextCursor: string;
    collections?: undefined;
}>;
export declare function readDouyinLibrary(owner: string, kind: string, cursor: string, signal?: AbortSignal, refresh?: boolean): Promise<{
    items: {
        type: "douyin";
        awemeId: string;
        title: string;
        author: string;
        duration?: string;
        pic?: string;
        play?: number;
        shareUrl: string;
        searchChannel: "mcp";
        downloadable: boolean;
        musicId?: string;
        musicTitle?: string;
        musicAuthor?: string;
        secUserId?: string;
    }[];
    nextCursor: string;
}>;
