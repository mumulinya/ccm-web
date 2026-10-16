export { closeDouyinLibrarySessions } from './douyin-library-session';
export declare function readDouyinPersonalLibrary(owner: string, kind: string, cursor: string, signal?: AbortSignal, refresh?: boolean): Promise<{
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
