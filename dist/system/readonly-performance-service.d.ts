export declare function readonlyWorkerSnapshot(): {
    workers: number;
    pending: number;
    capacity: number;
};
export declare function stopReadonlyPerformanceWorker(): void;
export declare function readProjectSourcesOffThread(project: string, root: string, operation: string, args?: any, signal?: AbortSignal): Promise<any>;
export declare function collectGitEvidenceOffThread(root: string): Promise<any>;
export declare function readConversationJsonPageOffThread(file: string, query: any): Promise<any>;
export declare function fingerprintFileOffThread(file: string): Promise<any>;
export declare function parsePdfOffThread(source: string | Buffer): Promise<any>;
export declare function prepareVisionFileOffThread(file: string): Promise<any>;
export declare function readTaskRunSummaryOffThread(file: string, taskIds?: string[]): Promise<any>;
