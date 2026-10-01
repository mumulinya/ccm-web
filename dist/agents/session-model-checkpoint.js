"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.modelCheckpointHash = void 0;
exports.modelReplaySource = modelReplaySource;
exports.bindModelReplaySource = bindModelReplaySource;
exports.transferModelReplaySource = transferModelReplaySource;
exports.modelCheckpointFile = modelCheckpointFile;
exports.readModelCheckpoint = readModelCheckpoint;
exports.writeModelCheckpoint = writeModelCheckpoint;
exports.invalidateModelCheckpoint = invalidateModelCheckpoint;
exports.replaySourceFor = replaySourceFor;
exports.restoreModelCheckpoint = restoreModelCheckpoint;
exports.checkpointBodyMessages = checkpointBodyMessages;
exports.finishPendingCheckpoint = finishPendingCheckpoint;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto_1 = require("crypto");
const utils_1 = require("../core/utils");
const atomic_json_file_1 = require("../core/atomic-json-file");
const workspace_model_result_projection_1 = require("../tools/workspace-model-result-projection");
const model_tool_result_1 = require("./model-tool-result");
const native_query_messages_1 = require("./native-query-messages");
const transient_model_content_1 = require("../system/transient-model-content");
const model_tool_attachments_1 = require("./model-tool-attachments");
const modelCheckpointHash = (value) => (0, crypto_1.createHash)('sha256').update((0, workspace_model_result_projection_1.stableModelJson)(value)).digest('hex');
exports.modelCheckpointHash = modelCheckpointHash;
const sources = new WeakMap();
function modelReplaySource(messages) { return sources.get(messages); }
function bindModelReplaySource(messages, source) { if (source)
    sources.set(messages, source); return messages; }
