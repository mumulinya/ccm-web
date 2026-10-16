export declare function clearDouyinMediaHints(owner?: string, id?: string): void;
export declare function rememberDouyinMediaHints(owner: string, rows: any[], userAgent: string): void;
export declare function trustedDouyinMediaUrl(raw: unknown): raw is string;
export declare function selectDouyinBrowserMedia(data: any, id: string): {
    videoCodec: string;
    audioCodec: string;
    urls: string[];
    durationSeconds: number;
    title: string;
    author: string;
};
export declare function resolveDouyinBrowserMedia(id: string, signal?: AbortSignal): Promise<any>;
