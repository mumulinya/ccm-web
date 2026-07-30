import * as fs from "fs";
export declare function resolveSafeMusicFile(filenameValue: any, options?: {
    mustExist?: boolean;
}): {
    filename: string;
    filePath: string;
    root: string;
    stat?: undefined;
} | {
    filename: string;
    filePath: string;
    root: string;
    stat: fs.Stats;
};
export declare function probeMusicFile(filePath: string): Promise<{
    durationSeconds: number;
    bitrate: number;
    sampleRate: number;
    channels: number;
    format: string;
}>;
export declare function startMusicCatalogRescan(reason?: string): Promise<any>;
export declare function scheduleMusicCatalogRescan(reason?: string, delayMs?: number): void;
export declare function ensureMusicCatalogPrepared(): {
    schema: string;
    activeGeneration: number;
    indexStatus: string;
    active: any;
    building: any;
};
export declare function queryMusicCatalog(input?: {
    cursor?: number;
    limit?: number;
    query?: string;
}): {
    tracks: {
        id: any;
        trackId: any;
        filename: any;
        title: any;
        artist: any;
        bvid: any;
        pic: string;
        size: number;
        modified: any;
        duration: string;
        durationSec: number;
        bitrate: number;
        sampleRate: number;
        channels: number;
        format: any;
        checksum: any;
        state: any;
        error: any;
        source: any;
        sourceId: any;
    }[];
    indexStatus: string;
    activeGeneration: number;
    generation: number;
    total: number;
    nextCursor: number;
};
export declare function findMusicCatalogTrackByFilename(filenameValue: any): {
    indexGeneration: number;
    id: any;
    trackId: any;
    filename: any;
    title: any;
    artist: any;
    bvid: any;
    pic: string;
    size: number;
    modified: any;
    duration: string;
    durationSec: number;
    bitrate: number;
    sampleRate: number;
    channels: number;
    format: any;
    checksum: any;
    state: any;
    error: any;
    source: any;
    sourceId: any;
};
export declare function ensureMusicCatalogTrackReady(filenameValue: any, reason?: string): Promise<any>;
export declare function ensureMusicCatalogTrackRemoved(filenameValue: any, reason?: string): Promise<{
    filename: string;
    activeGeneration: number;
    indexStatus: string;
}>;
export declare function musicCatalogFileDiagnostics(trackId: string): {
    track: {
        id: any;
        trackId: any;
        filename: any;
        title: any;
        artist: any;
        bvid: any;
        pic: string;
        size: number;
        modified: any;
        duration: string;
        durationSec: number;
        bitrate: number;
        sampleRate: number;
        channels: number;
        format: any;
        checksum: any;
        state: any;
        error: any;
        source: any;
        sourceId: any;
    };
    generation: number;
    safePathVerified: boolean;
    checksumVerified: boolean;
    probeState: any;
    probeError: any;
};
export declare function assertSafeId3Allocation(filePath: string): {
    tagSize: number;
    maxCoverBytes: number;
};
export declare const MUSIC_MEDIA_LIMITS: {
    maxId3TagBytes: number;
    maxCoverBytes: number;
};
