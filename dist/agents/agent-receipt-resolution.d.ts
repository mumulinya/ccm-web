import type { AgentRun } from "./agent-run-types";
export type AgentReceiptResolution = {
    status: "resolved" | "not_found" | "ambiguous" | "identity_mismatch";
    run: AgentRun | null;
    candidates: AgentRun[];
    matchedBy: "run_id" | "execution_id" | "session_attempt" | "task_id" | "none";
    reason?: string;
};
export declare function resolveAgentRunFromReceipt(receipt: any): AgentReceiptResolution;
