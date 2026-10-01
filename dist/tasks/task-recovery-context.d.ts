import { type TaskContextAnchor, type ContaminationDecision } from "../agents/session-contamination-detector";
/** Read-only. Never create an anchor at the current head: that hides prior contamination. */
export declare function inspectTaskRecoveryContext(task: any): ContaminationDecision & {
    anchor?: TaskContextAnchor;
    headSequence?: number;
};
