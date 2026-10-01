export declare const TOOL_RESULT_PROJECTION_SCHEMA = "ccm-tool-result-projection-v1";
/** Content-only, deterministic projection for completed historical evidence. */
export declare function projectCompletedToolResult(value: unknown, options?: {
    maxChars?: number;
    source?: string;
}): {
    value: unknown;
    projected: boolean;
    originalTokens: number;
    projectedTokens: number;
    savedTokens: number;
    sourceChecksum: string;
    projectionVersion: number;
};
export declare function runToolResultProjectionSelfTest(): {
    pass: boolean;
    result: {
        value: unknown;
        projected: boolean;
        originalTokens: number;
        projectedTokens: number;
        savedTokens: number;
        sourceChecksum: string;
        projectionVersion: number;
    };
};
