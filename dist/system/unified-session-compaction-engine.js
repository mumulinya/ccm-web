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
exports.UnifiedSessionCompactionEngine = void 0;
exports.createUnifiedSessionCompactionEngine = createUnifiedSessionCompactionEngine;
const crypto = __importStar(require("crypto"));
const context_budget_1 = require("./context-budget");
const session_memory_window_1 = require("./session-memory-window");
const session_compaction_core_1 = require("./session-compaction-core");
const session_summary_quality_gate_1 = require("./session-summary-quality-gate");
const session_execution_ledger_1 = require("./session-execution-ledger");
const unified_session_compaction_1 = require("./unified-session-compaction");
const unified_session_compaction_recovery_1 = require("./unified-session-compaction-recovery");
const unified_session_compaction_summary_1 = require("./unified-session-compaction-summary");
const session_task_timeline_1 = require("../tasks/session-task-timeline");
const rolling_session_memory_1 = require("./rolling-session-memory");
const manual_session_compaction_1 = require("./manual-session-compaction");
const session_start_hook_context_1 = require("./session-start-hook-context");
const session_compaction_runs_1 = require("./session-compaction-runs");
function checksum(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}
function messageContent(message) {
    const value = message?.content ?? message?.message?.content ?? message?.text ?? "";
    return typeof value === "string" ? value : JSON.stringify(value ?? "");
}
function messageId(message, index) {
    return String(message?.id || message?.uuid || message?.messageId || `message-${index}`);
}
function isPromptTooLongError(error) {
    const code = String(error?.code || error?.status || error?.statusCode || "").toLowerCase();
    const message = String(error?.message || error || "").toLowerCase();
    return code === "413" || code.includes("prompt_too_long") || code.includes("context_length")
        || /prompt.{0,20}too long|context.{0,20}(limit|length|window)|maximum context|too many tokens/.test(message);
}
function snapshotTokens(snapshot) {
    return (0, context_budget_1.estimateTextTokens)(JSON.stringify({ messages: snapshot.messages || [], executionEvents: snapshot.executionEvents || [], summary: snapshot.activeSummary || null, recovery: snapshot.recoveryContext || null, components: snapshot.contextComponents || null }));
}
function buildMicroCompactSnapshot(snapshot, policy, trigger) {
    void trigger;
    return {
        snapshot,
        receipt: {
            schema: "ccm-unified-microcompact-receipt-v1",
            applied: false,
            trigger: "none",
            reason: "legacy_runtime_retired",
            keepRecent: policy.keepRecentToolResults,
            clearedToolCallIds: [],
            clearedResultTokens: 0,
            rawLedgerPreserved: true,
            contentStored: false,
            compatibilityOnly: true,
            receiptChecksum: checksum({ trigger: "none", reason: "legacy_runtime_retired" }),
        },
    };
}
function selectRecentWindow(snapshot, policy) {
    const messages = Array.isArray(snapshot.messages) ? snapshot.messages : [];
    const floorIndex = Math.max(0, Math.min(messages.length, Number(snapshot.compactionFloorIndex ?? snapshot.previousState?.summarizedMessageCount ?? 0)));
    const window = (0, session_memory_window_1.calculateSessionMemoryKeepWindow)(messages, {
        floorIndex,
        minTokens: policy.minKeepTokens,
        minTextMessages: policy.minKeepTextMessages,
        maxTokens: policy.maxKeepTokens,
    });
    const preservedMessages = messages.slice(window.startIndex);
    const executionEvents = (0, session_execution_ledger_1.eventsAnchoredToMessages)((0, session_execution_ledger_1.normalizeSessionExecutionEvents)(snapshot.executionEvents), preservedMessages);
    return {
        strategy: "cc_session_memory_token_window",
        startIndex: window.startIndex,
        messages: preservedMessages,
        executionEvents,
        timeline: (0, session_execution_ledger_1.mergeConversationWithExecution)(preservedMessages, executionEvents),
        textMessageCount: window.preservedTextMessageCount,
        tokens: window.preservedTokenCount,
    };
}
// An explicit /compact mirrors Claude Code's traditional compact command: the
// complete active conversation since the last committed boundary is summarized,
// even when it is smaller than the automatic pressure window. Automatic
// compaction must continue to preserve its recent-message safety window.
function selectManualFullConversationWindow(snapshot) {
    const messages = Array.isArray(snapshot.messages) ? snapshot.messages : [];
    return {
        strategy: "cc_manual_full_conversation",
        startIndex: messages.length,
        messages: [],
        executionEvents: [],
        timeline: [],
        textMessageCount: 0,
        tokens: 0,
    };
}
async function invokeSummary(input, snapshot, previousSummary, sourceMessageIds, attempt, customInstructions) {
    (0, session_compaction_runs_1.throwIfSessionCompactionAborted)(input.signal);
    if (!input.modelCall) {
        const error = new Error("unified compaction requires a model-backed summary");
        error.code = "CCM_UNIFIED_COMPACTION_MODEL_REQUIRED";
        throw error;
    }
    const raw = await input.modelCall({
        system: unified_session_compaction_summary_1.UNIFIED_COMPACTION_SYSTEM_PROMPT,
        user: (0, unified_session_compaction_summary_1.buildUnifiedSummaryPrompt)({ snapshot, previousSummary, reason: input.reason, customInstructions }),
        maxOutputTokens: 5000,
        attempt,
        scope: snapshot.scope,
        exactSessionId: snapshot.exactSessionId,
        signal: input.signal,
    });
    (0, session_compaction_runs_1.throwIfSessionCompactionAborted)(input.signal);
    return { summary: (0, unified_session_compaction_summary_1.normalizeCcmUnifiedSummary)(raw?.summary || raw, sourceMessageIds), source: "model", metadata: { provider: raw?.provider, model: raw?.model, responseId: raw?.responseId, usage: raw?.usage } };
}
class UnifiedSessionCompactionEngine {
    input;
    constructor(input) {
        this.input = input;
    }
    async run() {
        const adapter = this.input.adapter;
        let lifecycleStarted = false;
        const publishLifecycle = (update) => {
            try {
                this.input.onLifecycle?.(update);
            }
            catch { }
        };
        (0, session_compaction_runs_1.throwIfSessionCompactionAborted)(this.input.signal);
        const fence = await adapter.acquireFence();
        try {
            (0, session_compaction_runs_1.throwIfSessionCompactionAborted)(this.input.signal);
            let snapshot = await adapter.loadSnapshot(fence);
            await adapter.validateFence(fence, snapshot);
            (0, session_compaction_runs_1.throwIfSessionCompactionAborted)(this.input.signal);
            const policy = (0, unified_session_compaction_1.resolveUnifiedCompactionPolicy)(this.input.config || {}, this.input.policy || {});
            const beforeTokens = snapshotTokens(snapshot);
            const projection = this.input.buildProjection?.(snapshot, policy);
            const measuredBefore = this.input.measure?.(projection || snapshot, snapshot) ?? beforeTokens;
            const request = this.input.request;
            if (request) {
                if (request.scope !== snapshot.scope || request.exactSessionId !== snapshot.exactSessionId)
                    throw new Error("compaction_request_scope_mismatch");
                if (Number(request.expectedGeneration || 0) !== Number(snapshot.boundaryGeneration || 0))
                    throw new Error("compaction_generation_mismatch");
            }
            const reasonText = String(this.input.reason || "").toLowerCase();
            const authoritativeManual = this.input.force === true && /manual|slash|user|command|compact[_ -]?request/.test(reasonText);
            const hookTrigger = request?.trigger || (this.input.promptTooLong ? "prompt_too_long" : authoritativeManual ? "manual" : "auto");
            const formalCandidate = this.input.force === true || this.input.promptTooLong === true || measuredBefore >= policy.autoCompactThreshold;
            const requestedInstructions = String(this.input.customInstructions || request?.customInstructions || "").trim();
            const partialRequested = request?.mode === "partial";
            const manualFullConversationRequested = this.input.force === true
                && !partialRequested
                && /manual[_ -]?slash(?:[_ -]?(?:compact|command))?|slash[_ -]?(?:compact|command)/.test(reasonText);
            const initialPartialSelection = formalCandidate && partialRequested
                ? (0, manual_session_compaction_1.selectPartialCompactionProjection)(snapshot.messages || [], request)
                : null;
            let recent = initialPartialSelection ? {
                strategy: "cc_partial_compaction",
                startIndex: initialPartialSelection.projection.safeBoundaryIndex,
                messages: initialPartialSelection.preserved,
                executionEvents: (0, session_execution_ledger_1.eventsAnchoredToMessages)((0, session_execution_ledger_1.normalizeSessionExecutionEvents)(snapshot.executionEvents), initialPartialSelection.preserved),
                timeline: (0, session_execution_ledger_1.mergeConversationWithExecution)(initialPartialSelection.preserved, (0, session_execution_ledger_1.eventsAnchoredToMessages)((0, session_execution_ledger_1.normalizeSessionExecutionEvents)(snapshot.executionEvents), initialPartialSelection.preserved)),
                textMessageCount: initialPartialSelection.preserved.filter((message) => messageContent(message).trim()).length,
                tokens: initialPartialSelection.preserved.reduce((sum, message) => sum + (0, context_budget_1.estimateTextTokens)(messageContent(message)), 0),
            } : manualFullConversationRequested
                ? selectManualFullConversationWindow(snapshot)
                : selectRecentWindow(snapshot, policy);
            if (formalCandidate && snapshot.taskTimeline?.currentTaskId) {
                const taskSnapshot = (0, session_task_timeline_1.snapshotTaskContextForBoundary)(String(snapshot.taskTimeline.currentTaskId), "compaction_boundary");
                if (taskSnapshot.success)
                    snapshot = { ...snapshot, taskTimeline: { ...snapshot.taskTimeline, taskContextRevision: taskSnapshot.revision, taskContextChecksum: taskSnapshot.checksum } };
            }
            let selectedSessionMemory = null;
            let sessionMemoryDirect = false;
            if (formalCandidate && !partialRequested && !requestedInstructions) {
                const floorIndex = Math.max(0, Number(snapshot.compactionFloorIndex ?? snapshot.previousState?.summarizedMessageCount ?? 0));
                const selection = recent.startIndex > floorIndex
                    ? (0, rolling_session_memory_1.selectRollingSessionMemoryForCompaction)(snapshot.rollingSessionMemory, snapshot, recent.startIndex - 1)
                    : { valid: false, memory: null };
                if (selection.valid) {
                    const candidateSummary = (0, unified_session_compaction_summary_1.normalizeCcmUnifiedSummary)(selection.memory.summary, selection.memory.sourceMessageIds);
                    const candidateRecovery = (0, unified_session_compaction_recovery_1.buildUnifiedRecoveryAttachment)({ snapshot, summary: candidateSummary });
                    const candidatePayload = this.input.buildPostCompactPayload
                        ? await this.input.buildPostCompactPayload({ summary: candidateSummary, preservedMessages: recent.messages, preservedTimeline: recent.timeline, recoveryContext: candidateRecovery, snapshot })
                        : { summary: candidateSummary, messages: recent.timeline, recoveryContext: candidateRecovery };
                    const candidateTokens = this.input.measure?.(candidatePayload, snapshot) ?? (0, context_budget_1.estimateTextTokens)(JSON.stringify(candidatePayload));
                    const candidateGate = this.input.buildPostCompactPayload
                        ? (0, session_compaction_core_1.buildSessionPostCompactGate)({ afterTokens: candidateTokens, threshold: policy.autoCompactThreshold })
                        : { providerCallAllowed: true };
                    if (candidateGate.providerCallAllowed === true) {
                        selectedSessionMemory = selection.memory;
                        sessionMemoryDirect = true;
                    }
                }
            }
            let preCompactHooks = [];
            (0, session_compaction_runs_1.throwIfSessionCompactionAborted)(this.input.signal);
            (0, session_compaction_runs_1.updateSessionCompactionRun)(snapshot.scope, snapshot.exactSessionId, String(this.input.compactionRunId || ""), {
                stage: sessionMemoryDirect ? "session_memory" : partialRequested ? "partial_boundary" : "request_preflight",
            });
            // V1 MicroCompact remains represented in receipts so old histories stay
            // readable, but it is permanently inert. Tool-result reduction is owned
            // exclusively by pre-request-tool-context V2 before this fallback runs.
            const micro = buildMicroCompactSnapshot(snapshot, policy, "none");
            (0, session_compaction_runs_1.throwIfSessionCompactionAborted)(this.input.signal);
            snapshot = micro.snapshot || snapshot;
            const microReceipt = micro.receipt || { schema: "ccm-unified-microcompact-receipt-v1", applied: false, trigger: "none", contentStored: false, receiptChecksum: "" };
            const afterMicroTokens = snapshotTokens(snapshot);
            const afterMicroProjection = this.input.buildProjection?.(snapshot, policy);
            const measuredAfterMicro = this.input.measure?.(afterMicroProjection || snapshot, snapshot) ?? afterMicroTokens;
            const decision = (0, unified_session_compaction_1.orchestrateUnifiedCompaction)({
                scope: snapshot.scope,
                exactSessionId: snapshot.exactSessionId,
                activeTokens: measuredAfterMicro,
                threshold: policy.autoCompactThreshold,
                force: this.input.force,
                promptTooLong: this.input.promptTooLong,
                microCompactApplied: microReceipt.applied === true,
                microCompactTrigger: microReceipt.trigger === "idle" ? "idle" : microReceipt.applied ? "pressure" : "none",
            }).decision;
            const mustSummarize = sessionMemoryDirect || decision.required || this.input.force === true || this.input.promptTooLong === true;
            const lifecycleMode = partialRequested ? "partial" : "full";
            const publishLifecycleWithMode = (update) => publishLifecycle({ ...update, mode: update.mode || lifecycleMode });
            if (mustSummarize || microReceipt.applied === true) {
                lifecycleStarted = true;
                publishLifecycleWithMode({ state: "running", stage: "request_preflight", beforeTokens: measuredBefore });
            }
            const partialSelection = mustSummarize && partialRequested
                ? initialPartialSelection || (0, manual_session_compaction_1.selectPartialCompactionProjection)(snapshot.messages || [], request)
                : null;
            recent = partialSelection ? {
                strategy: "cc_partial_compaction",
                startIndex: partialSelection.projection.safeBoundaryIndex,
                messages: partialSelection.preserved,
                executionEvents: (0, session_execution_ledger_1.eventsAnchoredToMessages)((0, session_execution_ledger_1.normalizeSessionExecutionEvents)(snapshot.executionEvents), partialSelection.preserved),
                timeline: (0, session_execution_ledger_1.mergeConversationWithExecution)(partialSelection.preserved, (0, session_execution_ledger_1.eventsAnchoredToMessages)((0, session_execution_ledger_1.normalizeSessionExecutionEvents)(snapshot.executionEvents), partialSelection.preserved)),
                textMessageCount: partialSelection.preserved.filter((message) => messageContent(message).trim()).length,
                tokens: partialSelection.preserved.reduce((sum, message) => sum + (0, context_budget_1.estimateTextTokens)(messageContent(message)), 0),
            } : manualFullConversationRequested
                ? selectManualFullConversationWindow(snapshot)
                : selectRecentWindow(snapshot, policy);
            if (mustSummarize && !sessionMemoryDirect) {
                (0, session_compaction_runs_1.updateSessionCompactionRun)(snapshot.scope, snapshot.exactSessionId, String(this.input.compactionRunId || ""), { stage: "pre_compact" });
                preCompactHooks = await (0, session_compaction_core_1.runSessionCompactionHooks)("pre_compact", {
                    scope: snapshot.scope,
                    scopeId: snapshot.exactSessionId,
                    sessionId: snapshot.exactSessionId,
                    trigger: hookTrigger,
                    mode: partialRequested ? "partial" : "full",
                    pivotMessageId: request?.pivotMessageId || "",
                    direction: request?.direction || "",
                    customInstructions: requestedInstructions,
                    signal: this.input.signal,
                });
                (0, session_compaction_runs_1.throwIfSessionCompactionAborted)(this.input.signal);
            }
            const hookInstructions = preCompactHooks.map((row) => String(row?.customInstructions || row?.custom_instructions || "").trim()).filter(Boolean);
            const effectiveCustomInstructions = [requestedInstructions, ...hookInstructions].map(String).map(value => value.trim()).filter(Boolean).join("\n\n").slice(0, 8_000);
            let summary = null;
            let summarySource = "none";
            let quality = { valid: true, score: 100, issues: [] };
            let attempts = 0;
            let modelMetadata = null;
            let ptlRecoveryAttempts = 0;
            const ptlDroppedMessageIds = [];
            if (mustSummarize && !(snapshot.messages || []).length) {
                const error = new Error("unified compaction requires an authoritative transcript");
                error.code = "CCM_UNIFIED_COMPACTION_TRANSCRIPT_REQUIRED";
                throw error;
            }
            const floorIndex = partialSelection ? 0 : Math.max(0, Number(snapshot.compactionFloorIndex ?? snapshot.previousState?.summarizedMessageCount ?? 0));
            if (mustSummarize && !partialSelection && recent.startIndex <= floorIndex) {
                const result = (0, unified_session_compaction_1.buildUnifiedCompactionReceipt)({
                    scope: snapshot.scope,
                    exactSessionId: snapshot.exactSessionId,
                    stage: "request_preflight",
                    beforeTokens: measuredBefore,
                    afterTokens: measuredAfterMicro,
                    microCompactApplied: microReceipt.applied === true,
                    microCompactTrigger: microReceipt.trigger === "idle" ? "idle" : microReceipt.applied ? "pressure" : "none",
                    summarySource: snapshot.activeSummary ? "reused" : "none",
                    gateStatus: "degraded",
                    boundaryGeneration: Math.max(Number(snapshot.boundaryGeneration || 0), Number(fence.generation || 0)),
                    summaryChecksum: snapshot.activeSummary ? (0, unified_session_compaction_summary_1.unifiedSummaryChecksum)(snapshot.activeSummary) : "",
                });
                const noRoundResult = {
                    strategy: "cc_two_stage",
                    compacted: microReceipt.applied === true,
                    reason: microReceipt.applied ? "microcompact" : "below_threshold",
                    snapshot,
                    microCompact: microReceipt,
                    fullCompaction: { attempted: false, source: snapshot.activeSummary ? "reused" : "none", summary: snapshot.activeSummary || null, attempts: 0 },
                    preservedRecentWindow: recent,
                    postCompactGate: { providerCallAllowed: false, reason: "no_complete_round_available" },
                    summaryQuality: { valid: true, score: 100, issues: [] },
                    recoveryContext: (0, unified_session_compaction_recovery_1.buildUnifiedRecoveryAttachment)({ snapshot, summary: (0, unified_session_compaction_summary_1.normalizeCcmUnifiedSummary)(snapshot.activeSummary || {}, []) }),
                    recoveryInput: null,
                    receipt: result,
                    boundaryGeneration: result.boundaryGeneration,
                    summaryChecksum: result.summaryChecksum,
                    contentStored: false,
                };
                await adapter.validateFence(fence, snapshot);
                if (noRoundResult.compacted) {
                    await adapter.commit(noRoundResult, fence);
                    publishLifecycleWithMode({ state: "completed", stage: "post_compact", beforeTokens: measuredBefore, afterTokens: measuredAfterMicro, mode: lifecycleMode });
                    lifecycleStarted = false;
                }
                return noRoundResult;
            }
            if (mustSummarize && (partialSelection || recent.startIndex > floorIndex)) {
                const sourceMessages = partialSelection ? partialSelection.summarized : (snapshot.messages || []).slice(floorIndex, recent.startIndex);
                const sourceExecution = (0, session_execution_ledger_1.eventsAnchoredToMessages)((0, session_execution_ledger_1.normalizeSessionExecutionEvents)(snapshot.executionEvents), sourceMessages);
                const sourceTimeline = (0, session_execution_ledger_1.mergeConversationWithExecution)(sourceMessages, sourceExecution);
                const sourceMessageIds = sourceTimeline.map(messageId);
                if (sessionMemoryDirect && selectedSessionMemory) {
                    summary = (0, unified_session_compaction_summary_1.normalizeCcmUnifiedSummary)(selectedSessionMemory.summary, selectedSessionMemory.sourceMessageIds);
                    summarySource = "session_memory";
                    quality = { valid: true, score: 100, issues: [] };
                }
                let summaryMessages = sourceTimeline;
                let lastError = null;
                let qualityAttempts = 0;
                for (let attempt = 1; attempt <= 5 && !summary && qualityAttempts < 2; attempt += 1) {
                    (0, session_compaction_runs_1.throwIfSessionCompactionAborted)(this.input.signal);
                    (0, session_compaction_runs_1.updateSessionCompactionRun)(snapshot.scope, snapshot.exactSessionId, String(this.input.compactionRunId || ""), { stage: ptlRecoveryAttempts ? "ptl_recovery" : "model_summary" });
                    attempts += 1;
                    try {
                        qualityAttempts += 1;
                        const invoked = await invokeSummary(this.input, { ...snapshot, messages: summaryMessages, executionEvents: [] }, snapshot.activeSummary, sourceMessageIds, attempt, effectiveCustomInstructions);
                        summary = invoked.summary;
                        modelMetadata = invoked.metadata || modelMetadata;
                        summarySource = invoked.source;
                        const shape = (0, unified_session_compaction_summary_1.runUnifiedSummaryShapeCheck)(summary);
                        const hasFacts = ["userGoals", "corrections", "decisions", "authorizationBoundaries", "completedWork", "pendingWork", "risksAndBlockers", "fileReferences", "verificationEvidence", "attachmentReferences", "nextActions"]
                            .some(key => Array.isArray(summary?.[key]) && summary[key].length > 0);
                        quality = shape.valid && hasFacts ? (0, session_summary_quality_gate_1.evaluateSessionSummaryQuality)({
                            scope: snapshot.scope,
                            sessionId: snapshot.exactSessionId,
                            summary,
                            previousSummary: snapshot.activeSummary,
                            reference: inputQualityReference(this.input, snapshot),
                            sourceMessages: sourceTimeline,
                            sourceMessageIds,
                        }) : { valid: false, score: 0, issues: [shape.valid ? "summary_core_empty" : "summary_shape_invalid", ...shape.missing] };
                        if (!quality.valid) {
                            lastError = new Error(`模型摘要校验失败: ${quality.issues.join(",")}`);
                            summary = null;
                            if (attempt < 2)
                                continue;
                        }
                    }
                    catch (error) {
                        lastError = error;
                        if (isPromptTooLongError(error)) {
                            if (ptlRecoveryAttempts < 1) {
                                (0, session_compaction_runs_1.throwIfSessionCompactionAborted)(this.input.signal);
                                const peeled = (0, session_memory_window_1.peelOldestApiConversationRound)(summaryMessages);
                                if (peeled.peeled) {
                                    ptlRecoveryAttempts += 1;
                                    qualityAttempts = Math.max(0, qualityAttempts - 1);
                                    ptlDroppedMessageIds.push(...peeled.removed.map(messageId));
                                    summaryMessages = peeled.messages;
                                    continue;
                                }
                            }
                            throw error;
                        }
                        // Provider/network/timeout retries are already owned by the shared
                        // model-call retry layer. Retrying the entire summary here would
                        // multiply its attempts (5 x 2 in the previous implementation).
                        // This loop may retry only a successfully parsed summary that then
                        // fails the compaction quality gate.
                        throw error;
                    }
                }
                if (!summary)
                    throw lastError || new Error("unified summary unavailable");
            }
            else if (snapshot.activeSummary) {
                summary = (0, unified_session_compaction_summary_1.normalizeCcmUnifiedSummary)(snapshot.activeSummary);
                summarySource = "reused";
            }
            const effectiveSummary = summary || (0, unified_session_compaction_summary_1.normalizeCcmUnifiedSummary)({}, []);
            const recoveryContext = (0, unified_session_compaction_recovery_1.buildUnifiedRecoveryAttachment)({ snapshot, summary: effectiveSummary });
            const preservedMessages = recent.messages;
            const postPayload = this.input.buildPostCompactPayload
                ? await this.input.buildPostCompactPayload({ summary: effectiveSummary, preservedMessages, preservedTimeline: recent.timeline, recoveryContext, snapshot })
                : { summary: effectiveSummary, messages: recent.timeline, recoveryContext };
            let afterTokens = this.input.measure?.(postPayload, snapshot) ?? (0, context_budget_1.estimateTextTokens)(JSON.stringify(postPayload));
            let postCompactGate = this.input.buildPostCompactPayload
                ? (0, session_compaction_core_1.buildSessionPostCompactGate)({ afterTokens, threshold: policy.autoCompactThreshold })
                : { providerCallAllowed: true, status: "ready", afterTokens, threshold: policy.autoCompactThreshold, contentStored: false };
            let recompactionAttempted = false;
            if (postCompactGate.providerCallAllowed !== true && summary) {
                (0, session_compaction_runs_1.throwIfSessionCompactionAborted)(this.input.signal);
                recompactionAttempted = true;
                const retry = await invokeSummary(this.input, { ...snapshot, messages: [], executionEvents: [] }, effectiveSummary, effectiveSummary.sourceMessageIds, attempts + 1, effectiveCustomInstructions);
                const retrySummary = retry.summary;
                const retryPayload = this.input.buildPostCompactPayload
                    ? await this.input.buildPostCompactPayload({ summary: retrySummary, preservedMessages, preservedTimeline: recent.timeline, recoveryContext, snapshot })
                    : { summary: retrySummary, messages: recent.timeline, recoveryContext };
                const retryTokens = this.input.measure?.(retryPayload, snapshot) ?? (0, context_budget_1.estimateTextTokens)(JSON.stringify(retryPayload));
                const retryGate = (0, session_compaction_core_1.buildSessionPostCompactGate)({ afterTokens: retryTokens, threshold: policy.autoCompactThreshold });
                if (retryGate.providerCallAllowed === true) {
                    const retryShape = (0, unified_session_compaction_summary_1.runUnifiedSummaryShapeCheck)(retrySummary);
                    const retryQuality = retryShape.valid ? (0, session_summary_quality_gate_1.evaluateSessionSummaryQuality)({
                        scope: snapshot.scope,
                        sessionId: snapshot.exactSessionId,
                        summary: retrySummary,
                        previousSummary: effectiveSummary,
                        reference: inputQualityReference(this.input, snapshot),
                        sourceMessages: [],
                        sourceMessageIds: effectiveSummary.sourceMessageIds,
                    }) : { valid: false, score: 0, issues: ["summary_shape_invalid"] };
                    if (retryQuality.valid) {
                        summary = retrySummary;
                        summarySource = "model";
                        quality = retryQuality;
                        afterTokens = retryTokens;
                        postCompactGate = retryGate;
                    }
                }
            }
            if (postCompactGate.providerCallAllowed !== true && mustSummarize) {
                const error = new Error(`unified session compaction remains over threshold: ${afterTokens}/${policy.autoCompactThreshold}`);
                error.code = "CCM_UNIFIED_COMPACTION_POST_GATE_FAILED";
                error.postCompactGate = postCompactGate;
                throw error;
            }
            const finalSummary = summary || effectiveSummary;
            const summaryChecksum = (0, unified_session_compaction_summary_1.unifiedSummaryChecksum)(finalSummary);
            const recoveryInput = adapter.buildRecoveryInput(finalSummary, snapshot);
            const nextGeneration = Math.max(Number(snapshot.boundaryGeneration || 0), Number(fence.generation || 0)) + (mustSummarize ? 1 : 0);
            const receipt = (0, unified_session_compaction_1.buildUnifiedCompactionReceipt)({
                scope: snapshot.scope,
                exactSessionId: snapshot.exactSessionId,
                stage: mustSummarize ? "post_gate" : "request_preflight",
                beforeTokens: measuredBefore || beforeTokens,
                afterTokens: afterTokens || afterMicroTokens,
                microCompactApplied: microReceipt.applied === true,
                microCompactTrigger: microReceipt.trigger === "idle" ? "idle" : microReceipt.applied ? "pressure" : "none",
                summarySource,
                gateStatus: postCompactGate.providerCallAllowed === true ? "ready" : "recompact_required",
                boundaryGeneration: nextGeneration,
                summaryChecksum,
                recoveryContextChecksum: recoveryContext.checksum,
                strategyApplied: ptlRecoveryAttempts > 0 ? "reactive_recovery" : summarySource === "session_memory" ? "session_memory" : summarySource === "model" ? "model_summary" : microReceipt.applied ? "microcompact" : "none",
                sessionMemoryChecksum: selectedSessionMemory?.checksum || "",
                sessionMemoryCursor: selectedSessionMemory?.summarizedThroughMessageId || "",
                ptlRecoveryAttempts,
                ptlDroppedRoundCount: ptlRecoveryAttempts,
                ptlDroppedMessageIds,
                ptlDroppedMessagesChecksum: ptlDroppedMessageIds.length ? checksum(ptlDroppedMessageIds) : "",
                executionPath: partialSelection ? "partial_model" : sessionMemoryDirect ? "session_memory_direct" : mustSummarize ? "request_preflight_summary" : "none",
                compactionRunId: this.input.compactionRunId || "",
            });
            const result = {
                strategy: "cc_two_stage",
                compacted: mustSummarize || microReceipt.applied === true,
                reason: mustSummarize ? "full_compaction" : microReceipt.applied ? "microcompact" : "below_threshold",
                snapshot,
                microCompact: microReceipt,
                fullCompaction: { attempted: mustSummarize, source: summarySource, summary: finalSummary, attempts: attempts + (recompactionAttempted ? 1 : 0) },
                preservedRecentWindow: recent,
                postCompactGate,
                summaryQuality: quality,
                recoveryContext,
                recoveryInput,
                receipt,
                boundaryGeneration: nextGeneration,
                summaryChecksum,
                contentStored: false,
                modelMetadata,
                compactionMode: partialSelection ? "partial" : "full",
                partialCompaction: partialSelection?.projection || null,
                hookResults: { preCompact: preCompactHooks, sessionStart: [], postCompact: [] },
            };
            await adapter.validateFence(fence, snapshot);
            (0, session_compaction_runs_1.throwIfSessionCompactionAborted)(this.input.signal);
            if (result.compacted) {
                (0, session_compaction_runs_1.updateSessionCompactionRun)(snapshot.scope, snapshot.exactSessionId, String(this.input.compactionRunId || ""), { stage: "committing" });
                await adapter.commit(result, fence);
                (0, session_compaction_runs_1.updateSessionCompactionRun)(snapshot.scope, snapshot.exactSessionId, String(this.input.compactionRunId || ""), { stage: "session_start", committed: true });
            }
            if (result.compacted) {
                result.hookResults.sessionStart = await (0, session_compaction_core_1.runSessionCompactionHooks)("session_start", {
                    scope: snapshot.scope,
                    scopeId: snapshot.exactSessionId,
                    sessionId: snapshot.exactSessionId,
                    trigger: hookTrigger,
                    mode: result.compactionMode,
                    result,
                    recoveryContext,
                    signal: this.input.signal,
                });
                const sessionStartHookContext = (0, session_start_hook_context_1.storeSessionStartHookContext)({
                    scope: snapshot.scope,
                    exactSessionId: snapshot.exactSessionId,
                    compactionRunId: String(this.input.compactionRunId || ""),
                    generation: result.boundaryGeneration,
                    hookResults: result.hookResults.sessionStart,
                });
                result.sessionStartHookContext = sessionStartHookContext;
                (0, session_compaction_runs_1.updateSessionCompactionRun)(snapshot.scope, snapshot.exactSessionId, String(this.input.compactionRunId || ""), { stage: "post_compact", committed: true });
                result.hookResults.postCompact = await (0, session_compaction_core_1.runSessionCompactionHooks)("post_compact", {
                    scope: snapshot.scope,
                    scopeId: snapshot.exactSessionId,
                    sessionId: snapshot.exactSessionId,
                    trigger: hookTrigger,
                    mode: result.compactionMode,
                    result,
                    summaryMetadata: { checksum: summaryChecksum, source: summarySource },
                    signal: this.input.signal,
                });
                publishLifecycleWithMode({ state: "completed", stage: "post_compact", beforeTokens: measuredBefore, afterTokens, mode: result.compactionMode || lifecycleMode });
                lifecycleStarted = false;
            }
            return result;
        }
        catch (error) {
            if (lifecycleStarted) {
                const cancelled = String(error?.code || "").includes("CANCEL") || this.input.signal?.aborted;
                publishLifecycle({ state: cancelled ? "cancelled" : "failed", stage: "error", errorCode: String(error?.code || "COMPACTION_FAILED") });
            }
            await adapter.recordFailure(error, fence);
            throw error;
        }
        finally {
            await fence.release?.();
        }
    }
}
exports.UnifiedSessionCompactionEngine = UnifiedSessionCompactionEngine;
function inputQualityReference(input, snapshot) {
    const reference = input.qualityReference?.(snapshot) || (0, unified_session_compaction_summary_1.buildUnifiedSummaryReference)(snapshot);
    if (!input.qualityReference) {
        // Message text is evidence, not a verbatim preservation contract. Durable
        // anchors become mandatory only when supplied by the scope adapter.
        for (const key of ["userGoals", "corrections", "decisions", "completedWork", "pendingWork", "risksAndBlockers", "nextActions"]) {
            if (!snapshot.activeSummary?.[key])
                reference[key] = [];
        }
    }
    const permissionBoundary = String(snapshot.recoveryContext?.permissionBoundary || "").trim();
    if (permissionBoundary && !input.qualityReference) {
        reference.authorizationBoundaries = [...new Set([...(reference.authorizationBoundaries || []), permissionBoundary])];
    }
    return reference;
}
function createUnifiedSessionCompactionEngine(input) {
    return new UnifiedSessionCompactionEngine(input);
}
//# sourceMappingURL=unified-session-compaction-engine.js.map