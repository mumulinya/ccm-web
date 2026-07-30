import { IncomingMessage, ServerResponse } from "http";
type UsabilityActionDeps = {
    ctx: any;
    archiveTask: (id: string, reason?: string) => any;
    continueTaskWithMessage: (id: string, message: string, ctx: any, options?: any) => any;
    enqueueTask: (id: string, ctx: any) => any;
    removeTaskFromQueues: (id: string) => number;
    retryTask: (id: string, ctx: any, reason?: string, autoExecute?: boolean) => any;
};
export declare function archiveOldUsabilityHistory(now?: number): {
    changed: number;
    conflicts: number;
    retention_days: number;
};
export declare function runUsabilityGovernance(): {
    archive: {
        changed: number;
        conflicts: number;
        retention_days: number;
    };
    sessions: {
        closed: number;
    };
    audit_file: string;
};
export declare function buildUsabilityWorkbench(options?: {
    runArchive?: boolean;
    principal?: any;
}): {
    notifications: {
        id: string;
        level: string;
        task: any;
    }[];
    pages: {
        active: {
            total: number;
            page_size: number;
            next_cursor: string;
            truncated: boolean;
        };
        completed: {
            total: number;
            page_size: number;
            next_cursor: string;
            truncated: boolean;
        };
        projects: {
            total: number;
            page_size: number;
            next_cursor: string;
            truncated: boolean;
        };
        groups: {
            total: number;
            page_size: number;
            next_cursor: string;
            truncated: boolean;
        };
        cron: {
            total: number;
            page_size: number;
            next_cursor: string;
            truncated: boolean;
        };
    };
    capabilities: {
        role: any;
        task_execute: boolean;
        project_runtime: boolean;
        project_git: boolean;
        cron_manage: boolean;
        required_roles: {
            task_execute: string;
            project_runtime: string;
            cron_manage: string;
        };
    };
    onboarding: {
        empty: boolean;
        has_tasks: boolean;
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
    resources: {
        projects: {
            name: any;
            display_name: string;
            agent: any;
            agent_connection: {
                connected: boolean;
            };
            runtime_summary: any;
            actions: {
                agent: string[];
                runtime: string[];
            };
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
    schema: string;
    version: number;
    generated_at: string;
    archive: {
        changed: number;
        conflicts: number;
        retention_days: number;
    };
    checksum: string;
};
export declare function startUsabilityArchiveScheduler(): void;
export declare function stopUsabilityArchiveScheduler(): void;
export declare function handleUsabilityApi(pathname: string, req: IncomingMessage, res: ServerResponse, parsed?: any, actionDeps?: UsabilityActionDeps): boolean;
export {};
