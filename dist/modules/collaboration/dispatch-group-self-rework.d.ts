/** Group light/standard repairs share the same persisted quota as project
 * and independent review. Re-read evidence after each real worker dispatch. */
export declare function runGroupDispatchSelfReview(input: {
    taskId: string;
    projects: any[];
    policy: any;
    light: boolean;
    outputs: string[];
    repair: (round: number, gaps: string[]) => Promise<string[]>;
}): Promise<any>;
