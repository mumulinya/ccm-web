export declare function startTaskAcceptance(task: any, root: string | Record<string, string>): void;
export declare function taskAcceptanceVerificationMetadata(taskId: string, project: string): {
    acceptanceContract?: undefined;
    acceptanceExecutions?: undefined;
} | {
    acceptanceContract: import("./acceptance-contract").AcceptanceContract;
    acceptanceExecutions: {
        taskId: string;
        executionId: string;
        contractChecksum: string;
    }[];
};
/** Called before any lifecycle/session mutation, not after setting done. */
export declare function validateUnifiedTaskAcceptance(task: any, updates: any): string | null;
export declare function unifiedTaskTerminalDecision(task: any, updates: any): {
    checksum: string;
    schema: string;
    task_id: any;
    status: any;
    acceptance_state: any;
    actor: string;
    gate_passed: boolean;
    contract_checksum: string;
    generation: number;
    evidence_registry: {
        evidenceIds: any[] | string[];
        validCount: number;
        staleCount: number;
        acceptance: {
            satisfied: boolean;
            criteria: any[] | {
                criterionId: string;
                description: string;
                expected: string;
                verificationIds: string[];
                status: string;
                freshness: string;
                evidenceIds: string[];
                verifier: string;
                reason: string;
            }[];
            evidenceIds: any[] | string[];
        };
    };
    evidence_checksum: string;
    reason: string;
    decided_at: string;
};
export declare function replayAcceptanceTerminal(task: any, updates: any): any;
export declare function taskAcceptanceProjection(task: any): {
    available: boolean;
    status: string;
    reason: string;
    criteria: any[];
} | {
    terminalReceiptId: any;
    contentStored: boolean;
    status: any;
    canComplete: boolean;
    criteria: any;
    blockedReasons: any;
    available: boolean;
    revision: number;
    reason?: undefined;
};
