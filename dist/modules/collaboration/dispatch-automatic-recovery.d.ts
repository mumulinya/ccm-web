/** Watchdogs are recovery requests, never authorization for a new review cycle. */
export declare function requestAutomaticDispatchRecovery(taskId: string, reason: string): {
    success: boolean;
    status: number;
    code: string;
    error: any;
    task: any;
    scheduled?: undefined;
    queued?: undefined;
    run_id?: undefined;
} | {
    success: boolean;
    scheduled: boolean;
    queued: boolean;
    run_id: string;
    task: any;
    status?: undefined;
    code?: undefined;
    error?: undefined;
};
