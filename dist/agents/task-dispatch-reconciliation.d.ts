export declare function taskDispatchStatus(task: any): "queued" | "completed" | "failed" | "cancelled" | "sending";
export declare function syncTaskDispatchProjection(task: any, read: () => any, mutate: (fn: (store: any) => any) => any, emit: (turn: any, reason: string) => void): any;
export declare function reconcileDispatchCandidates(existing: () => any[], admit: (task: any) => any, sync: (task: any) => any): Promise<{
    admitted: number;
}>;
