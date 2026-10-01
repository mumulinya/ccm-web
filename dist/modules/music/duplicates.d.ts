export declare function scanMusicDuplicates(): {
    id: string;
    title: any;
    artist: any;
    recommendedFilename: any;
    items: any[];
}[];
export declare function mergeMusicDuplicateGroup(keepFilename: string, removeFilenames: string[]): {
    transactionId: string;
    status: string;
    kept: string;
    deleted: string[];
    quarantined: string[];
    groups: {
        id: string;
        title: any;
        artist: any;
        recommendedFilename: any;
        items: any[];
    }[];
};
export declare function rollbackMusicDuplicateTransaction(transactionId: string): {
    transactionId: any;
    status: any;
    keepFilename: any;
    removeFilenames: any;
    quarantine: any;
    result: any;
    error: any;
    createdAt: any;
    updatedAt: any;
};
export declare function retryMusicDuplicateTransaction(transactionId: string): {
    transactionId: any;
    status: any;
    keepFilename: any;
    removeFilenames: any;
    quarantine: any;
    result: any;
    error: any;
    createdAt: any;
    updatedAt: any;
};
