/** Main Agent and TestAgent reserve from the same persisted cycle under one
 * cross-process lock. Evidence must be collected before acquiring the lock. */
export declare function reservePersistentAutomaticRework(taskId: string, gaps: string[], evidence: any): {
    task: any;
    allowed: boolean;
    reason: string;
    update: {
        status: string;
        acceptance_state: string;
        status_detail: string;
        rework_exhausted: {
            rounds: number;
            maxRounds: number;
            reason: string;
            at: string;
        };
        rework_round?: undefined;
        rework_max_rounds?: undefined;
        rework_progress?: undefined;
        review_cycle_id?: undefined;
    };
} | {
    task: any;
    allowed: boolean;
    reason: string;
    update: {
        rework_round: number;
        rework_max_rounds: number;
        rework_progress: {
            gapChecksum: string;
            evidenceChecksum: string;
        };
        review_cycle_id: any;
        status?: undefined;
        acceptance_state?: undefined;
        status_detail?: undefined;
        rework_exhausted?: undefined;
    };
};
