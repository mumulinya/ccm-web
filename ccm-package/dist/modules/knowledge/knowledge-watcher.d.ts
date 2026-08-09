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
    syncDirectory(input: any, rebuildIndex?: boolean): Promise<{
        files: number;
        synced: number;
        skipped: number;
        removed: number;
    }>;
    private registerWatcher;
    watchPath(input: any): string;
    private syncFile;
    addPath(input: any): Promise<{
        paths: KnowledgeWatchConfig[];
        sync: {
            files: number;
            synced: number;
            skipped: number;
            removed: number;
        };
    }>;
    removePath(dirPath: string): KnowledgeWatchConfig[];
}
export declare const knowledgeDirectoryWatcher: KnowledgeDirectoryWatcher;
export {};
