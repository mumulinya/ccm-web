export type DouyinMediaAsset = {
    assetId: string;
    source: 'douyin';
    sourceId: string;
    kind: 'video' | 'audio' | 'transcript';
    status: 'queued' | 'resolving' | 'downloading' | 'validating' | 'ready' | 'failed' | 'cancelled' | 'interrupted';
    filePath: string;
    fileChecksum: string;
    fileSize: number;
    durationSeconds: number;
    format: string;
    resolver: string;
    title?: string;
    error?: string;
    operationId?: string;
};
export type DouyinVideoAsset = DouyinMediaAsset & {
    kind: 'video';
};
export declare function douyinVideoAssetId(sourceId: string): string;
export declare function getDouyinVideoAsset(sourceId: string): DouyinVideoAsset;
export declare function ensureDouyinVideoAsset(sourceId: string, options?: {
    signal?: AbortSignal;
}): Promise<any>;
export declare function ensureDouyinAudioAsset(sourceId: string, options?: {
    signal?: AbortSignal;
}): Promise<any>;
export declare function cancelDouyinVideoAsset(sourceId: string): DouyinVideoAsset;
export declare function douyinVideoFile(sourceId: string): string;
export declare function getDouyinVideoAssetById(assetId: string): DouyinVideoAsset;
export declare function douyinVideoFileByAssetId(assetId: string): string;
export declare function listDouyinVideoAssets(limit?: number): DouyinVideoAsset[];
