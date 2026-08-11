export declare function cronPrincipal(req: any): {
    userId: string;
    role: string;
    admin: boolean;
};
export declare function cronTarget(job: any): {
    type: "project" | "group";
    id: string;
};
export declare function cronTargetAccess(userId: string, role: string, job: any, level?: "use" | "manage"): boolean;
export declare function canViewCronJob(req: any, job: any): boolean;
export declare function canManageCronJob(req: any, job: any): boolean;
export declare function assertCronTargetAccess(req: any, job: any, level?: "use" | "manage"): void;
export declare function assertCronManage(req: any, job: any): void;
export declare function assertCronTemplateAccess(req: any, job: any): void;
export declare function cronExecutionAuthorization(job: any): {
    allowed: boolean;
    ownerId: string;
    role: string;
    legacy: boolean;
    reason?: undefined;
} | {
    allowed: boolean;
    ownerId: string;
    role: string;
    reason: string;
    legacy?: undefined;
} | {
    allowed: boolean;
    ownerId: string;
    role: "admin";
    legacy?: undefined;
    reason?: undefined;
} | {
    allowed: boolean;
    ownerId: string;
    role: "user";
    legacy?: undefined;
    reason?: undefined;
};
export declare function resolveCronTemplate(job: any): {
    template: import("../collaboration/task-templates").TaskTemplate;
    rendered: {
        title: string;
        instructions: string;
        values: Record<string, string>;
        missing: string[];
        valid: boolean;
    };
    title: string;
    instructions: string;
};
export declare function previewCronSchedule(job: any, count?: number, from?: Date): {
    schema: string;
    valid: boolean;
    scheduleError: any;
    timezone: any;
    nextRuns: string[];
    renderedTask: {
        title: string;
        instructions: string;
        templateId: string;
        templateRevision: number;
    };
    policies: {
        overlap: any;
        misfire: any;
        catchUpLimit: any;
        consecutiveFailureLimit: any;
    };
    contentStored: boolean;
};
export declare function activeCronRuns(job: any): any;
export declare function resolveCronOverlap(job: any): {
    action: string;
    activeRuns: any;
    dependencyTaskIds: unknown[];
    parallelSafe: boolean;
    reason: string;
} | {
    action: string;
    activeRuns: any;
    dependencyTaskIds: unknown[];
    parallelSafe: boolean;
    reason?: undefined;
};
export declare function missedCronOccurrences(job: any, now?: Date): string[];
export declare function latestMissedCronOccurrence(job: any, now?: Date): string;
export declare function occurrenceSlot(job: any, scheduledFor: string): string;
export declare function cronFailureDecision(job: any): {
    consecutiveFailures: number;
    paused: boolean;
    patch: {
        consecutive_failures: number;
        enabled: boolean;
        next_run: any;
        paused_reason: string;
        last_status: string;
    } | {
        consecutive_failures: number;
        enabled?: undefined;
        next_run?: undefined;
        paused_reason?: undefined;
        last_status?: undefined;
    };
};
export declare function cronSuccessPatch(): {
    consecutive_failures: number;
    paused_reason: string;
};
