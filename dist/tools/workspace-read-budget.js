"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CCM_WORKSPACE_TURN_SOFT_TOKENS = exports.CCM_WORKSPACE_READ_SOFT_TOKENS = exports.CCM_WORKSPACE_SEARCH_SOFT_TOKENS = void 0;
exports.workspaceSoftLimitForTool = workspaceSoftLimitForTool;
exports.projectWorkspaceToolResultForBudget = projectWorkspaceToolResultForBudget;
exports.createWorkspaceReadBudget = createWorkspaceReadBudget;
exports.consumeWorkspaceReadBudget = consumeWorkspaceReadBudget;
exports.projectWorkspaceToolResultForTurnBudget = projectWorkspaceToolResultForTurnBudget;
const context_budget_1 = require("../system/context-budget");
// Diagnostic guidance only. Results are not rewritten: Claude Code exposes
// the requested Read/Glob/Grep result and relies on hard limits plus paging.
function configuredTokenLimit(name, fallback, maximum) {
    const parsed = Math.floor(Number(process.env[name] || fallback));
    return Number.isFinite(parsed) && parsed > 0 ? Math.min(maximum, parsed) : fallback;
}
exports.CCM_WORKSPACE_SEARCH_SOFT_TOKENS = configuredTokenLimit("CCM_WORKSPACE_SEARCH_SOFT_TOKENS", 4_000, 100_000);
exports.CCM_WORKSPACE_READ_SOFT_TOKENS = configuredTokenLimit("CCM_WORKSPACE_READ_SOFT_TOKENS", 12_000, 100_000);
exports.CCM_WORKSPACE_TURN_SOFT_TOKENS = configuredTokenLimit("CCM_WORKSPACE_TURN_SOFT_TOKENS", 32_000, 1_000_000);
function tokenCount(value) {
    return (0, context_budget_1.estimateTextTokens)(typeof value === "string" ? value : JSON.stringify(value));
}
function workspaceSoftLimitForTool(toolName) {
    const name = String(toolName || "").replace(/^mcp__ccm__ccm_workspace_readonly__/, "");
    if (name === "read_file" || name === 'read_json_fields')
        return exports.CCM_WORKSPACE_READ_SOFT_TOKENS;
    if (["glob_files", "grep_text", "list_directory"].includes(name))
        return exports.CCM_WORKSPACE_SEARCH_SOFT_TOKENS;
    return 0;
}
/** Record size for diagnostics without changing the model-visible payload. */
function projectWorkspaceToolResultForBudget(toolName, value, availableTokens, softLimit) {
    const originalTokens = tokenCount(value);
    return {
        value,
        meta: {
            softLimitTokens: softLimit,
            availableTokens,
            originalTokens,
            visibleTokens: originalTokens,
            truncated: false,
            overSoftLimit: originalTokens > softLimit || originalTokens > availableTokens,
        },
    };
}
function createWorkspaceReadBudget(turnKey) {
    return { turnKey: String(turnKey || "default"), usedTokens: 0, calls: 0 };
}
function consumeWorkspaceReadBudget(state, turnKey, visibleTokens) {
    const normalizedTurnKey = String(turnKey || "default");
    if (state.turnKey !== normalizedTurnKey) {
        state.turnKey = normalizedTurnKey;
        state.usedTokens = 0;
        state.calls = 0;
    }
    const consumedTokens = Math.max(0, Math.floor(Number(visibleTokens || 0)));
    if (consumedTokens > 0) {
        state.usedTokens += consumedTokens;
        state.calls += 1;
    }
    return {
        consumedTokens,
        usedTokens: state.usedTokens,
        remainingTokens: Math.max(0, exports.CCM_WORKSPACE_TURN_SOFT_TOKENS - state.usedTokens),
        exhausted: state.usedTokens >= exports.CCM_WORKSPACE_TURN_SOFT_TOKENS,
    };
}
/**
 * Keep per-turn accounting for diagnostics, but never replace a real read with
 * a summary or budget-exhausted placeholder. Callers use hard tool limits and
 * offset/limit paging, matching Claude Code's Read behavior.
 */
function projectWorkspaceToolResultForTurnBudget(toolName, value, state, turnKey) {
    if (state.turnKey !== String(turnKey || "default"))
        consumeWorkspaceReadBudget(state, turnKey, 0);
    const softLimit = workspaceSoftLimitForTool(toolName);
    if (softLimit <= 0)
        return { value, meta: null };
    const originalTokens = tokenCount(value);
    const availableTokens = Math.max(0, exports.CCM_WORKSPACE_TURN_SOFT_TOKENS - state.usedTokens);
    const consumed = consumeWorkspaceReadBudget(state, turnKey, originalTokens);
    return {
        value,
        meta: {
            softLimitTokens: softLimit,
            availableTokens,
            originalTokens,
            visibleTokens: originalTokens,
            turnUsedTokens: consumed.usedTokens,
            turnLimitTokens: exports.CCM_WORKSPACE_TURN_SOFT_TOKENS,
            truncated: false,
            overSoftLimit: originalTokens > softLimit,
            overTurnSoftLimit: originalTokens > availableTokens,
        },
    };
}
//# sourceMappingURL=workspace-read-budget.js.map