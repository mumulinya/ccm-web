"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.responsesReplayIdentity = responsesReplayIdentity;
exports.captureResponsesOutput = captureResponsesOutput;
exports.bindResponsesReplay = bindResponsesReplay;
exports.attachResponsesReplay = attachResponsesReplay;
exports.replayResponsesMessage = replayResponsesMessage;
exports.stripResponsesReplay = stripResponsesReplay;
exports.createResponsesOutputCollector = createResponsesOutputCollector;
const crypto_1 = require("crypto");
const util_1 = require("util");
const declared_answer_stream_1 = require("./declared-answer-stream");
const hash = (value) => (0, crypto_1.createHash)('sha256').update(JSON.stringify(value)).digest('hex');
function responsesReplayIdentity(config) {
    return hash([config.apiUrl || '', config.model || '', config.apiKey || config.api_key || '']);
}
function captureResponsesOutput(output) {
    if (!Array.isArray(output) || !output.length)
        return;
    // Preserve supported native items in their exact order. Unknown built-in
    // tool protocols must not be silently reduced to a partial replay batch.
    if (output.some(item => !['reasoning', 'message', 'function_call'].includes(item?.type)
        || (item.type === 'message' && item.role !== 'assistant')))
        return;
    return { version: 1, items: structuredClone(output) };
}
function bindResponsesReplay(turn, config) {
    if (turn.responsesOutput)
        turn.responsesOutput.requestIdentity = responsesReplayIdentity(config);
    return turn;
}
const visibleHash = (message) => hash([message.content ?? null, message.tool_calls || []]);
function attachResponsesReplay(message, replay) {
    if (!replay)
        return message;
    const text = replay.items.filter(item => item.type === 'message')
        .flatMap(item => item.content || []).filter(part => ['text', 'output_text'].includes(part.type))
        .map(part => part.text || '').join('');
    const calls = replay.items.filter(item => item.type === 'function_call');
    const declared = message.tool_calls || [];
    try {
        if ((text !== String(message.content || '') && (0, declared_answer_stream_1.stripAnswerPhasePrefix)(text) !== String(message.content || '')) || calls.length !== declared.length
            || calls.some((call, index) => call.call_id !== declared[index].id || call.name !== declared[index].function.name
                || !(0, util_1.isDeepStrictEqual)(JSON.parse(call.arguments), JSON.parse(declared[index].function.arguments))))
            return message;
    }
    catch {
        return message;
    }
    // Enumerable for atomic checkpoint persistence; protocol encoders explicitly
    // consume/remove this field. Never use it after content edits or compaction.
    return { ...message, responsesReplay: { ...structuredClone(replay), visibleChecksum: visibleHash(message) } };
}
function replayResponsesMessage(message, requestIdentity) {
    const replay = message?.responsesReplay;
    if (message?.role !== 'assistant' || replay?.version !== 1 || !Array.isArray(replay.items)
        || replay.visibleChecksum !== visibleHash(message)
        || (replay.requestIdentity && replay.requestIdentity !== requestIdentity))
        return;
    return structuredClone(replay.items);
}
function stripResponsesReplay(message) {
    const { responsesReplay, ...visible } = message;
    return visible;
}
function createResponsesOutputCollector() {
    const declared = new Set();
    const done = new Map();
    return {
        push(event) {
            if (!['response.output_item.added', 'response.output_item.done'].includes(event?.type))
                return;
            const index = event.output_index;
            if (!Number.isSafeInteger(index) || index < 0)
                return;
            declared.add(index);
            if (event.type === 'response.output_item.done')
                done.set(index, structuredClone(event.item));
        },
        finish(response) {
            if (Array.isArray(response?.output) && response.output.length)
                return captureResponsesOutput(response.output);
            if (response?.status !== 'completed' || !done.size || declared.size !== done.size)
                return;
            const ordered = [...done].sort((a, b) => a[0] - b[0]);
            if (ordered.some(([index], offset) => index !== offset))
                return;
            return captureResponsesOutput(ordered.map(([, item]) => item));
        },
    };
}
//# sourceMappingURL=responses-output-replay.js.map