/** A blocked Task keeps its specific non-success gate. Never project accepted,
 * pending or model-provided arbitrary state as a blocked terminal receipt. */
export declare function taskBlockedAcceptanceState(task: any, updates: any): string;
export declare function projectBlockedTaskDecision(decision: any, task: any, updates: any): any;
