export declare const HLS_SEGMENT_SECONDS = 3;
export declare const isHlsMediaName: (name: string) => boolean;
/** 每次重连单独命名；公开列表只追加完整分片，不覆盖播放器已读的字节。 */
export declare function createHlsPublication(directory: string): {
    resumeAt: number;
    playlist: string;
    init: string;
    segment: string;
    publish(complete?: boolean): {
        duration: number;
        bytes: number;
    };
};
export declare function hlsEncodingArgs(mediaKind: string, input: any, publication: ReturnType<typeof createHlsPublication>): string[];
