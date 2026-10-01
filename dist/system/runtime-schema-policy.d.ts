export type CcmRuntimeSchemaSupportPolicyV1 = {
    domain: string;
    currentSchemas: string[];
    retiredSchemas: string[];
    behavior: "ignore_and_report";
};
export type CcmRetiredRuntimeDataSummaryV1 = {
    domain: string;
    recordCount: number;
    fileCount: number;
    bytes: number;
    retiredSchemas: string[];
    deletable: true;
    contentStored: false;
};
export declare const CCM_RUNTIME_SCHEMA_SUPPORT_POLICIES: CcmRuntimeSchemaSupportPolicyV1[];
export declare function runtimeSchemaState(schema: unknown, domain?: string): "current" | "unknown" | "retired";
export declare function acceptsCurrentRuntimeSchema(domain: string, schema: unknown): boolean;
export declare function stripRetiredRuntimeValues(value: any, retiredSchemasInput: Iterable<string>): {
    value: any;
    rootRemoved: boolean;
    removedRecords: number;
};
type RetiredCandidate = {
    id: string;
    domain: string;
    file: string;
    bytes: number;
    recordCount: number;
    schemas: string[];
    fingerprint: string;
};
export declare function scanRetiredRuntimeData(): {
    summaries: {
        domain: string;
        recordCount: number;
        fileCount: number;
        bytes: number;
        retiredSchemas: string[];
        deletable: true;
        contentStored: false;
    }[];
    candidates: RetiredCandidate[];
    totals: {
        records: number;
        files: number;
        bytes: number;
    };
};
export declare function publicRetiredRuntimeCandidates(): {
    id: string;
    domain: string;
    bytes: number;
    recordCount: number;
    retiredSchemas: string[];
    fingerprint: string;
    contentStored: false;
}[];
export declare function purgeRetiredRuntimeCandidate(id: string, expectedFingerprint?: string): {
    status: string;
    cleanup: {
        retired_runtime_files: number;
        retired_runtime_records: number;
        retired_runtime_bytes: number;
    };
};
export {};
