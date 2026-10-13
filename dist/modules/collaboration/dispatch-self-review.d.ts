/** Initial verification is free. Only a new development dispatch consumes the
 * shared persisted repair quota. Model/permission/environment faults do not ask
 * the developer to modify code blindly. */
export declare function runDispatchSelfReview(input: {
    taskId: string;
    workspacePath: string;
    verify: () => Promise<any>;
    repair: (round: number, gaps: string[]) => Promise<void>;
}): Promise<any>;
