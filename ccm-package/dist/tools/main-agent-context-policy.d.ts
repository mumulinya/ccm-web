export type McpToolLoadingMode = "deferred" | "auto" | "inline";
export type MainAgentContextPolicy = {
    mcpToolLoadingMode: McpToolLoadingMode;
    mcpToolAutoThresholdPercent: number;
    skillCatalogBudgetPercent: number;
    postCompactSkillPerItemMaxTokens: number;
    postCompactSkillTotalMaxTokens: number;
    contextSourceCatalogBudgetPercent: number;
    contextSourceHydrationBudgetPercent: number;
    postCompactSourcePerItemMaxTokens: number;
    postCompactSourceTotalMaxTokens: number;
    agentMaxParallelPerProject: number;
    agentMaxParallelGlobal: number;
};
export type MainAgentContextPolicyOverride = Partial<MainAgentContextPolicy>;
export declare const DEFAULT_MAIN_AGENT_CONTEXT_POLICY: MainAgentContextPolicy;
export declare function readMainAgentContextPolicy(input?: any): MainAgentContextPolicy;
export declare function updateMainAgentContextPolicyOverride(currentInput: any, updateInput: any, globalInput?: any): MainAgentContextPolicyOverride;
export declare function resolveMainAgentContextPolicy(globalInput?: any, overrideInput?: any): {
    override: Partial<MainAgentContextPolicy>;
    effective: {
        mcpToolLoadingMode: McpToolLoadingMode;
        mcpToolAutoThresholdPercent: number;
        skillCatalogBudgetPercent: number;
        postCompactSkillPerItemMaxTokens: number;
        postCompactSkillTotalMaxTokens: number;
        contextSourceCatalogBudgetPercent: number;
        contextSourceHydrationBudgetPercent: number;
        postCompactSourcePerItemMaxTokens: number;
        postCompactSourceTotalMaxTokens: number;
        agentMaxParallelPerProject: number;
        agentMaxParallelGlobal: number;
    };
    source: string;
};
export declare function mainAgentContextPolicyUpdatePresent(input: any): boolean;
export declare function contextPolicyUpdateSource(input: any): any;
export declare function buildDynamicSkillCatalogPrompt(input: {
    label: string;
    skills: any[];
    contextWindow: number;
    budgetPercent: number;
    recentlyInvokedSkillNames?: string[];
}): {
    prompt: string;
    targetTokens: number;
    actualTokens: number;
    nameOnlyTokens: number;
    describedCount: number;
    nameOnlyCount: number;
    budgetOverrun: boolean;
};
export declare function estimateMcpToolDefinitionTokens(tool: any): number;
export declare function resolveMcpToolLoadingDecision(policyInput: any, contextWindowInput: number, optionalDefinitionTokensInput: number): {
    mode: McpToolLoadingMode;
    contextWindow: number;
    optionalDefinitionTokens: number;
    autoThresholdTokens: number;
    inlineSafetyLimit: number;
    inline: boolean;
    safetyDowngraded: boolean;
};
