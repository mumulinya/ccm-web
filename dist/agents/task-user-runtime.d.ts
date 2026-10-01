export declare function resolveTaskUserPhase(task: any, fallbackPhase?: string): string;
export declare function buildTaskUserRuntimeStatus(task: any, options?: any): {
    schema: string;
    phase: string;
    phase_label: string;
    terminal: boolean;
    active: boolean;
    waiting: boolean;
    blocker_kind: string;
    status_detail: string;
    next_action: string;
    started_at: string;
    last_activity_at: string;
    completed_at: string;
    queue_position: number;
    review_round: number;
    max_review_rounds: number;
    provider_retry: {
        state: any;
        attempts: number;
        retry_after: any;
    };
    recovery_count: number;
};
export declare function runTaskUserRuntimeSelfTest(): {
    pass: boolean;
    checks: {
        testAgentStageIsVisible: boolean;
        environmentBlockIsActionable: boolean;
        terminalCompletionIsExplicit: boolean;
    };
};
