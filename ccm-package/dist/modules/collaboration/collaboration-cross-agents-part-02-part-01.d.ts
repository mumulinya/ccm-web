export type CrossAgentEnv = {
    deps: any;
    groupId: string;
    group: any;
    sourceProject: string;
    output: string;
    configs: any[];
    ctx: any;
    streamRes: any;
    depth: number;
    seenMentions: Set<string>;
    executionOrder: string;
    planMessageId: string;
    taskId: string;
    sourceTask: any;
    completedOutputsByAgent: Map<string, string[]>;
    processCrossAgents: typeof import("./collaboration-cross-agents").processCrossAgents;
    _locals?: any;
};
