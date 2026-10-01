export declare function linkVideoAudio(job: {
    source: string;
    sourceId: string;
    title: string;
    artist?: string;
    id: string;
}, video: string, signal: AbortSignal): Promise<any>;
