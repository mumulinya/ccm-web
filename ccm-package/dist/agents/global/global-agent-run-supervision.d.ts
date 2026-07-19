import type { GlobalAgentDecisionState, GlobalAgentRun, GlobalAgentRunStatus } from "./loop";
export declare function createGlobalAgentRunSupervision(deps: {
    [key: string]: any;
}): {
    attachGlobalAgentRunSupervision: (run: GlobalAgentRun, link: {
        mission_id: string;
        supervisor_id: string;
        state?: string;
    }) => GlobalAgentRun;
    completeGlobalAgentSupervision: (id: string, report: any, outcome?: "completed" | "failed" | "cancelled") => any;
    globalSupervisionStateVisibleSummary: (state: any) => {
        status: GlobalAgentRunStatus;
        phase: GlobalAgentDecisionState;
        reply: string;
        summary: string;
        next_action: string;
        timelineType: string;
        timelineStatus: string;
    };
    updateGlobalAgentSupervisionState: (id: string, state: string) => any;
};
