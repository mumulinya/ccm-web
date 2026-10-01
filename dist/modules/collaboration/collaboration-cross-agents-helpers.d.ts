export declare function getMentionTargetName(mention: any): any;
export declare function rememberMentionOutputs(mention: any, outputs: string[], completedOutputsByAgent: Map<string, string[]>, dependencyStates: Map<string, any>, getAgentDependencyStateFromOutputs: (agent: string, outputs: string[]) => any): void;
export declare function getBlockingDependency(mention: any, uniqueMentions: any[], dependencyStates: Map<string, any>): {
    dependsOn: string;
    state: any;
};
export declare function skipMentionDueToDependency(mention: any, dependency: any, ctx: any): any[];
export declare function buildDependencyOutputPacket(mention: any, targetName: string, executionOrder: string, completedOutputsByAgent: Map<string, string[]>, compactMemoryText: (text: string, limit: number) => string): string;
