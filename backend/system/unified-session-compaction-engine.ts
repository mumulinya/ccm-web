import * as crypto from "crypto";
import { estimateTextTokens } from "./context-budget";
import { calculateSessionMemoryKeepWindow } from "./session-memory-window";
import { buildSessionPostCompactGate } from "./session-compaction-core";
import { evaluateSessionSummaryQuality } from "./session-summary-quality-gate";
import { eventsAnchoredToMessages, mergeConversationWithExecution, normalizeSessionExecutionEvents } from "./session-execution-ledger";
import { buildUnifiedCompactionReceipt, orchestrateUnifiedCompaction, resolveUnifiedCompactionPolicy } from "./unified-session-compaction";
import { buildUnifiedRecoveryAttachment } from "./unified-session-compaction-recovery";
import type {
  UnifiedCompactionEngineInput,
  UnifiedCompactionFence,
  UnifiedCompactionResult,
  UnifiedSessionCompactionAdapter,
  CcmUnifiedSessionSummaryV1,
  UnifiedCompactionSnapshot,
} from "./unified-session-compaction-types";
import { buildUnifiedSummaryPrompt, buildUnifiedSummaryReference, normalizeCcmUnifiedSummary, runUnifiedSummaryShapeCheck, unifiedSummaryChecksum, UNIFIED_COMPACTION_SYSTEM_PROMPT } from "./unified-session-compaction-summary";
import { snapshotTaskContextForBoundary } from "../tasks/session-task-timeline";

function checksum(value: unknown) {
  return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}

function messageContent(message: any) {
  const value = message?.content ?? message?.message?.content ?? message?.text ?? "";
  return typeof value === "string" ? value : JSON.stringify(value ?? "");
}

function messageId(message: any, index: number) {
  return String(message?.id || message?.uuid || message?.messageId || `message-${index}`);
}

function snapshotTokens(snapshot: UnifiedCompactionSnapshot) {
  return estimateTextTokens(JSON.stringify({ messages: snapshot.messages || [], executionEvents: snapshot.executionEvents || [], summary: snapshot.activeSummary || null, recovery: snapshot.recoveryContext || null, components: snapshot.contextComponents || null }));
}

