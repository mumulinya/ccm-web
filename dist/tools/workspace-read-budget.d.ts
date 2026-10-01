export declare const CCM_WORKSPACE_SEARCH_SOFT_TOKENS: number;
export declare const CCM_WORKSPACE_READ_SOFT_TOKENS: number;
export declare const CCM_WORKSPACE_TURN_SOFT_TOKENS: number;
export type WorkspaceReadBudgetState = {
    turnKey: string;
    usedTokens: number;
    calls: number;
};
export type WorkspaceReadBudgetMeta = {
    softLimitTokens: number;
    availableTokens: number;
    originalTokens: number;
    visibleTokens: number;
    turnUsedTokens?: number;
    turnLimitTokens?: number;
    truncated: false;
    overSoftLimit?: boolean;
    overTurnSoftLimit?: boolean;
};
export declare function workspaceSoftLimitForTool(toolName: string): number;
/** Record size for diagnostics without changing the model-visible payload. */
export declare function projectWorkspaceToolResultForBudget(toolName: string, value: any, availableTokens: number, softLimit: number): {
    value: any;
    meta: WorkspaceReadBudgetMeta;
};
export declare function createWorkspaceReadBudget(turnKey: string): WorkspaceReadBudgetState;
export declare function consumeWorkspaceReadBudget(state: WorkspaceReadBudgetState, turnKey: string, visibleTokens: number): {
    consumedTokens: number;
    usedTokens: number;
    remainingTokens: number;
    exhausted: boolean;
};
/**
 * Keep per-turn accounting for diagnostics, but never replace a real read with
 * a summary or budget-exhausted placeholder. Callers use hard tool limits and
 * offset/limit paging, matching Claude Code's Read behavior.
 */
export declare function projectWorkspaceToolResultForTurnBudget(toolName: string, value: any, state: WorkspaceReadBudgetState, turnKey: string): {
    value: any;
    meta: WorkspaceReadBudgetMeta;
};
