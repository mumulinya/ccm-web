export type StreamSessionStatus = "resolving" | "buffering" | "streaming" | "completed" | "reconnecting" | "failed" | "cancelled";
export type StreamMediaKind = "audio" | "video";
export type StreamSession = {
    producerId?: string;
    background?: boolean;
    owner?: string;
    requiresAuth?: boolean;
    accountEpoch?: number | null;
    videoJobId?: string;
    sessionId: string;
    source: string;
    sourceId: string;
    mediaKind: StreamMediaKind;
    protocol: "hls" | "mp4";
    status: StreamSessionStatus;
    bufferedDuration: number;
    downloadedBytes: number;
    durationSeconds: number;
    segmentDirectory: string;
    partialVideoPath: string;
    partialAudioPath: string;
    retryCount: number;
    errorKind?: string;
    failedStage?: string;
    error?: string;
    title?: string;
    artist?: string;
    linkedTrack?: any;
    createdAt: string;
    updatedAt: string;
    lastAccessedAt: string;
};
export declare function resolveStreamMediaInput(s: StreamSession & any, signal: AbortSignal): Promise<{
    input: string;
    headers: {
        Referer: string;
    };
    duration: number;
} | {
    input: string;
    local: boolean;
    duration: any;
    headers?: undefined;
    video?: undefined;
    audio?: undefined;
    videoCodec?: undefined;
    audioCodec?: undefined;
} | {
    input: string;
    headers: {
        "User-Agent"?: undefined;
        Referer?: undefined;
    };
    duration: any;
    local?: undefined;
    video?: undefined;
    audio?: undefined;
    videoCodec?: undefined;
    audioCodec?: undefined;
} | {
    video: any;
    audio: any;
    headers: {
        "User-Agent": string;
        Referer: string;
    };
    duration: any;
    videoCodec: any;
    audioCodec: any;
    input?: undefined;
    local?: undefined;
} | {
    input: any;
    headers: any;
    duration: any;
    videoCodec: any;
    audioCodec: any;
    local?: undefined;
    video?: undefined;
    audio?: undefined;
}>;
export declare function prewarmVideoInput(input: any, signal: AbortSignal): Promise<void>;
export declare function createStreamSession(body: any): any;
export declare function createDownloadStream(job: any): any;
export declare function getStreamSession(id: string): any;
export declare function cancelStreamSession(id: string): any;
export declare function retryStreamSession(id: string): any;
export declare function streamManifest(id: string): string;
export declare function streamSegment(id: string, name: string): string;
export declare function streamSummary(): {
    success: boolean;
    bytes: number;
    maxBytes: number;
    sessions: any[];
};
export declare function pruneStreamCache(): {
    removed: number;
    success: boolean;
    bytes: number;
    maxBytes: number;
    sessions: any[];
};
export declare function handleMusicStreamApi(pathname: string, req: any, res: any): boolean;
export declare function shutdownVideoStreams(): Promise<void>;
