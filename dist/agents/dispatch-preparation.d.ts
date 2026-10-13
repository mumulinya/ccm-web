/** Compile only a real model plan and actually read source evidence. Never
 * derive verification commands or success assertions from task prose. */
export declare function compilePreparedDispatch(input: {
    task: any;
    plan: any;
    source: any;
    project?: string;
    agentType?: string;
}): {
    plan: import("./implementation-plan").CcmImplementationPlanV2;
    contract: import("./plan-dispatch-contract").CcmPlanDispatchContractV1;
};
export declare function prepareDirectDispatchTask(task: any, workDir: string, agentType: string): Promise<any>;
