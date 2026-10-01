"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkpointReplayBatches = checkpointReplayBatches;
exports.groupReplayPairs = groupReplayPairs;
exports.replayBatchDeclaration = replayBatchDeclaration;
const workspace_model_result_projection_1 = require("../tools/workspace-model-result-projection");
/** Read declarations only, never cached result bodies or obsolete policy. */
function checkpointReplayBatches(saved) {
    if (!saved || saved.invalidated)
        return [];
    if (saved.toolBatches)
        return saved.toolBatches;
    const batches = [];
    for (const message of saved.messages) {
        if (message.role !== 'assistant')
            continue;
        try {
            let text = typeof message.content === 'string' ? message.content : '';
            let calls = (message.tool_calls || []).map((call) => ({
                id: call.id, name: call.function.name, arguments: JSON.parse(call.function.arguments), argumentsChecksum: '',
            }));
            if (Array.isArray(message.content)) {
                text = message.content.filter((part) => part.type === 'text' || (!part.type && part.text))
                    .map((part) => part.text).join('');
                calls = message.content.filter((part) => part.type === 'tool_use' || part.functionCall).map((part) => ({
                    id: part.id || part.functionCall.id, name: part.name || part.functionCall.name,
                    arguments: part.input || part.functionCall.args, argumentsChecksum: '',
                }));
            }
            if (calls.length)
                batches.push({ text, toolCalls: calls });
        }
        catch { /* A malformed legacy declaration cannot prove a batch. */ }
    }
    return batches;
}
function groupReplayPairs(pairs, batches) {
    const remaining = new Set(pairs);
    const groups = [];
    for (const pair of pairs) {
        if (!remaining.has(pair))
            continue;
        const matches = (row, call) => remaining.has(row)
            && row.use.toolCallId === call.id && row.use.toolName === call.name
            && row.use.conversation_turn_id === pair.use.conversation_turn_id
            && row.use.attempt_id === pair.use.attempt_id
            && (0, workspace_model_result_projection_1.stableModelJson)(row.use.payload?.arguments ?? row.use.payload ?? {}) === (0, workspace_model_result_projection_1.stableModelJson)(call.arguments ?? {});
        const batch = batches.find(candidate => candidate.toolCalls.some(call => call.id === pair.use.toolCallId)
            && (!candidate.attemptId || candidate.attemptId === pair.use.attempt_id)
            && new Set(candidate.toolCalls.map(call => call.id)).size === candidate.toolCalls.length
            && candidate.toolCalls.every(call => pairs.filter(row => matches(row, call)).length === 1));
        const selected = batch ? batch.toolCalls.map(call => pairs.find(row => matches(row, call))) : [pair];
        selected.forEach(row => remaining.delete(row));
        groups.push({ pairs: selected, text: batch?.text || '' });
    }
    return groups;
}
function replayBatchDeclaration(turn, attemptId) {
    return { text: turn.text, toolCalls: structuredClone(turn.toolCalls), ...(attemptId ? { attemptId } : {}) };
}
//# sourceMappingURL=native-replay-batches.js.map