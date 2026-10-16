type BrowserMedia = {
    audioUrl: string;
    videoUrl: string;
    durationSeconds: number;
    resolver: "browser";
};
/**
 * Bilibili currently returns HTTP 412 to server-side view/playurl calls while
 * its normal web player still receives signed DASH URLs. Resolve that same
 * public page in a local Chromium instance and only return signed media URLs.
 */
export declare function resolveBiliPlaybackStreamsWithBrowser(bvid: string): Promise<BrowserMedia>;
export declare function selectBiliBrowserMedia(urls: string[]): {
    audioUrl: string;
    videoUrl: string;
};
export {};
