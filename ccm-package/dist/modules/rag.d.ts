export declare function rebuildIndex(): Promise<void>;
export declare function queryKnowledgeBase(query: string, limit?: number, filterTags?: string[]): string;
declare class RagWatcher {
    private watchers;
    private debounceTimers;
    start(): void;
    stopAll(): void;
    watchPath(dirPath: string): void;
    unwatchPath(dirPath: string): void;
}
export declare const ragWatcher: RagWatcher;
export declare function handleRagApi(pathname: string, req: any, res: any, parsed: any): boolean;
export {};
