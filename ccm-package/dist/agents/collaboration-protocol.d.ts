export declare const AGENT_COLLABORATION_LIMITS: {
    maxQuestionsPerTask: number;
    maxPairRepeats: number;
    maxDepth: number;
    maxAnswerChars: number;
    defaultDeadlineMs: number;
};
export declare function collaborationQuestionFingerprint(input: any): string;
export declare function selectCollaborationTarget(input: {
    request: any;
    group: any;
    sourceProject: string;
    profiles?: Record<string, any>;
    openItems?: any[];
}): {
    targetName: any;
    strategy: string;
    candidates: any;
};
export declare function buildCollaborationQuestionContract(input: any): any;
export declare function evaluateCollaborationQuestionAdmission(contract: any, existingItems?: any[]): {
    allowed: boolean;
    code: string;
    reason: string;
    existing_id?: undefined;
} | {
    allowed: boolean;
    code: string;
    reason: string;
    existing_id: any;
};
export declare function evaluateCollaborationAnswer(answer: any, contract: any, siblingAnswers?: any[]): {
    status: string;
    accepted: boolean;
    score: number;
    evidence: string[];
    polarity: string;
    conflicts_with: any[];
    reason: string;
    arbitrated_by: string;
    arbitrated_at: string;
};
export declare function evaluateAdvisoryPermissionBoundary(fileChanges?: any[], beforeTools?: any, afterTools?: any): {
    pass: boolean;
    mode: string;
    violations: ({
        type: string;
        path: string;
    } | {
        type: string;
        detail: string;
    })[];
    reason: string;
};
export declare function evaluateCollaborationTimeout(contract: any, now?: Date | string | number): {
    timed_out: boolean;
    status: string;
    deadline_at: string;
    checked_at: string;
    recovery: string;
    reason: string;
};
export declare function runAgentCollaborationProtocolSelfTest(): {
    pass: boolean;
    checks: {
        capabilityRouting: boolean;
        taskAndExecutionBound: boolean;
        permissionDoesNotExpand: boolean;
        admissionPasses: boolean;
        duplicateStops: boolean;
        evidenceAccepted: boolean;
        conflictingAnswerStops: boolean;
        timeoutReturnsToCoordinator: boolean;
        sideEffectDetected: boolean;
    };
    route: {
        targetName: any;
        strategy: string;
        candidates: any;
    };
    contract: any;
    admission: {
        allowed: boolean;
        code: string;
        reason: string;
        existing_id?: undefined;
    } | {
        allowed: boolean;
        code: string;
        reason: string;
        existing_id: any;
    };
    duplicate: {
        allowed: boolean;
        code: string;
        reason: string;
        existing_id?: undefined;
    } | {
        allowed: boolean;
        code: string;
        reason: string;
        existing_id: any;
    };
    answer: {
        status: string;
        accepted: boolean;
        score: number;
        evidence: string[];
        polarity: string;
        conflicts_with: any[];
        reason: string;
        arbitrated_by: string;
        arbitrated_at: string;
    };
    opposing: {
        status: string;
        accepted: boolean;
        score: number;
        evidence: string[];
        polarity: string;
        conflicts_with: any[];
        reason: string;
        arbitrated_by: string;
        arbitrated_at: string;
    };
    timeout: {
        timed_out: boolean;
        status: string;
        deadline_at: string;
        checked_at: string;
        recovery: string;
        reason: string;
    };
    permissionOk: {
        pass: boolean;
        mode: string;
        violations: ({
            type: string;
            path: string;
        } | {
            type: string;
            detail: string;
        })[];
        reason: string;
    };
    permissionDenied: {
        pass: boolean;
        mode: string;
        violations: ({
            type: string;
            path: string;
        } | {
            type: string;
            detail: string;
        })[];
        reason: string;
    };
};
