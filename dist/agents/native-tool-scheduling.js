"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNativeToolExecution = createNativeToolExecution;
const provider_native_tools_1 = require("../system/provider-native-tools");
const agent_loop_budget_1 = require("../system/agent-loop-budget");
const readonly_tool_concurrency_1 = require("../system/readonly-tool-concurrency");
const conversation_attempt_1 = require("./conversation-attempt");
/** A complete model batch is the scheduling boundary, never an SSE arrival. */
function createNativeToolExecution(input, save) {
    const budget = input.loopBudget || (0, agent_loop_budget_1.resolveAgentLoopBudget)(input.config);
    const binding = (0, conversation_attempt_1.currentConversationAttemptBinding)(input.scope, input.scope === 'global' ? input.exactSessionId : `${input.scopeId}:${input.exactSessionId}`);
    const affinity = input.providerContextCache?.cacheAffinity || {};
    const recovery = Number(affinity.attempt || 1) > 1 || Number(affinity.generation || 0) > 0;
    let modelRetried = false;
    const readonly = (call) => !['ccm_ask_user', 'ccm_present_plan', 'ccm_dispatch',
        'tool_search', 'invoke_skill', 'invoke_mcp', 'read_scope_instruction'].includes(call.name)
        && input.isReadOnly?.(call) === true;
    const guard = () => {
        if (input.signal?.aborted)
            throw Object.assign(new Error('工具调度已取消'), { name: 'AbortError', code: 'CCM_TOOL_SCHEDULING_ABORTED' });
        (0, conversation_attempt_1.confirmConversationPauseAtBoundary)(binding, 'tool_batch_boundary');
        if (binding)
            (0, conversation_attempt_1.requireConversationAttempt)(binding.current(), { attempt_id: binding.attempt_id }, true);
    };
    const executeBatch = async (calls, ctx) => {
        guard();
        // Retry/resume always uses the serial path. Partial checkpoint recovery
        // invokes this function one unfinished call at a time.
        const parallel = input.toolExecutionMode !== 'single_step' && !recovery && !modelRetried
            && ctx.turn.toolCalls.length > 1 && ctx.turn.toolCalls.every(readonly);
        const declaredTools = new Map((input.getTools?.() || input.tools).map(tool => [tool.name, (0, provider_native_tools_1.serializeProviderToolSchema)([tool])]));
        const validate = (call) => {
            guard();
            const current = (input.getTools?.() || input.tools).find(tool => tool.name === call.name);
            // Legacy JSON callers may leave the native catalog empty; their adapter
            // still owns authorization. Never revive a tool known at batch admission
            // if it is revoked or its schema changes while waiting in our queue.
            if (declaredTools.has(call.name) && (!current || (0, provider_native_tools_1.serializeProviderToolSchema)([current]) !== declaredTools.get(call.name))) {
                throw Object.assign(new Error(`工具已撤销或定义已变化：${call.name}`), { code: 'CCM_TOOL_SCHEDULING_UNAVAILABLE' });
            }
        };
        const runReadonlyTools = options => (0, readonly_tool_concurrency_1.runReadonlyToolsAdaptive)({
            ...options,
            signal: input.signal,
            configuredLimit: parallel ? Math.min(budget.readOnlyParallelism, budget.toolBatchSize, options.configuredLimit ?? Infinity) : 1,
            keyForItem: input.scope === 'group' ? readonly_tool_concurrency_1.groupReadonlyProjectKey : options.keyForItem,
            perKeyLimit: input.scope === 'group' ? readonly_tool_concurrency_1.CCM_GROUP_READONLY_PER_PROJECT_MAX : options.perKeyLimit,
            worker: async (item, index) => {
                const original = calls.find(call => call.id === item.id)
                    || calls.find(call => call.name === item.name && JSON.stringify(call.arguments || {}) === JSON.stringify(item.arguments || {}));
                if (!original)
                    throw new Error('CCM_TOOL_SCHEDULING_UNDECLARED');
                validate(original);
                return options.worker(item, index);
            },
        });
        const record = (rows) => {
            if (binding)
                (0, conversation_attempt_1.requireConversationAttempt)(binding.current(), { attempt_id: binding.attempt_id }, true);
            return save(rows);
        };
        const context = { ...ctx, runReadonlyTools, onToolResult: (row) => { record([row]); } };
        const execute = async (batch) => {
            batch.forEach(validate);
            const rows = await input.executeTools(batch, context);
            const completed = record(rows);
            guard();
            return completed;
        };
        const rows = [];
        if (parallel)
            rows.push(...await execute(calls));
        else
            for (const call of calls)
                rows.push(...await execute([call]));
        const byId = new Map(rows.map(row => [row.callId, row]));
        return calls.map(call => byId.get(call.id)).filter((row) => Boolean(row));
    };
    return Object.assign(executeBatch, { markModelRetry: () => { modelRetried = true; } });
}
//# sourceMappingURL=native-tool-scheduling.js.map