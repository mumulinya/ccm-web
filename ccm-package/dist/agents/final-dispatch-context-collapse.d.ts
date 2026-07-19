export declare const FINAL_DISPATCH_CONTEXT_COLLAPSE_LEDGER_SCHEMA = "ccm-final-dispatch-context-collapse-ledger-v1";
export declare const FINAL_DISPATCH_CONTEXT_COLLAPSE_RECEIPT_SCHEMA = "ccm-final-dispatch-context-collapse-receipt-v1";
export declare const FINAL_DISPATCH_CONTEXT_COLLAPSE_DIR: string;
export declare const FINAL_DISPATCH_CONTEXT_COLLAPSE_MAX_ENTRIES = 24;
export declare const FINAL_DISPATCH_CONTEXT_COLLAPSE_MAX_PROJECTION_TOKENS = 2000;
export declare function projectFinalDispatchRecentContext(context: string, tokenBudget: number): {
    text: string;
    compacted: boolean;
    original_tokens: number;
    projected_tokens: number;
    original_chars: number;
    projected_chars: number;
    omitted_lines: number;
    source_checksum: string;
    projection_checksum: string;
};
export declare function getFinalDispatchContextCollapseFile(groupId: string, groupSessionId: string): string;
export declare function verifyFinalDispatchContextCollapseLedger(ledger: any, expected?: any): {
    valid: boolean;
    issues: string[];
};
export declare function readFinalDispatchContextCollapse(groupId: string, groupSessionId: string): any;
export declare function verifyFinalDispatchContextCollapseReceipt(receipt: any, expected?: any): {
    valid: boolean;
    issues: string[];
};
export declare function projectFinalDispatchContextCollapse(input?: any): {
    applied: boolean;
    reason: string;
    context: string;
    receipt: any;
    ledger: any;
    lifecycleHead?: undefined;
    entry?: undefined;
} | {
    applied: boolean;
    reason: string;
    context: string;
    receipt: any;
    ledger: any;
    lifecycleHead: any;
    entry?: undefined;
} | {
    applied: boolean;
    reason: string;
    context: string;
    receipt: any;
    entry: any;
    ledger: any;
    lifecycleHead?: undefined;
};
export declare function commitFinalDispatchContextCollapse(input?: any): {
    applied: boolean;
    reason: string;
    context: string;
    receipt: any;
    ledger: any;
    entry?: undefined;
} | {
    applied: boolean;
    reason: string;
    context: string;
    receipt: any;
    entry: any;
    ledger: any;
} | {
    applied: boolean;
    reason: string;
    context: string;
    receipt: any;
    lifecycleValidation?: undefined;
    errorCode?: undefined;
} | {
    applied: boolean;
    reason: string;
    context: string;
    receipt: any;
    lifecycleValidation: any;
    errorCode: string;
};
export declare function deleteFinalDispatchContextCollapse(groupId: string, groupSessionId: string): {
    deleted: number;
    groupId: string;
    groupSessionId: string;
    file: string;
};
