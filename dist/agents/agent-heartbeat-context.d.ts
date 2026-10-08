import type { AgentRun } from "./agent-run-types";
import type { AgentHeartbeatContext } from "./agent-governance-types";
export interface HeartbeatContextBuildInput {
    wakeId: string;
    run: AgentRun;
    nativeSessionId?: string;
    runtimeSupportsResume?: boolean;
    contextCursor?: string;
    promptInputTokens?: number;
    promptOutputTokens?: number;
}
/**
 * Builds a redacted, checksum-only context delta. Bodies and provider payloads are
 * deliberately excluded; the runtime receives the actual context through its
 * existing execution path, while the ledger stores only evidence of reuse.
 */
export declare function buildAgentHeartbeatContext(input: HeartbeatContextBuildInput): AgentHeartbeatContext;
