export declare function scanMusicDuplicates(): {
    id: string;
    title: any;
    artist: any;
    recommendedFilename: any;
    items: any[];
}[];
export declare function mergeMusicDuplicateGroup(keepFilename: string, removeFilenames: string[]): {
    kept: string;
    deleted: string[];
    groups: {
        id: string;
        title: any;
        artist: any;
        recommendedFilename: any;
        items: any[];
    }[];
};
