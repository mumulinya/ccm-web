type KnowledgeWatchConfig = {
    path: string;
    scope: {
        type: "global" | "group" | "project" | "agent";
        id: string;
    };
    visibility: "shared" | "restricted";
    legacyShared: boolean;
};
export declare function normalizeKnowledgeWatchConfig(value: any, defaults?: any): KnowledgeWatchConfig;
export declare class KnowledgeDirectoryWatcher {
    private watchers;
    private timers;
    start(): void;
    stopAll(): void;
    listPaths(): KnowledgeWatchConfig[];
    syncDirectory(input: any): Promise<{
        files: number;
        synced: number;
        skipped: number;
    }>;
    watchPath(input: any, restore?: boolean): string;
    private syncFile;
    addPath(input: any): KnowledgeWatchConfig[];
    removePath(dirPath: string): KnowledgeWatchConfig[];
}
export declare const knowledgeDirectoryWatcher: KnowledgeDirectoryWatcher;
export {};