function buildMicroCompactSnapshot(snapshot: UnifiedCompactionSnapshot, policy: any, trigger: "pressure" | "idle" | "none") {
  const events = Array.isArray(snapshot.executionEvents) ? snapshot.executionEvents : [];
  const resultEvents = events.filter(event => event?.type === "tool_result" || event?.type === "tool_result_completed" || event?.result !== undefined);
  const protectedIds = new Set(resultEvents.slice(-policy.keepRecentToolResults).map(event => String(event?.toolCallId || event?.tool_call_id || event?.id || "")));
  const cleared: string[] = [];
  let clearedTokens = 0;
  if (trigger === "none") return {
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
    if (!id || protectedIds.has(id) || !(event?.payload !== undefined || event?.result !== undefined)) return event;
    const raw = event.payload !== undefined ? event.payload : event.result;
    const rawText = typeof raw === "string" ? raw : JSON.stringify(raw ?? null);
    if (estimateTextTokens(rawText) < 800) return event;
    cleared.push(id);
    clearedTokens += estimateTextTokens(rawText);
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

function selectRecentWindow(snapshot: UnifiedCompactionSnapshot, policy: any) {
  const messages = Array.isArray(snapshot.messages) ? snapshot.messages : [];
  const floorIndex = Math.max(0, Math.min(messages.length, Number(snapshot.compactionFloorIndex ?? snapshot.previousState?.summarizedMessageCount ?? 0)));
  const window = calculateSessionMemoryKeepWindow(messages, {
    floorIndex,
    minTokens: policy.minKeepTokens,
    minTextMessages: policy.minKeepTextMessages,
    maxTokens: policy.maxKeepTokens,
  });
  const preservedMessages = messages.slice(window.startIndex);
  const executionEvents = eventsAnchoredToMessages(normalizeSessionExecutionEvents(snapshot.executionEvents), preservedMessages);
  return {
    strategy: "cc_session_memory_token_window",
    startIndex: window.startIndex,
    messages: preservedMessages,
    executionEvents,
    timeline: mergeConversationWithExecution(preservedMessages, executionEvents),
    textMessageCount: window.preservedTextMessageCount,
    tokens: window.preservedTokenCount,
  };
}

async function invokeSummary(input: UnifiedCompactionEngineInput, snapshot: UnifiedCompactionSnapshot, previousSummary: any, sourceMessageIds: string[], attempt: number) {
  if (!input.modelCall) {
    const error: any = new Error("unified compaction requires a model-backed summary");
    error.code = "CCM_UNIFIED_COMPACTION_MODEL_REQUIRED";
    throw error;
  }
  const raw = await input.modelCall({
    system: UNIFIED_COMPACTION_SYSTEM_PROMPT,
    user: buildUnifiedSummaryPrompt({ snapshot, previousSummary, reason: input.reason, customInstructions: input.customInstructions }),
    maxOutputTokens: 5000,
    attempt,
    scope: snapshot.scope,
    exactSessionId: snapshot.exactSessionId,
  });
  return { summary: normalizeCcmUnifiedSummary(raw?.summary || raw, sourceMessageIds), source: "model" as const, metadata: { provider: raw?.provider, model: raw?.model, responseId: raw?.responseId, usage: raw?.usage } };
}

export class UnifiedSessionCompactionEngine {
  constructor(private readonly input: UnifiedCompactionEngineInput) {}

  async run(): Promise<UnifiedCompactionResult> {
    const adapter = this.input.adapter;
    const fence = await adapter.acquireFence();
    try {
      let snapshot = await adapter.loadSnapshot(fence);
      await adapter.validateFence(fence, snapshot);
      const policy = resolveUnifiedCompactionPolicy(this.input.config || {}, this.input.policy || {});
      const beforeTokens = snapshotTokens(snapshot);
      const projection = this.input.buildProjection?.(snapshot, policy);
      const measuredBefore = this.input.measure?.(projection || snapshot, snapshot) ?? beforeTokens;
      const lastAssistant = [...(snapshot.messages || [])].reverse().find(message => String(message?.role || "") === "assistant");
      const assistantAt = Date.parse(String(lastAssistant?.timestamp || lastAssistant?.createdAt || lastAssistant?.created_at || ""));
      const idleMinutes = Number.isFinite(assistantAt) ? Math.max(0, (Date.now() - assistantAt) / 60_000) : 0;
      const microTrigger = measuredBefore >= policy.autoCompactThreshold * 0.9
        ? "pressure" as const
        : policy.idleAssistEnabled && idleMinutes >= policy.idleGapMinutes ? "idle" as const : "none" as const;
      const micro = policy.microCompactEnabled && this.input.microCompact
        ? await this.input.microCompact(snapshot, policy)
        : policy.microCompactEnabled ? buildMicroCompactSnapshot(snapshot, policy, microTrigger) : buildMicroCompactSnapshot(snapshot, policy, "none");
      snapshot = micro.snapshot || snapshot;
      const microReceipt = micro.receipt || { schema: "ccm-unified-microcompact-receipt-v1", applied: false, contentStored: false, receiptChecksum: "" };
      const afterMicroTokens = snapshotTokens(snapshot);
      const afterMicroProjection = this.input.buildProjection?.(snapshot, policy);
      const measuredAfterMicro = this.input.measure?.(afterMicroProjection || snapshot, snapshot) ?? afterMicroTokens;
      const decision = orchestrateUnifiedCompaction({
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
      if (mustSummarize && snapshot.taskTimeline?.currentTaskId) {
        const taskSnapshot = snapshotTaskContextForBoundary(String(snapshot.taskTimeline.currentTaskId), "compaction_boundary");
        if (taskSnapshot.success) snapshot = { ...snapshot, taskTimeline: { ...snapshot.taskTimeline, taskContextRevision: taskSnapshot.revision, taskContextChecksum: taskSnapshot.checksum } };
      }
      let summary: CcmUnifiedSessionSummaryV1 | null = null;
      let summarySource: any = "none";
      let quality: any = { valid: true, score: 100, issues: [] };
      let attempts = 0;
      let modelMetadata: any = null;
      if (mustSummarize && !(snapshot.messages || []).length) {
        const error: any = new Error("unified compaction requires an authoritative transcript");
        error.code = "CCM_UNIFIED_COMPACTION_TRANSCRIPT_REQUIRED";
        throw error;
      }
      const floorIndex = Math.max(0, Number(snapshot.compactionFloorIndex ?? snapshot.previousState?.summarizedMessageCount ?? 0));
      if (mustSummarize && recent.startIndex <= floorIndex) {
        const result = buildUnifiedCompactionReceipt({
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
          summaryChecksum: snapshot.activeSummary ? unifiedSummaryChecksum(snapshot.activeSummary) : "",
        });
        const noRoundResult: any = {
          strategy: "cc_two_stage",
          compacted: microReceipt.applied === true,
          reason: microReceipt.applied ? "microcompact" : "below_threshold",
          snapshot,
          microCompact: microReceipt,
          fullCompaction: { attempted: false, source: snapshot.activeSummary ? "reused" : "none", summary: snapshot.activeSummary || null, attempts: 0 },
          preservedRecentWindow: recent,
          postCompactGate: { providerCallAllowed: false, reason: "no_complete_round_available" },
          summaryQuality: { valid: true, score: 100, issues: [] },
          recoveryContext: buildUnifiedRecoveryAttachment({ snapshot, summary: normalizeCcmUnifiedSummary(snapshot.activeSummary || {}, []) }),
          recoveryInput: null,
          receipt: result,
          boundaryGeneration: result.boundaryGeneration,
          summaryChecksum: result.summaryChecksum,
          contentStored: false,
        };
        await adapter.validateFence(fence, snapshot);
        if (noRoundResult.compacted) await adapter.commit(noRoundResult, fence);
        return noRoundResult;
      }
      if (mustSummarize && recent.startIndex > floorIndex) {
        const sourceMessages = (snapshot.messages || []).slice(floorIndex, recent.startIndex);
        const sourceExecution = eventsAnchoredToMessages(normalizeSessionExecutionEvents(snapshot.executionEvents), sourceMessages);
        const sourceTimeline = mergeConversationWithExecution(sourceMessages, sourceExecution);
        const sourceMessageIds = sourceTimeline.map(messageId);
        const summarySnapshot = { ...snapshot, messages: sourceTimeline, executionEvents: [] };
        let lastError: unknown = null;
        for (let attempt = 1; attempt <= 2 && !summary; attempt += 1) {
          attempts = attempt;
          try {
            const invoked = await invokeSummary(this.input, summarySnapshot, snapshot.activeSummary, sourceMessageIds, attempt);
            summary = invoked.summary;
            modelMetadata = invoked.metadata || modelMetadata;
            summarySource = invoked.source;
            const shape = runUnifiedSummaryShapeCheck(summary);
            const hasFacts = ["userGoals", "corrections", "decisions", "authorizationBoundaries", "completedWork", "pendingWork", "risksAndBlockers", "fileReferences", "verificationEvidence", "attachmentReferences", "nextActions"]
              .some(key => Array.isArray((summary as any)?.[key]) && (summary as any)[key].length > 0);
            quality = shape.valid && hasFacts ? evaluateSessionSummaryQuality({
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
              if (attempt < 2) continue;
            }
          } catch (error) {
            lastError = error;
            if (attempt >= 2) throw error;
          }
        }
        if (!summary) throw lastError || new Error("unified summary unavailable");
      } else if (snapshot.activeSummary) {
        summary = normalizeCcmUnifiedSummary(snapshot.activeSummary);
        summarySource = "reused";
      }
      const effectiveSummary = summary || normalizeCcmUnifiedSummary({}, []);
      const recoveryContext = buildUnifiedRecoveryAttachment({ snapshot, summary: effectiveSummary });
      const preservedMessages = recent.messages;
      const postPayload = this.input.buildPostCompactPayload
        ? await this.input.buildPostCompactPayload({ summary: effectiveSummary, preservedMessages, preservedTimeline: recent.timeline, recoveryContext, snapshot })
        : { summary: effectiveSummary, messages: recent.timeline, recoveryContext };
      let afterTokens = this.input.measure?.(postPayload, snapshot) ?? estimateTextTokens(JSON.stringify(postPayload));
      let postCompactGate = this.input.buildPostCompactPayload
        ? buildSessionPostCompactGate({ afterTokens, threshold: policy.autoCompactThreshold })
        : { providerCallAllowed: true, status: "ready", afterTokens, threshold: policy.autoCompactThreshold, contentStored: false };
      let recompactionAttempted = false;
      if (postCompactGate.providerCallAllowed !== true && summary) {
        recompactionAttempted = true;
        const retry = await invokeSummary(this.input, { ...snapshot, messages: [], executionEvents: [] }, effectiveSummary, effectiveSummary.sourceMessageIds, attempts + 1);
        const retrySummary = retry.summary;
        const retryPayload = this.input.buildPostCompactPayload
          ? await this.input.buildPostCompactPayload({ summary: retrySummary, preservedMessages, preservedTimeline: recent.timeline, recoveryContext, snapshot })
          : { summary: retrySummary, messages: recent.timeline, recoveryContext };
        const retryTokens = this.input.measure?.(retryPayload, snapshot) ?? estimateTextTokens(JSON.stringify(retryPayload));
        const retryGate = buildSessionPostCompactGate({ afterTokens: retryTokens, threshold: policy.autoCompactThreshold });
        if (retryGate.providerCallAllowed === true) {
          const retryShape = runUnifiedSummaryShapeCheck(retrySummary);
          const retryQuality = retryShape.valid ? evaluateSessionSummaryQuality({
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
        const error: any = new Error(`unified session compaction remains over threshold: ${afterTokens}/${policy.autoCompactThreshold}`);
        error.code = "CCM_UNIFIED_COMPACTION_POST_GATE_FAILED";
        error.postCompactGate = postCompactGate;
        throw error;
      }
      const finalSummary = summary || effectiveSummary;
      const summaryChecksum = unifiedSummaryChecksum(finalSummary);
      const recoveryInput = adapter.buildRecoveryInput(finalSummary, snapshot);
      const nextGeneration = Math.max(Number(snapshot.boundaryGeneration || 0), Number(fence.generation || 0)) + (mustSummarize ? 1 : 0);
      const receipt = buildUnifiedCompactionReceipt({
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
      const result: UnifiedCompactionResult = {
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
      if (result.compacted) await adapter.commit(result, fence);
      return result;
    } catch (error) {
      await adapter.recordFailure(error, fence);
      throw error;
    } finally {
      await fence.release?.();
    }
  }
}

function inputQualityReference(input: UnifiedCompactionEngineInput, snapshot: UnifiedCompactionSnapshot) {
  const reference = input.qualityReference?.(snapshot) || buildUnifiedSummaryReference(snapshot);
  if (!input.qualityReference) {
    // Message text is evidence, not a verbatim preservation contract. Durable
    // anchors become mandatory only when supplied by the scope adapter.
    for (const key of ["userGoals", "corrections", "decisions", "completedWork", "pendingWork", "risksAndBlockers", "nextActions"]) {
      if (!snapshot.activeSummary?.[key]) reference[key] = [];
    }
  }
  const permissionBoundary = String(snapshot.recoveryContext?.permissionBoundary || "").trim();
  if (permissionBoundary && !input.qualityReference) {
    reference.authorizationBoundaries = [...new Set([...(reference.authorizationBoundaries || []), permissionBoundary])];
  }
  return reference;
}

export function createUnifiedSessionCompactionEngine(input: UnifiedCompactionEngineInput) {
  return new UnifiedSessionCompactionEngine(input);
}
