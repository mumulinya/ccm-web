import type { CcmMainAgentHarnessV1, CcmMainAgentHarnessReceiptV1 } from "./main-agent-harness";
export type CcmMainAgentHarnessParityV1 = {
    schema: "ccm-main-agent-harness-parity-v1";
    scope: "global" | "group" | "project";
    scopeId: string;
    exactSessionId: string;
    mode: "shadow" | "active";
    checks: {
        identity: boolean;
        canonical: boolean;
        toolCatalog: boolean;
        lifecycle: boolean;
    };
    passed: boolean;
    contentStored: false;
};
export declare function mainAgentHarnessRolloutMode(scope: CcmMainAgentHarnessV1["scope"]): "shadow" | "active";
/** Shadow validation is projection-only and never invokes a model or tool. */
export declare function recordMainAgentHarnessParity(input: {
    harness: CcmMainAgentHarnessV1;
    receipt: CcmMainAgentHarnessReceiptV1;
    mode?: "shadow" | "active";
}): CcmMainAgentHarnessParityV1;
export declare function loadMainAgentHarnessRolloutStatus(): any;
