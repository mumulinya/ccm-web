import { type NativeQueryLoopInput, type NativeQueryLoopResult } from "./native-query-loop";
export declare const CCM_MAIN_AGENT_HARNESS_RECEIPT_SCHEMA: "ccm-main-agent-harness-receipt-v1";
export type CcmMainAgentHarnessV1 = {
    scope: "global" | "group" | "project";
    scopeId: string;
    exactSessionId: string;
    generation: number;
    attempt: number;
    identityPolicy: string;
    contextAdapter: string;
    toolPolicy: string;
    permissionPolicy: string;
    memoryAdapter: string;
    executionPolicy: string;
    presentationAdapter: string;
};
export type CcmMainAgentHarnessReceiptV1 = {
    schema: typeof CCM_MAIN_AGENT_HARNESS_RECEIPT_SCHEMA;
    identityChecksum: string;
    canonicalPayloadChecksum: string;
    toolCatalogChecksum: string;
    lifecycleChecksum: string;
    terminalStatus: string;
    mainLoopModelCalls: number;
    auxiliaryModelCalls: number;
    toolLoopRounds: number;
    toolCallCount: number;
    auxiliaryStages: Array<{
        stage: string;
        calls: number;
        cacheReadInputTokens: number;
        directInputTokens: number;
    }>;
    contentStored: false;
};
export type MainAgentHarnessInput = NativeQueryLoopInput & {
    harness: CcmMainAgentHarnessV1;
    rolloutMode?: "shadow" | "active";
    onHarnessReceipt?: (receipt: CcmMainAgentHarnessReceiptV1) => void;
};
/**
 * The harness owns one and only one native loop invocation. Shadow mode compares
 * deterministic identity/tool/canonical projections; it never calls the model or
 * tools a second time.
 */
export declare function runMainAgentHarness(input: MainAgentHarnessInput): Promise<NativeQueryLoopResult & {
    harnessReceipt: CcmMainAgentHarnessReceiptV1;
}>;
export declare function buildMainAgentHarness(input: {
    scope: "global" | "group" | "project";
    scopeId: string;
    exactSessionId: string;
    generation?: number;
    attempt?: number;
}): CcmMainAgentHarnessV1;
