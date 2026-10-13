export declare function taskCheckpointSnapshot(): {
    active: number;
    completed: number;
    failures: number;
    mode: string;
};
export declare function checkpointTaskStoreAsync(): Promise<void>;
export declare function startTaskStoreCheckpoints(): void;
export declare function stopTaskStoreCheckpoints(): void;
