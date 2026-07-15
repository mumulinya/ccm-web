export declare const PROVIDER_NATIVE_COMPACT_EXECUTION_RECEIPT_VERSION = 2;
export declare const PROVIDER_NATIVE_COMPACT_EXECUTION_RECEIPT_SCHEMA = "ccm-provider-native-compact-execution-receipt-v2";
export declare const PROVIDER_NATIVE_COMPACT_EXECUTION_LEDGER_SCHEMA = "ccm-provider-native-compact-execution-ledger-v2";
export declare function getProviderNativeCompactExecutionReceiptLedgerFile(groupId: string, groupSessionId?: string): string;
export declare function verifyProviderNativeCompactExecutionReceipt(receipt: any, expected?: any): {
    valid: boolean;
    issues: string[];
    expected_checksum: string;
};
export declare function buildProviderNativeCompactExecutionReceipt(input?: any): any;
export declare function readProviderNativeCompactExecutionReceiptLedger(groupId: string, groupSessionId?: string): any;
export declare function recordProviderNativeCompactExecutionReceipt(input?: any): {
    recorded: boolean;
    verification: {
        valid: boolean;
        issues: string[];
        expected_checksum: string;
    };
    receipt: any;
} | {
    recorded: boolean;
    verification: {
        valid: boolean;
        issues: string[];
    };
    receipt: any;
} | {
    sessionCapacityOutcome: any;
    recorded: boolean;
    updated: boolean;
    file: string;
    receipt: any;
    totals: unknown;
    verification: {
        valid: boolean;
        issues: string[];
        expected_checksum: string;
    };
};
export declare function buildProviderNativeCompactExecutionReceiptSummary(groupId: string, options?: any): {
    schema: string;
    version: number;
    groupId: string;
    groupSessionId: string;
    target_project: string;
    ledger_file: any;
    status: string;
    entry_count: any;
    totals: any;
    entries: any;
    native_applied_entries: any;
    failed_entries: any;
    accepted_unverified_entries: any;
    advisory_entries: any;
    recent_entries: any;
    updatedAt: any;
};
