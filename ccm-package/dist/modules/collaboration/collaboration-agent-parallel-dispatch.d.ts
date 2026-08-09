export declare function createAgentParallelGroupId(input: {
    groupId: string;
    taskId?: string;
    planMessageId?: string;
    depth?: number;
    targets: string[];
}): string;
export declare function settleParallelAgentJobs<T>(mentions: T[], execute: (mention: T) => Promise<string[]>): Promise<{
    mention: T;
    outputs: string[];
    error: any;
}[]>;
