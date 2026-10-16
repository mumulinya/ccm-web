export declare function douyinBrowserApiUrl(value: string): import("node:url").URL;
export declare const DOUYIN_LIST_PATHS: {
    readonly posts: readonly ["/aweme/v1/web/aweme/post/"];
    readonly likes: readonly ["/aweme/v1/web/aweme/favorite/", "/aweme/v1/web/aweme/like/"];
    readonly favorites: readonly ["/aweme/v1/web/aweme/listcollection/", "/aweme/v1/web/aweme/collection/"];
    readonly following: readonly ["/aweme/v1/web/follow/feed/", "/aweme/v1/web/aweme/follow/"];
};
export declare function douyinListRequest(kind: string, address: string, selfId?: string, postData?: string): {
    cursor: string;
};
export declare function parseDouyinList(data: any, cursor: string, kind?: string): {
    rows: any;
    nextCursor: string;
};
