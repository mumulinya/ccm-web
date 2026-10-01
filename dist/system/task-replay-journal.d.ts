export declare function appendTaskReplayJournalEvent(taskId: string, value: any, options?: {
    rootDir?: string;
}): {
    schema: string;
    task_id: string;
    recorded_at: string;
    event: any;
};
export declare function listTaskReplayJournalEvents(taskIds: string[], options?: {
    rootDir?: string;
}): any[];
export declare function purgeTaskReplayJournalForTask(taskId: string, options?: {
    rootDir?: string;
}): {
    removed: boolean;
    error?: undefined;
} | {
    removed: boolean;
    error: any;
};
export declare function runTaskReplayJournalSelfTest(options?: {
    rootDir?: string;
}): {
    schema: string;
    pass: boolean;
    rows: number;
    purged: boolean;
};
