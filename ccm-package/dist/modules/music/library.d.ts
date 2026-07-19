import * as fs from "fs";
export declare const MUSIC_DIR: string;
export declare function formatDurationSec(sec: number): string;
/** 读取本地音频时长（带文件戳缓存） */
export declare function resolveTrackDuration(filename: string, filePath: string, stat: fs.Stats): {
    durationSec: number;
    duration: string;
};
export declare function buildLocalTrackMeta(filename: string, id?: number): {
    id: number;
    filename: string;
    title: string;
    artist: string;
    bvid: string;
    pic: string;
    size: number;
    modified: string;
    duration: string;
    durationSec: number;
};
export declare function parseMusicFilename(filename: string): {
    artist: string;
    title: string;
    bvid: string;
};
export declare function getMp3Cover(filePath: string): {
    mimeType: string;
    data: Buffer;
} | null;
export declare function searchLocalMusic(keyword: string): {
    id: number;
    filename: string;
    title: string;
    artist: string;
    bvid: string;
    pic: string;
    size: number;
    modified: string;
    duration: string;
    durationSec: number;
}[];
