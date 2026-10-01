import type { AgentRuntimeStructuredEvent } from "../agents/runtime-structured-events";
import type { CcmLiveWorkspaceChangesV1 } from "./live-workspace-changes";
export declare function publishLiveWorkspaceChanges(identity: AgentRuntimeStructuredEvent | Record<string, any>, receipt: CcmLiveWorkspaceChangesV1): import("./user-visible-agent-events").UserVisibleAgentEvent;
export declare function projectAgentRuntimeStructuredEvent(event: AgentRuntimeStructuredEvent): import("./user-visible-agent-events").UserVisibleAgentEvent;
export declare function startAgentProgressFallback(event: AgentRuntimeStructuredEvent, timeoutMs?: number): () => void;
export declare function markAgentReportedSemanticProgress(agentRunId: string, generation: number, attempt: number): void;
export declare function stopAgentProgressFallback(keyOrRunId: string, generation?: number, attempt?: number): void;
