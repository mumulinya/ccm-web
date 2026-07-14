type CleanupRisk = "safe" | "danger";
export declare function getCleanupHistory(limit?: number): any[];
export declare function getCleanupSummary(): {
    success: boolean;
    updated_at: string;
    policy: {
        default_retention_days: number;
        retention_options: number[];
        preview_ttl_minutes: number;
    };
    storage: {
        total_bytes: number;
    };
    cards: {
        id: string;
        title: string;
        count: any;
        bytes: number;
        detail: string;
    }[];
    rows: {
        tasks: {
            id: any;
            title: any;
            status: any;
            project: any;
            updated_at: any;
        }[];
        cron: {
            id: any;
            title: any;
            status: string;
            project: any;
            updated_at: any;
        }[];
        project_runs: {
            id: any;
            title: any;
            status: any;
            project: any;
            updated_at: any;
        }[];
        conversations: any[];
        execution_artifacts: {
            id: string;
            title: string;
            type: string;
            count: number;
            bytes: number;
        }[];
        quality_evidence: {
            id: string;
            title: string;
            type: string;
            count: number;
            bytes: number;
        }[];
    };
    actions: {
        target_count: number;
        id: string;
        label: string;
        description: string;
        risk: CleanupRisk;
        irreversible: boolean;
    }[];
    history: any[];
};
export declare function previewCleanupAction(action: string, options?: {
    retention_days?: any;
}): {
    success: boolean;
    error: string;
    preview_token?: undefined;
    expires_at?: undefined;
    action?: undefined;
    policy?: undefined;
    preview?: undefined;
} | {
    success: boolean;
    preview_token: `${string}-${string}-${string}-${string}-${string}`;
    expires_at: string;
    action: {
        target_count: number;
        id: string;
        label: string;
        description: string;
        risk: CleanupRisk;
        irreversible: boolean;
    };
    policy: {
        retention_days: number;
    };
    preview: {
        will_affect: number;
        irreversible: boolean;
        note: string;
        items: {
            id: string;
            title: string;
            status: string;
            project: string;
            updated_at: string;
        }[];
    };
    error?: undefined;
};
export declare function runCleanupAction(action: string, options?: {
    preview_token?: any;
    selected_ids?: any;
}): {
    success: boolean;
    error: string;
    partial?: undefined;
    receipt?: undefined;
} | {
    success: boolean;
    partial: boolean;
    receipt: {
        schema: string;
        id: string;
        action: string;
        label: string;
        operation: string;
        status: string;
        retention_days: number;
        requested_count: number;
        processed_count: number;
        failed_count: number;
        released_bytes: number;
        cleanup: Record<string, number>;
        results: any[];
        failures: any[];
        source: string;
        started_at: string;
        completed_at: string;
    };
    error: string;
};
export {};
