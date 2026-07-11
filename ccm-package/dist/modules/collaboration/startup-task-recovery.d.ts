export type StartupTaskRecoveryMode = "auto" | "manual" | "skip";
export type StartupTaskRecoveryDecision = {
    schema: "ccm-startup-task-recovery-decision-v1";
    mode: StartupTaskRecoveryMode;
    reason_code: string;
    reason: string;
    authorization_preserved: boolean;
    authorization_evidence: string[];
    requires_user: boolean;
    candidate: boolean;
    previous_status: string;
    user_headline: string;
    user_next_action: string;
};
export declare function buildStartupTaskRecoveryDecision(task: any, forceAuto?: boolean): StartupTaskRecoveryDecision;
export declare function buildStartupTaskRecoveryPlan(tasks?: any[], forceAuto?: boolean): {
    schema: string;
    entries: {
        task: any;
        decision: StartupTaskRecoveryDecision;
    }[];
    auto: {
        task: any;
        decision: StartupTaskRecoveryDecision;
    }[];
    manual: {
        task: any;
        decision: StartupTaskRecoveryDecision;
    }[];
    skipped: {
        task: any;
        decision: StartupTaskRecoveryDecision;
    }[];
};
export declare function runStartupTaskRecoveryDecisionSelfTest(): {
    pass: boolean;
    checks: {
        startedAuthorizedTaskAutoResumes: boolean;
        confirmedQueuedTaskAutoResumes: boolean;
        awaitingConfirmationStaysManual: boolean;
        userPauseStaysManual: boolean;
        runtimeDebtStaysManual: boolean;
        missingAuthorizationStaysManual: boolean;
        startupManualHoldNeedsExplicitResume: boolean;
        explicitResumeCanReleaseStartupHold: boolean;
        mixedBatchIsPartitioned: boolean;
        userCopyHidesTechnicalEvidence: boolean;
    };
    samples: {
        started: StartupTaskRecoveryDecision;
        queuedConfirmed: StartupTaskRecoveryDecision;
        awaitingConfirmation: StartupTaskRecoveryDecision;
        userPaused: StartupTaskRecoveryDecision;
        runtimeDebt: StartupTaskRecoveryDecision;
        missingAuthorization: StartupTaskRecoveryDecision;
        heldWithoutOverride: StartupTaskRecoveryDecision;
        heldWithOverride: StartupTaskRecoveryDecision;
    };
};
