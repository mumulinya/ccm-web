type CollabCtx = any;
export declare function processCrossAgents(groupId: string, group: any, sourceProject: string, output: string, atMentions: any[], configs: any[], ctx: CollabCtx, streamRes: any, depth: number, seenMentions: Set<string>, executionOrder: string, planMessageId: string, taskId: string, deps: any): Promise<string[]>;
export {};