function transferModelReplaySource(messages, from) {
    if (!(0, transient_model_content_1.transientModelBlocks)(messages).length)
        (0, transient_model_content_1.attachTransientModelBlocks)(messages, (0, transient_model_content_1.transientModelBlocks)(from));
    return bindModelReplaySource(messages, sources.get(from));
}
function modelCheckpointFile(identity) {
    return path.join(utils_1.CCM_DIR, 'session-model-transcripts', (0, exports.modelCheckpointHash)(identity.scope).slice(0, 12), (0, exports.modelCheckpointHash)(identity).slice(0, 48) + '.json');
}
function readModelCheckpoint(identity) {
    try {
        const value = JSON.parse(fs.readFileSync(modelCheckpointFile(identity), 'utf8'));
        if (!value || value.version !== 1 || value.projectionVersion !== 1 || !Number.isSafeInteger(value.revision) || value.revision < 1
            || !Array.isArray(value.messages) || !Array.isArray(value.source?.conversation) || !Array.isArray(value.source?.executionIds)
            || (value.pending && (!Array.isArray(value.pending.turn?.toolCalls) || !Array.isArray(value.pending.results))))
            return null;
        const { checksum, ...body } = value;
        return value.schema === 'ccm-session-model-checkpoint-v1' && (0, exports.modelCheckpointHash)(value.identity) === (0, exports.modelCheckpointHash)(identity)
            && checksum === (0, exports.modelCheckpointHash)(body) ? value : null;
    }
    catch {
        return null;
    }
}
function writeModelCheckpoint(value, expectedRevision) {
    const file = modelCheckpointFile(value.identity);
    return (0, atomic_json_file_1.withFileLock)(file, () => {
        const previous = readModelCheckpoint(value.identity);
        if (Number(previous?.revision || 0) !== expectedRevision)
            throw Object.assign(new Error('会话模型检查点已被较新的执行更新'), { code: 'CCM_MODEL_CHECKPOINT_STALE' });
        if (previous?.turnId === value.turnId && previous.generation === value.generation && previous.attempt > value.attempt)
            throw Object.assign(new Error('旧 attempt 不得覆盖模型检查点'), { code: 'CCM_MODEL_CHECKPOINT_STALE' });
        const body = { ...value, revision: expectedRevision + 1 };
        const next = { ...body, checksum: (0, exports.modelCheckpointHash)(body) };
        (0, atomic_json_file_1.writeJsonAtomic)(file, next);
        return next;
    });
}
function invalidateModelCheckpoint(identity) {
    const file = modelCheckpointFile(identity);
    (0, atomic_json_file_1.withFileLock)(file, () => {
        const previous = readModelCheckpoint(identity);
        if (!previous)
            return;
        const { checksum, ...body } = previous;
        const next = { ...body, revision: previous.revision + 1, invalidated: true, reason: 'session_history_deleted',
            messages: [], pending: undefined, terminalText: undefined, toolBatches: [],
            source: { ...body.source, conversation: [], executionIds: [], currentUserText: '', pending: undefined, afterPending: undefined } };
        (0, atomic_json_file_1.writeJsonAtomic)(file, { ...next, checksum: (0, exports.modelCheckpointHash)(next) });
    });
}
function stamp(row, index) {
    return { id: String(row.id || row.uuid || row.messageId || `legacy:${index}`), checksum: (0, exports.modelCheckpointHash)({ role: row.role, content: row.content ?? row.text, requestText: row.requestText }) };
}
function replaySourceFor(input) {
    if (!input.persistContext?.sessionId)
        return;
    return { identity: input.persistContext, family: input.family || 'openai',
        protocolFamily: input.protocolFamily || (input.family === 'json' ? 'openai' : input.family || 'openai'),
        boundary: (0, exports.modelCheckpointHash)({ summary: input.canonicalSummary, placement: input.canonicalSummaryPlacement, pivot: input.canonicalSummaryAfterMessageId,
            cleared: Array.from(input.clearedToolCallIds || []), replaced: input.replacedToolResults instanceof Map ? [...input.replacedToolResults] : input.replacedToolResults }),
        conversation: (input.conversation || []).map(stamp), currentUserText: String(input.currentUserText || ''),
        metaChecksum: (0, exports.modelCheckpointHash)(input.metaBlocks || []),
        executionIds: (input.executionEvents || []).map((event) => event.id) };
}
function restoreModelCheckpoint(input, source) {
    const saved = readModelCheckpoint(source.identity);
    if (!saved || saved.invalidated || saved.family !== source.family || saved.boundary !== source.boundary)
        return null;
    if (saved.source.protocolFamily && source.protocolFamily !== saved.source.protocolFamily)
        return null;
    if (!saved.source.conversation.every((row, index) => source.conversation[index]?.id === row.id && source.conversation[index]?.checksum === row.checksum))
        return null;
    if (!saved.source.executionIds.every(id => source.executionIds.includes(id)))
        return null;
    const coveredCalls = new Set(saved.pending?.turn.toolCalls.map(call => call.id) || []);
    for (const message of saved.messages) {
        if (message.tool_call_id)
            coveredCalls.add(message.tool_call_id);
        for (const call of message.tool_calls || [])
            coveredCalls.add(call.id);
        for (const part of Array.isArray(message.content) ? message.content : []) {
            const id = part.type === 'tool_use' ? part.id : part.type === 'tool_result' ? part.tool_use_id : part.functionCall?.id || part.functionResponse?.id;
            if (id)
                coveredCalls.add(id);
        }
        if (typeof message.content === 'string') {
            try {
                for (const row of JSON.parse(message.content)?.toolResults || [])
                    if (row.callId)
                        coveredCalls.add(row.callId);
            }
            catch { }
        }
    }
    // Out-of-band tool activity has no proven place in this request checkpoint.
    // Re-materialize from the authoritative history rather than silently omit it.
    if ((input.executionEvents || []).some((event) => !saved.source.executionIds.includes(event.id) && !coveredCalls.has(event.toolCallId)))
        return null;
    const extra = (input.conversation || []).slice(saved.source.conversation.length);
    // A final may be persisted by the outer adapter after the loop checkpoint.
    // Adopt its ID only at this turn's boundary, before any later user message.
    let finalAdopted = false;
    const additions = [];
    for (const row of extra) {
        if (row.hidden_execution === true || row.modelVisible === false || row.model_visible === false)
            continue;
        const text = String(row.content ?? row.text ?? '');
        // The pending user may be excluded from the context projection's history
        // but already present in saved.messages. Adopt only its backend-issued
        // identity and exact submitted text, never a same-text message in a later turn.
        if (!finalAdopted && !additions.length && row === extra[0] && row.role === 'user'
            && String(row.id || row.uuid || row.messageId || '') === saved.turnId
            && text === saved.source.currentUserText)
            continue;
        const finalIdentityMatches = (saved.conversationTurnId && row.conversation_turn_id === saved.conversationTurnId)
            || (saved.finalMessageId && String(row.id || '') === saved.finalMessageId);
        if (!finalAdopted && !additions.length && row.role === 'assistant' && (finalIdentityMatches || text === saved.terminalText)
            && (!row.requestText || row.requestText === saved.source.currentUserText)) {
            finalAdopted = true;
            continue;
        }
        if (row.role === 'user' && text === source.currentUserText && row === extra.at(-1))
            continue;
        if (!['user', 'assistant'].includes(row.role))
            return null;
        additions.push({ role: row.role, content: structuredClone(row.content ?? row.text ?? '') });
    }
    // The authoritative final was removed (or not committed): do not resurrect it.
    if (saved.terminalText && !finalAdopted)
        return null;
    const messages = structuredClone(saved.messages);
    const resultRows = new Map((saved.pending?.results || []).map(row => [row.callId, row]));
    if (saved.pending) {
        for (const event of input.executionEvents || []) {
            if (event.type === 'tool_result' && (!event.attempt_id || event.attempt_id === saved.attempt_id)
                && saved.pending.turn.toolCalls.some(call => call.id === event.toolCallId && call.name === event.toolName)
                && !resultRows.has(event.toolCallId))
                resultRows.set(event.toolCallId, (0, model_tool_result_1.executionModelToolResult)(event));
        }
        source.pending = { turn: saved.pending.turn, results: [...resultRows.values()] };
    }
    source.restoredRevision = saved.revision;
    // Checkpoints contain conversation content only; current policy comes from the adapter.
    while (messages[0]?.role === 'system')
        messages.shift();
    const suffix = additions;
    if (source.metaChecksum !== saved.source.metaChecksum && input.metaBlocks?.length)
        suffix.push({ role: 'user', isMeta: true, content: input.metaBlocks.map((block) => `【${block.title}】\n${block.body}`).join('\n\n') });
    if (source.currentUserText)
        suffix.push({ role: 'user', content: source.currentUserText });
    if (saved.pending)
        source.afterPending = suffix;
    else
        messages.push(...suffix);
    return messages;
}
/** Keep metadata out of the protocol payload; messages retain only model content. */
function checkpointBodyMessages(messages) { return structuredClone(messages); }
function finishPendingCheckpoint(messages, pending, family, attachmentFamily = family) {
    const byId = new Map(pending.results.map(row => [row.callId, row]));
    if (family === 'json') {
        const rows = pending.turn.toolCalls.map(call => byId.get(call.id)).filter(Boolean);
        return (0, model_tool_attachments_1.appendModelToolAttachments)([...messages, { role: 'user', content: JSON.stringify({ toolResults: rows.map(native_query_messages_1.modelVisibleNativeToolResult) }) }], rows, attachmentFamily);
    }
    return (0, native_query_messages_1.appendNativeTurnTranscript)(messages, pending.turn, pending.turn.toolCalls.map(call => byId.get(call.id)).filter(Boolean), family);
}
//# sourceMappingURL=session-model-checkpoint.js.map