export declare function retainPendingTaskSourceRecord(taskId: string, record: any): string;
export declare function hasPendingTaskSourceSync(taskId: string): boolean;
export declare function completePendingTaskSourceRecord(file: string): void;
/** Retry saved, already-authorized source records even if the source chat was removed. */
export declare function reconcilePendingTaskSourceSync(taskId: string): {
    repaired: number;
};
