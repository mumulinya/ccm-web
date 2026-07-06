export declare const MUSIC_DIR: string;
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
}[];
