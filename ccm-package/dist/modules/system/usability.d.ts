import { IncomingMessage, ServerResponse } from "http";
export declare function archiveOldUsabilityHistory(now?: number): {
    changed: number;
    retention_days: number;
};
export declare function runUsabilityGovernance(): {
    archive: {
        changed: number;
        retention_days: number;
    };
    sessions: {
        closed: number;
    };
    audit_file: string;
};
export declare function buildUsabilityWorkbench(options?: {
    runArchive?: boolean;
}): {
    generated_at: string;
    archive: {
        changed: number;
        retention_days: number;
    };
    counts: {
        [k: string]: number;
    };
    attention_counts: {
        confirmation: number;
        failed: number;
        supplement: number;
    };
    attention: any[];
    active: any[];
    completed: any[];
    notifications: {
        id: string;
        level: string;
        task: any;
    }[];
    resources: {
        projects: {
            name: any;
            running: boolean;
            agent: any;
            work_dir: any;
            actions: string[];
        }[];
        groups: {
            id: any;
            name: any;
            members: any;
        }[];
        cron: {
            id: any;
            name: any;
            enabled: boolean;
            next_run: any;
            last_status: any;
            actions: string[];
        }[];
    };
    onboarding: {
        empty: boolean;
        has_tasks: boolean;
    };
};
export declare function startUsabilityArchiveScheduler(): void;
export declare function stopUsabilityArchiveScheduler(): void;
export declare function handleUsabilityApi(pathname: string, req: IncomingMessage, res: ServerResponse): boolean;
