export declare class KnowledgeDirectoryWatcher {
    private watchers;
    private timers;
    start(): void;
    stopAll(): void;
    listPaths(): string[];
    syncDirectory(dirPath: string): Promise<{
        files: number;
        synced: number;
        skipped: number;
    }>;
    watchPath(dirPath: string, restore?: boolean): string;
    private syncFile;
    addPath(dirPath: string): string[];
    removePath(dirPath: string): string[];
}
export declare const knowledgeDirectoryWatcher: KnowledgeDirectoryWatcher;
