export declare function readLocalMusicLyrics(filename: string, formatOrder?: string): Promise<{
    success: boolean;
    source: string;
    format: string;
    encoding: string;
    lyric: string;
    translation: string;
    status: string;
    message?: undefined;
} | {
    success: boolean;
    source: string;
    format: string;
    lyric: any;
    status: string;
    encoding?: undefined;
    translation?: undefined;
    message?: undefined;
} | {
    success: boolean;
    source: string;
    lyric: string;
    status: string;
    message: string;
    format?: undefined;
    encoding?: undefined;
    translation?: undefined;
}>;
export declare function writeLocalMusicLyrics(filename: string, lyric: string, format?: string): {
    success: boolean;
};
export declare function sendLocalMusicCover(filename: string, res: any): Promise<void>;
export declare function writeLocalMusicCover(filename: string, content: string, extension: string): {
    success: boolean;
};
export declare function streamLocalMusic(filename: string, req: any, res: any): void;
