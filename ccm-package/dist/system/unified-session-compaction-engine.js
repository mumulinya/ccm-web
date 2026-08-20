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
function snapshotTokens(snapshot) {
    return (0, context_budget_1.estimateTextTokens)(JSON.stringify({ messages: snapshot.messages || [], executionEvents: snapshot.executionEvents || [], summary: snapshot.activeSummary || null, recovery: snapshot.recoveryContext || null, components: snapshot.contextComponents || null }));
}
function buildMicroCompactSnapshot(snapshot, policy, trigger) {
    const events = Array.isArray(snapshot.executionEvents) ? snapshot.executionEvents : [];
    const resultEvents = events.filter(event => event?.type === "tool_result" || event?.type === "tool_result_completed" || event?.result !== undefined);
    const protectedIds = new Set(resultEvents.slice(-policy.keepRecentToolResults).map(event => String(event?.toolCallId || event?.tool_call_id || event?.id || "")));
    const cleared = [];
    let clearedTokens = 0;
    if (trigger === "none")
        return {
            snapshot,
            receipt: {
                schema: "ccm-unified-microcompact-receipt-v1",
                applied: false,
                trigger: "none",
                reason: "below_pressure_and_idle_threshold",
                keepRecent: policy.keepRecentToolResults,
                clearedToolCallIds: [],
                clearedResultTokens: 0,
                rawLedgerPreserved: true,
                contentStored: false,
                receiptChecksum: checksum({ trigger: "none", keepRecent: policy.keepRecentToolResults }),
            },
        };
    const projected = events.map(event => {
        const id = String(event?.toolCallId || event?.tool_call_id || event?.id || "");
        if (!id || protectedIds.has(id) || !(event?.payload !== undefined || event?.result !== undefined))
            return event;
        const raw = event.payload !== undefined ? event.payload : event.result;
        const rawText = typeof raw === "string" ? raw : JSON.stringify(raw ?? null);
        if ((0, context_budget_1.estimateTextTokens)(rawText) < 800)
            return event;
        cleared.push(id);
        clearedTokens += (0, context_budget_1.estimateTextTokens)(rawText);
        const projectedText = `[Old completed tool result cleared; raw ledger retained] tool_call_id=${id} checksum=${checksum(raw)} locator=${String(event?.id || id)}`;
        return event.payload !== undefined ? { ...event, payload: projectedText, projectedOnly: true } : { ...event, result: projectedText, projectedOnly: true };
    });
    return {
        snapshot: { ...snapshot, executionEvents: projected },
        receipt: {
            schema: "ccm-unified-microcompact-receipt-v1",
            applied: cleared.length > 0,
            trigger,
            keepRecent: policy.keepRecentToolResults,
            clearedToolCallIds: cleared.slice(-128),
            clearedResultTokens: clearedTokens,
            rawLedgerPreserved: true,
            contentStored: false,
            receiptChecksum: checksum({ clearedToolCallIds: cleared, clearedResultTokens: clearedTokens, keepRecent: policy.keepRecentToolResults }),
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
async function invokeSummary(input, snapshot, previousSummary, sourceMessageIds, attempt) {
    if (!input.modelCall) {
        const error = new Error("unified compaction requires a model-backed summary");
        error.code = "CCM_UNIFIED_COMPACTION_MODEL_REQUIRED";
        throw error;
    }
    const raw = await input.modelCall({
        system: unified_session_compaction_summary_1.UNIFIED_COMPACTION_SYSTEM_PROMPT,
        user: (0, unified_session_compaction_summary_1.buildUnifiedSummaryPrompt)({ snapshot, previousSummary, reason: input.reason, customInstructions: input.customInstructions }),
        maxOutputTokens: 5000,
        attempt,
        scope: snapshot.scope,
        exactSessionId: snapshot.exactSessionId,
    });
    return { summary: (0, unified_session_compaction_summary_1.normalizeCcmUnifiedSummary)(raw?.summary || raw, sourceMessageIds), source: "model", metadata: { provider: raw?.provider, model: raw?.model, responseId: raw?.responseId, usage: raw?.usage } };
}
class UnifiedSessionCompactionEngine {
    input;
    constructor(input) {
        this.input = input;
    }
    async run() {
        const adapter = this.input.adapter;
        const fence = await adapter.acquireFence();
        try {
            let snapshot = await adapter.loadSnapshot(fence);
            await adapter.validateFence(fence, snapshot);
            const policy = (0, unified_session_compaction_1.resolveUnifiedCompactionPolicy)(this.input.config || {}, this.input.policy || {});
            const beforeTokens = snapshotTokens(snapshot);
            const projection = this.input.buildProjection?.(snapshot, policy);
            const measuredBefore = this.input.measure?.(projection || snapshot, snapshot) ?? beforeTokens;
            const lastAssistant = [...(snapshot.messages || [])].reverse().find(message => String(message?.role || "") === "assistant");
            const assistantAt = Date.parse(String(lastAssistant?.timestamp || lastAssistant?.createdAt || lastAssistant?.created_at || ""));
            const idleMinutes = Number.isFinite(assistantAt) ? Math.max(0, (Date.now() - assistantAt) / 60_000) : 0;
            const microTrigger = measuredBefore >= policy.autoCompactThreshold * 0.9
                ? "pressure"
                : policy.idleAssistEnabled && idleMinutes >= policy.idleGapMinutes ? "idle" : "none";
            const micro = policy.microCompactEnabled && this.input.microCompact
                ? await this.input.microCompact(snapshot, policy)
                : policy.microCompactEnabled ? buildMicroCompactSnapshot(snapshot, policy, microTrigger) : buildMicroCompactSnapshot(snapshot, policy, "none");
            snapshot = micro.snapshot || snapshot;
            const microReceipt = micro.receipt || { schema: "ccm-unified-microcompact-receipt-v1", applied: false, contentStored: false, receiptChecksum: "" };
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
            const recent = selectRecentWindow(snapshot, policy);
            const mustSummarize = decision.required || this.input.force === true || this.input.promptTooLong === true;
            let summary = null;
            let summarySource = "none";
            let quality = { valid: true, score: 100, issues: [] };
            let attempts = 0;
            let modelMetadata = null;
            if (mustSummarize && !(snapshot.messages || []).length) {
                const error = new Error("unified compaction requires an authoritative transcript");
                error.code = "CCM_UNIFIED_COMPACTION_TRANSCRIPT_REQUIRED";
                throw error;
            }
            const floorIndex = Math.max(0, Number(snapshot.compactionFloorIndex ?? snapshot.previousState?.summarizedMessageCount ?? 0));
            if (mustSummarize && recent.startIndex <= floorIndex) {
                const result = (0, unified_session_compaction_1.buildUnifiedCompactionReceipt)({
                    scope: snapshot.scope,
                    exactSessionId: snapshot.exactSessionId,
                    stage: microReceipt.applied ? "microcompact" : "idle",
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
                if (noRoundResult.compacted)
                    await adapter.commit(noRoundResult, fence);
                return noRoundResult;
            }
            if (mustSummarize && recent.startIndex > floorIndex) {
                const sourceMessages = (snapshot.messages || []).slice(floorIndex, recent.startIndex);
                const sourceExecution = (0, session_execution_ledger_1.eventsAnchoredToMessages)((0, session_execution_ledger_1.normalizeSessionExecutionEvents)(snapshot.executionEvents), sourceMessages);
                const sourceTimeline = (0, session_execution_ledger_1.mergeConversationWithExecution)(sourceMessages, sourceExecution);
                const sourceMessageIds = sourceTimeline.map(messageId);
                const summarySnapshot = { ...snapshot, messages: sourceTimeline, executionEvents: [] };
                let lastError = null;
                for (let attempt = 1; attempt <= 2 && !summary; attempt += 1) {
                    attempts = attempt;
                    try {
                        const invoked = await invokeSummary(this.input, summarySnapshot, snapshot.activeSummary, sourceMessageIds, attempt);
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
                        if (attempt >= 2)
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
                recompactionAttempted = true;
                const retry = await invokeSummary(this.input, { ...snapshot, messages: [], executionEvents: [] }, effectiveSummary, effectiveSummary.sourceMessageIds, attempts + 1);
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
                stage: mustSummarize ? "post_gate" : microReceipt.applied ? "microcompact" : "idle",
                beforeTokens: measuredBefore || beforeTokens,
                afterTokens: afterTokens || afterMicroTokens,
                microCompactApplied: microReceipt.applied === true,
                microCompactTrigger: microReceipt.trigger === "idle" ? "idle" : microReceipt.applied ? "pressure" : "none",
                summarySource,
                gateStatus: postCompactGate.providerCallAllowed === true ? "ready" : "recompact_required",
                boundaryGeneration: nextGeneration,
                summaryChecksum,
                recoveryContextChecksum: recoveryContext.checksum,
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
            };
            await adapter.validateFence(fence, snapshot);
            if (result.compacted)
                await adapter.commit(result, fence);
            return result;
        }
        catch (error) {
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