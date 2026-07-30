type CleanupRisk = "safe" | "danger";
export declare function getCleanupHistory(limit?: number): any;
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
        index: {
            schema: string;
            status: string;
            generation: any;
            active_generation: any;
            scanned_at: any;
            stale: boolean;
            progress: any;
            summary: any;
            error: any;
        };
    };
    cards: {
        id: string;
        title: string;
        count: any;
        bytes: any;
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
            count: any;
            bytes: any;
        }[];
        quality_evidence: {
            id: string;
            title: string;
            type: string;
            count: any;
            bytes: any;
        }[];
        uploads: {
            id: any;
            title: any;
            type: string;
            count: any;
            bytes: any;
            updated_at: any;
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
    active_transactions: any;
    history: any;
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
    preview_checksum?: undefined;
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
    preview_checksum: string;
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
export declare function getCleanupTransaction(transactionId: string, options?: {
    offset?: any;
    limit?: any;
}): {
    schema: string;
    transaction_id: any;
    action: any;
    label: any;
    status: any;
    requested_count: any;
    processed_count: any;
    failed_count: any;
    released_bytes: any;
    created_at: any;
    started_at: any;
    completed_at: any;
    updated_at: any;
    error: any;
    cancel_requested: boolean;
    result_page: {
        offset: number;
        limit: number;
        total: any;
        items: any;
        next_offset: any;
    };
};
export declare function runCleanupAction(action: string, options?: {
    preview_token?: any;
    selected_ids?: any;
    confirmation_phrase?: any;
    requested_by?: any;
}): {
    success: boolean;
    error: string;
    code: string;
    transaction_id: any;
} | {
    success: boolean;
    transaction_id: string;
    error?: undefined;
    code?: undefined;
} | {
    success: boolean;
    error: string;
    code?: undefined;
    accepted?: undefined;
    transaction_id?: undefined;
    transaction?: undefined;
} | {
    success: boolean;
    error: string;
    code: string;
    accepted?: undefined;
    transaction_id?: undefined;
    transaction?: undefined;
} | {
    success: boolean;
    accepted: boolean;
    transaction_id: string;
    transaction: {
        schema: string;
        transaction_id: any;
        action: any;
        label: any;
        status: any;
        requested_count: any;
        processed_count: any;
        failed_count: any;
        released_bytes: any;
        created_at: any;
        started_at: any;
        completed_at: any;
        updated_at: any;
        error: any;
        cancel_requested: boolean;
        result_page: {
            offset: number;
            limit: number;
            total: any;
            items: any;
            next_offset: any;
        };
    };
    error?: undefined;
    code?: undefined;
};
export declare function cancelCleanupTransaction(transactionId: string): {
    success: boolean;
    error: string;
    transaction?: undefined;
} | {
    success: boolean;
    transaction: {
        schema: string;
        transaction_id: any;
        action: any;
        label: any;
        status: any;
        requested_count: any;
        processed_count: any;
        failed_count: any;
        released_bytes: any;
        created_at: any;
        started_at: any;
        completed_at: any;
        updated_at: any;
        error: any;
        cancel_requested: boolean;
        result_page: {
            offset: number;
            limit: number;
            total: any;
            items: any;
            next_offset: any;
        };
    };
    error?: undefined;
};
export declare function resumeCleanupTransaction(transactionId: string): {
    success: boolean;
    error: string;
    transaction?: undefined;
    resumed?: undefined;
} | {
    success: boolean;
    transaction: {
        schema: string;
        transaction_id: any;
        action: any;
        label: any;
        status: any;
        requested_count: any;
        processed_count: any;
        failed_count: any;
        released_bytes: any;
        created_at: any;
        started_at: any;
        completed_at: any;
        updated_at: any;
        error: any;
        cancel_requested: boolean;
        result_page: {
            offset: number;
            limit: number;
            total: any;
            items: any;
            next_offset: any;
        };
    };
    error?: undefined;
    resumed?: undefined;
} | {
    success: boolean;
    resumed: boolean;
    transaction: {
        schema: string;
        transaction_id: any;
        action: any;
        label: any;
        status: any;
        requested_count: any;
        processed_count: any;
        failed_count: any;
        released_bytes: any;
        created_at: any;
        started_at: any;
        completed_at: any;
        updated_at: any;
        error: any;
        cancel_requested: boolean;
        result_page: {
            offset: number;
            limit: number;
            total: any;
            items: any;
            next_offset: any;
        };
    };
    error?: undefined;
};
export declare function recoverCleanupTransactions(): {
    recovered: number;
};
export {};
