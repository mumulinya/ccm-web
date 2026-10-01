"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createModelCheckpointRuntime = createModelCheckpointRuntime;
const crypto_1 = require("crypto");
const session_model_checkpoint_1 = require("./session-model-checkpoint");
const workspace_read_context_1 = require("../tools/workspace-read-context");
const native_query_messages_1 = require("./native-query-messages");
const model_tool_attachments_1 = require("./model-tool-attachments");
const conversation_attempt_1 = require("./conversation-attempt");
const session_model_checkpoint_2 = require("./session-model-checkpoint");
const conversation_plan_mode_gate_1 = require("../system/conversation-plan-mode-gate");
const native_replay_batches_1 = require("./native-replay-batches");
const responses_output_replay_1 = require("../system/responses-output-replay");
const provider_cache_transcript_1 = require("../system/provider-cache-transcript");
function createModelCheckpointRuntime(input, family) {
    const source = (0, session_model_checkpoint_1.modelReplaySource)(input.messages);
    const enabled = Boolean(input.persistContext?.sessionId && input.providerContextCache?.auditTurnKey);
    const identity = { scope: input.scope, scopeId: input.scopeId, sessionId: input.exactSessionId };
    if (enabled && ((0, session_model_checkpoint_2.modelCheckpointHash)(input.persistContext) !== (0, session_model_checkpoint_2.modelCheckpointHash)(identity)
        || (source && (0, session_model_checkpoint_2.modelCheckpointHash)(source.identity) !== (0, session_model_checkpoint_2.modelCheckpointHash)(identity)))) {
        throw Object.assign(new Error('模型检查点的作用域或会话不匹配'), { code: 'CCM_MODEL_CHECKPOINT_IDENTITY' });
    }
    const previous = enabled ? (0, session_model_checkpoint_1.readModelCheckpoint)(identity) : null;
    const toolBatches = (0, native_replay_batches_1.checkpointReplayBatches)(previous);
    if (enabled && source?.restoredRevision && source.restoredRevision !== previous?.revision) {
        throw Object.assign(new Error('恢复的模型历史已被更新，请重新载入'), { code: 'CCM_MODEL_CHECKPOINT_STALE' });
    }
    let revision = Number(previous?.revision || 0);
    const attachmentFamily = family === 'json' ? (0, native_query_messages_1.nativeQueryFamily)(input.config) : family;
    const initialMessages = (0, model_tool_attachments_1.materializeInputAttachments)(input.messages, attachmentFamily);
    const prefixLayoutVersion = String(input.messages.find(message => message.prefixLayoutVersion)?.prefixLayoutVersion || 'legacy');
    let messages = (0, session_model_checkpoint_1.checkpointBodyMessages)(initialMessages);
    let pending = source?.pending ? structuredClone(source.pending) : undefined;
    let modelCallIndex = 0;
    const turnId = String(input.providerContextCache?.auditTurnKey || '');
    const binding = (0, conversation_attempt_1.currentConversationAttemptBinding)(input.scope, input.scope === 'global' ? input.exactSessionId : `${input.scopeId}:${input.exactSessionId}`);
    const affinity = input.providerContextCache?.cacheAffinity || {};
    const owner = (0, crypto_1.randomUUID)();
    const effectiveSource = { ...(source || { identity, boundary: '', conversation: [], executionIds: [], currentUserText: String(input.messages.at(-1)?.content || '') }), family, protocolFamily: attachmentFamily };
    const materializationReason = previous && (previous.family !== family || previous.source.protocolFamily !== attachmentFamily) ? 'protocol_family_changed'
        : !source?.restoredRevision ? previous ? previous.boundary !== effectiveSource.boundary ? 'compression_boundary_changed' : 'history_changed_or_legacy_fallback' : 'legacy_checkpoint_created'
            : previous?.materializationReason;
    const save = (reason, terminalText) => {
        if (!enabled)
            return;
        if (binding)
            (0, conversation_attempt_1.requireConversationAttempt)(binding.current(), { attempt_id: binding.attempt_id }, true);
        const value = {
            schema: 'ccm-session-model-checkpoint-v1', version: 1, revision, identity, family,
            source: { ...effectiveSource, pending: undefined, afterPending: undefined }, messages: (0, session_model_checkpoint_1.checkpointBodyMessages)(messages),
            turnId, trace_id: String(input.checkpointIdentity?.trace_id || binding?.current()?.metadata?.trace_id || turnId),
            attempt_id: String(binding?.attempt_id || input.checkpointIdentity?.attempt_id || `${turnId}:${affinity.generation || 0}:${affinity.attempt || 1}`),
            attempt: Number(affinity.attempt || 1), generation: Number(affinity.generation || 0), modelCallIndex,
            boundary: effectiveSource.boundary, projectionVersion: 1,
            coveredMessageIds: effectiveSource.conversation.map(row => row.id),
            pending: pending ? structuredClone(pending) : undefined, terminalText, owner, reason,
            conversationTurnId: binding?.id, finalMessageId: input.checkpointIdentity?.finalMessageId,
            materializationReason,
            toolBatches,
            prefixLayoutVersion,
            prefixLayoutChangeReason: previous?.prefixLayoutVersion !== prefixLayoutVersion ? 'prefix_layout_changed' : undefined,
        };
        revision = (0, session_model_checkpoint_1.writeModelCheckpoint)(value, revision).revision;
        if (reason !== 'completed' && (reason !== 'model_turn' || pending)) {
            (0, conversation_attempt_1.confirmConversationPauseAtBoundary)(binding, `model_${reason}_${modelCallIndex}`);
        }
    };
    // Claim the revision immediately. Any earlier runtime can no longer commit.
    save(source?.restoredRevision ? 'restored' : previous ? 'history_or_projection_changed' : 'created');
    return {
        forJson(next) {
            // Transport downgrade retains the current loop, including completed tools.
            const converted = next.map(responses_output_replay_1.stripResponsesReplay).map(message => {
                if (message.role === 'system')
                    return structuredClone(message);
                if (message.role === 'tool')
                    return { role: 'user', content: JSON.stringify({ toolResults: [{ callId: message.tool_call_id, content: message.content }] }) };
                if (Array.isArray(message.content))
                    return {
                        role: message.role === 'assistant' ? 'assistant' : 'user',
                        content: message.content.map((part) => ['tool_use', 'tool_result'].includes(part.type) || part.functionCall || part.functionResponse
                            ? (attachmentFamily === 'gemini' ? { text: JSON.stringify(part) } : { type: 'text', text: JSON.stringify(part) }) : structuredClone(part)),
                    };
                if (message.tool_calls?.length)
                    return {
                        role: message.role === 'assistant' ? 'assistant' : 'user',
                        content: JSON.stringify({ content: message.content, ...(message.tool_calls ? { toolCalls: message.tool_calls } : {}) }),
                    };
                return structuredClone(message);
            });
            return (0, session_model_checkpoint_1.bindModelReplaySource)(converted, { ...effectiveSource, family: 'json', restoredRevision: enabled ? revision : undefined, pending: undefined });
        },
        async resume(execute) {
            (0, workspace_read_context_1.reconcileJsonReadEvidence)({ scope: input.scope, scopeId: input.scopeId, exactSessionId: input.exactSessionId }, messages);
            if (!pending)
                return initialMessages;
            const completed = new Map(pending.results.map(row => [row.callId, row]));
            for (const call of pending.turn.toolCalls) {
                if (completed.has(call.id))
                    continue;
                if (input.signal?.aborted)
                    throw new Error('CCM_MODEL_CHECKPOINT_RESUME_ABORTED');
                const available = input.getTools?.() || input.tools;
                // Control actions must be revalidated by the normal model/control gate.
                if (available && !available.some(tool => tool.name === call.name))
                    completed.set(call.id, { callId: call.id, name: call.name, ok: false, error: 'CCM_CHECKPOINT_TOOL_UNAVAILABLE' });
                else if (call.name.startsWith('ccm_'))
                    completed.set(call.id, { callId: call.id, name: call.name, ok: false, error: 'CCM_CONTROL_REQUIRES_REVALIDATION' });
                else {
                    const gate = (0, conversation_plan_mode_gate_1.applyConversationPlanModeToRound)({ enabled: input.planModeEnabled === true, parsed: {}, requests: [call],
                        isReadOnly: candidate => input.isReadOnly?.(candidate) === true });
                    const rows = gate.blockedResults.length ? gate.blockedResults
                        : await execute([call], { round: 0, turn: pending.turn, signal: input.signal, startedCallIds: new Set() });
                    for (const row of rows)
                        completed.set(row.callId, row);
                    if (!completed.has(call.id))
                        throw Object.assign(new Error('工具未返回对应调用的结果，保留未完成批次'), { code: 'CCM_CHECKPOINT_TOOL_RESULT_MISSING' });
                }
                pending.results = [...completed.values()];
                save('resumed_tool_result');
            }
            messages = (0, session_model_checkpoint_1.finishPendingCheckpoint)(messages, { ...pending, results: [...completed.values()] }, family, attachmentFamily);
            pending = undefined;
            const afterPending = source?.afterPending || (effectiveSource.currentUserText ? [{ role: 'user', content: effectiveSource.currentUserText }] : []);
            // The checkpoint already contains the user message that produced the
            // pending tool batch.  Older restore paths also put that same message
            // in `afterPending`, which turned a tool continuation into
            // `[user, tool_call, tool_result, user]` and invalidated the provider
            // prefix.  Only suppress the final pending user here: this is bounded
            // to the restored pending turn, so identical text in a later turn is
            // never globally deduplicated.
            const lastPendingUser = [...messages].reverse().find(row => String(row?.role || '').toLowerCase() === 'user' && row?.isMeta !== true);
            const suffix = afterPending.slice();
            const finalSuffix = suffix.at(-1);
            const restoredPendingTurnMatches = Boolean(turnId && previous?.turnId && String(previous.turnId) === turnId)
                && String(effectiveSource.currentUserText || '') === String(source.currentUserText || '');
            if (restoredPendingTurnMatches && finalSuffix && String(finalSuffix?.role || '').toLowerCase() === 'user'
                && lastPendingUser
                && String(finalSuffix?.content ?? '').trim() === String(lastPendingUser?.content ?? '').trim()) {
                suffix.pop();
            }
            messages.push(...suffix);
            save('pending_batch_completed');
            return messages;
        },
        request(next, index) {
            messages = (0, session_model_checkpoint_1.checkpointBodyMessages)((0, provider_cache_transcript_1.buildAppendOnlyProviderTranscript)(next, { turnId }).messages);
            modelCallIndex = index;
            (0, workspace_read_context_1.reconcileJsonReadEvidence)({ scope: input.scope, scopeId: input.scopeId, exactSessionId: input.exactSessionId }, messages);
            save('provider_request');
            return messages;
        },
        declared(call) {
            if (!pending)
                pending = { turn: { text: '', toolCalls: [], toolReferences: [], stopReason: 'tool_calls', usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, reported: false } }, results: [] };
            if (!pending.turn.toolCalls.some(row => row.id === call.id))
                pending.turn.toolCalls.push(structuredClone(call));
            save('tool_declared');
        },
        turn(turn, index) {
            modelCallIndex = index;
            if (turn.toolCalls.length && !toolBatches.some(batch => batch.attemptId === binding?.attempt_id && JSON.stringify(batch.toolCalls) === JSON.stringify(turn.toolCalls))) {
                toolBatches.push((0, native_replay_batches_1.replayBatchDeclaration)(turn, binding?.attempt_id));
            }
            if (turn.toolCalls.length)
                pending = { turn: structuredClone(turn), results: pending?.results || [] };
            save('model_turn');
        },
        results(rows) {
            if (!pending)
                return;
            const known = new Map(pending.results.map(row => [row.callId, row]));
            for (const row of rows)
                known.set(row.callId, row);
            pending.results = [...known.values()];
            save('tool_results');
        },
        adopt(next) { messages = (0, session_model_checkpoint_1.checkpointBodyMessages)(next); pending = undefined; save('transcript_appended'); return next; },
        complete(next, text, finalTurn) {
            messages = (0, session_model_checkpoint_1.checkpointBodyMessages)(next);
            const last = messages.at(-1);
            const hasText = last?.role === 'assistant' && (last.content === text || (Array.isArray(last.content) && last.content.some((part) => part.text === text)));
            if (text && !hasText)
                messages = family === 'json'
                    ? [...messages, { role: 'assistant', content: text }]
                    : (0, native_query_messages_1.appendNativeTurnTranscript)(messages, finalTurn && !finalTurn.toolCalls.length && finalTurn.text === text
                        ? finalTurn : { text, toolCalls: [], toolReferences: [], stopReason: 'end_turn', usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, reported: false } }, [], family);
            pending = undefined;
            save('completed', text);
            return messages;
        },
    };
}
//# sourceMappingURL=session-model-checkpoint-runtime.js.map