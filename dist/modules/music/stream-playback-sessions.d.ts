export type StreamSessionStatus = "resolving" | "buffering" | "streaming" | "completed" | "reconnecting" | "failed" | "cancelled";
export type StreamMediaKind = "audio" | "video";
export type StreamSession = {
    sessionId: string;
    source: string;
    sourceId: string;
    mediaKind: StreamMediaKind;
    protocol: "hls";
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
} | {
    video: any;
    audio: any;
    headers: {
        "User-Agent": string;
        Referer: string;
    };
    duration: number;
    input?: undefined;
    local?: undefined;
} | {
    input: string;
    headers: Record<string, string>;
    duration: number;
    local?: undefined;
    video?: undefined;
    audio?: undefined;
}>;
export declare function createStreamSession(body: any): any;
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
