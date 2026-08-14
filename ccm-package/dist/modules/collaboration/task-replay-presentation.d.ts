export type TaskReplayChapterKind = "requirement" | "planning" | "implementation" | "verification" | "rework" | "delivery";
export interface TaskReplayPresentationInput {
    root: any;
    tasks: any[];
    plans: any[];
    workItems: any[];
    deliveries: any[];
    evidence: any[];
    events: any[];
    status: string;
    acceptanceState: string;
    startedAt: string;
    finishedAt: string;
}
export declare function buildTaskReplayPresentation(input: TaskReplayPresentationInput): {
    schema: string;
    outcome: {
        status: string;
        headline: string;
        summary: string;
        currentStage: string;
        currentStageLabel: string;
        nextAction: string;
        unresolvedIssueCount: number;
        acceptance: {
            total: number;
            satisfied: number;
            stale: number;
            failed: number;
            notRun: number;
        };
    };
    chapters: {
        kind: TaskReplayChapterKind;
        title: string;
        status: string;
        summary: string;
        startedAt: any;
        completedAt: any;
        durationMs: number;
        eventIds: string[];
        evidenceIds: string[];
        taskIds: string[];
    }[];
    acceptanceMatrix: {
        criterionId: string;
        description: string;
        status: "failed" | "stale" | "not_run" | "satisfied";
        verifier: string;
        evidenceIds: string[];
        freshness: "unknown" | "current" | "stale";
        reason: string;
    }[];
    attempts: any[];
    issues: {
        issueId: string;
        summary: string;
        status: string;
        project: string;
        foundAt: string;
        resolvedAt: string;
        resolution: string;
        evidenceIds: string[];
    }[];
    recoveryJourney: any[];
    integrity: {
        level: string;
        expectedSources: string[];
        observedSources: string[];
        gaps: {
            source: string;
            label: string;
            reason: string;
        }[];
    };
    causalChain: {
        nodes: any[];
        edges: any[];
    };
    attemptComparisons: {
        workItemId: string;
        project: any;
        attempts: {
            attempt: any;
            status: any;
            accepted: boolean;
            superseded: boolean;
            summary: any;
            failureReason: any;
            filesChanged: any;
            verificationCount: any;
            evidenceIds: any;
        }[];
    }[];
    actionCenter: {
        id: string;
        taskId: string;
        kind: string;
        label: any;
        enabled: boolean;
        disabledReason: string;
        revision: number;
        generation: number;
        bindingChecksum: string;
    }[];
    generatedAt: string;
    checksum: string;
    contentStored: boolean;
};
export declare function runTaskReplayPresentationSelfTest(): {
    schema: string;
    pass: boolean;
    checks: {
        schema: boolean;
        six_chapters: boolean;
        acceptance_verified: boolean;
        historical_failure_resolved: boolean;
        attempt_preserved: boolean;
        integrity_present: boolean;
        causal_chain_present: boolean;
        no_content: boolean;
    };
};
