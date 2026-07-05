export declare function extractContractSyncHints(task: any, summary?: any): {
    required: boolean;
    status: string;
    summary: string;
    endpoints: string[];
    files: string[];
    changes: any;
};
export declare function buildAckPreflightReview(task: any, receipts?: any[], orders?: any[]): {
    status: string;
    rows: {
        agent: any;
        status: string;
        reason: string;
        understood_goal: string;
        planned_scope: any[];
        forbidden_scope: any[];
        verification_plan: any[];
        unclear: any[];
    }[];
    rejected: {
        agent: any;
        status: string;
        reason: string;
        understood_goal: string;
        planned_scope: any[];
        forbidden_scope: any[];
        verification_plan: any[];
        unclear: any[];
    }[];
    next_action: string;
};
export declare function buildContractTransferPlan(contractSync: any, orders?: any[]): {
    required: boolean;
    status: string;
    rows: any;
    next_action: string;
};
export declare function getTaskAckRewriteRows(task: any): any;
export declare function getTaskContractInjectionRows(task: any): {
    sync: {
        required: boolean;
        status: string;
        summary: string;
        endpoints: string[];
        files: string[];
        changes: any;
    };
    transfer: {
        required: boolean;
        status: string;
        rows: any;
        next_action: string;
    };
    rows: any[];
};
export declare function evaluateContractInjectionGate(rows?: any[], assignments?: any[]): {
    required: boolean;
    pass: boolean;
    rows: any[];
    missing: any[];
    status: string;
    summary: string;
};
