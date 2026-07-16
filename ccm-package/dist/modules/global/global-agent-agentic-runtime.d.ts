import type { CollabCtx } from "../collaboration/collaboration";
import type { GlobalAgentDecision, GlobalAgentLoopRuntime, GlobalAgentRun } from "../../agents/global/loop";
import type { GlobalMissionSupervisorRuntime } from "../../agents/global/mission-supervisor";
import type { RequirementIngestionResult } from "../requirements/source-ingestion";
type LocalIntentResult = any;
export declare function createGlobalAgentAgenticRuntime(deps: any): {
    hasExplicitGlobalWriteAuthorization: (message: string) => boolean;
    verifyGlobalAgentContextBoundary: (context?: any) => {
        schema: string;
        valid: boolean;
        issues: string[];
        expectedChecksum: string;
    };
    buildGlobalAgentGroupMemoryModelContext: (bundle: any, options?: any) => {
        schema: string;
        source_schema: string;
        generated_at: string;
        query: string;
        total_group_count: number;
        selected_group_count: number;
        selected_groups: any;
        memory_policy: any;
        rendered_text: string;
        context_budget: {
            max_chars: number;
            used_chars: number;
            approximate_tokens: number;
            source_bytes: number;
            truncated: boolean;
            full_context_available_via: string;
        };
    };
    buildAgenticContext: (query?: string, sessionId?: string, options?: any) => any;
    localActionToAgenticDecision: (localIntent: LocalIntentResult | null, run: GlobalAgentRun) => GlobalAgentDecision | null;
    createMissionSupervisorRuntime: (ctx: CollabCtx) => GlobalMissionSupervisorRuntime;
    createAgenticRuntime: (baseUrl: string, ctx: CollabCtx, input?: {
        localIntent?: LocalIntentResult | null;
        onEvent?: (event: any) => void;
        sourceIngestion?: RequirementIngestionResult | null;
    }) => GlobalAgentLoopRuntime;
    runAgenticGlobalRequest: (baseUrl: string, ctx: CollabCtx, input: {
        message: string;
        history?: any[];
        sessionId?: string;
        source?: string;
        traceId?: string;
        clarificationRunId?: string;
        onEvent?: (event: any) => void;
        sourceIngestion?: RequirementIngestionResult | null;
    }) => Promise<any>;
    resumeGlobalAgentLoopsForServer: (ctx: CollabCtx, port: number) => Promise<any>;
    startGlobalMissionSupervisionForServer: (ctx: CollabCtx) => any;
    bootstrapGlobalAgentMemoryForServer: () => {
        total: any;
        migrated: number;
        results: any[];
    };
    stopGlobalMissionSupervisionForServer: () => void;
};
export {};
