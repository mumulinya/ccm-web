export type WorkActorType = "user" | "agent" | "test_agent" | "system";
export type WorkJournalEvent = {
    schema: string;
    id: string;
    at: string;
    type: string;
    state: string;
    actor_type: WorkActorType;
    actor_label: string;
    source: string;
    source_label: string;
    title: string;
    detail: string;
    task_id: string;
    group_id: string;
    project: string;
    work_id: string;
    evidence_level: "strong" | "medium";
    evidence_ref: string;
    metadata: any;
};
export declare function projectTaskWorkEvents(tasks?: any[]): WorkJournalEvent[];
export declare function projectConversationWorkEvents(): WorkJournalEvent[];
export declare function projectTestAgentWorkEvents(tasks?: any[]): WorkJournalEvent[];
export declare function collectProjectedWorkEvents(): WorkJournalEvent[];
export declare function readWorkJournalEvents(): WorkJournalEvent[];
export declare function mergeWorkJournalEvents(existing: WorkJournalEvent[], candidates: WorkJournalEvent[]): {
    events: WorkJournalEvent[];
    appended: WorkJournalEvent[];
};
export declare function syncWorkJournal(): {
    schema: string;
    file: string;
    existing: number;
    projected: number;
    appended: number;
    total: number;
    events: WorkJournalEvent[];
};
export declare function localWorkDateKey(date?: Date): string;
export declare function parseWorkDay(dateKey?: string): {
    key: string;
    start: Date;
    end: Date;
};
export declare function generateEvidenceDailyReport(dateKey?: string, inputEvents?: WorkJournalEvent[]): any;
export declare function workWeekRange(dateKey?: string): {
    id: string;
    start: Date;
    end: Date;
    start_key: string;
    end_key: string;
};
export declare function generateEvidenceWeeklyReport(dateKey?: string): any;
export declare function listWorkJournalEvents(options?: any): WorkJournalEvent[];
export declare function getWorkJournalAudit(options?: {
    sync?: boolean;
}): {
    schema: string;
    success: boolean;
    file: string;
    append_only: boolean;
    auto_cleanup: boolean;
    total: number;
    appended: number;
    source_counts: Record<string, number>;
    actor_counts: Record<string, number>;
    earliest_at: string;
    latest_at: string;
    self_test: {
        pass: boolean;
        checks: {
            appendOnlyDedup: boolean;
            historicalCompletionNotBackdated: boolean;
            fileEvidenceBoundToCompletion: boolean;
            verificationEvidenceBoundToCompletion: boolean;
            ownershipSeparated: boolean;
            workbenchAttributedToUser: boolean;
        };
    };
};
export declare function runWorkJournalSelfTest(): {
    pass: boolean;
    checks: {
        appendOnlyDedup: boolean;
        historicalCompletionNotBackdated: boolean;
        fileEvidenceBoundToCompletion: boolean;
        verificationEvidenceBoundToCompletion: boolean;
        ownershipSeparated: boolean;
        workbenchAttributedToUser: boolean;
    };
};
