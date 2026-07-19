"use strict";
// Behavior-freeze split from group-compact-file-references.ts (part 3/3).
// Behavior-freeze module extracted mechanically from the former facade.
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
exports.buildGroupMemoryDispatchFreshnessGate = buildGroupMemoryDispatchFreshnessGate;
exports.recordGroupPostCompactFirstDispatchMarker = recordGroupPostCompactFirstDispatchMarker;
const crypto = __importStar(require("crypto"));
const context_budget_1 = require("../../system/context-budget");
const group_memory_shared_1 = require("./group-memory-shared");
const group_memory_storage_1 = require("./group-memory-storage");
function buildGroupMemoryDispatchFreshnessGate(input = {}) {
    const sourceManifest = input.sourceManifest || input.source_manifest || {};
    const reloadAudit = input.reloadAudit || input.reload_audit || {};
    const memoryIgnored = input.memoryIgnored === true || input.memory_ignored === true;
    const generatedAt = String(input.generatedAt || input.generated_at || new Date().toISOString());
    const scope = String(input.scope || reloadAudit.scope || "default");
    const sourceChecksum = String(sourceManifest.manifestChecksum || "");
    const reloadReason = String(reloadAudit.reason || (memoryIgnored ? "ignore_memory" : "context_bundle"));
    const sourceStatus = String(sourceManifest.status || (memoryIgnored ? "ignored" : "unknown"));
    const missingRequired = Array.isArray(sourceManifest.missingRequired) ? sourceManifest.missingRequired : [];
    const dispatchId = `gmd_${crypto.createHash("sha256").update(JSON.stringify([
        input.groupId || input.group_id || "",
        input.targetProject || input.target_project || "",
        scope,
        generatedAt,
        sourceChecksum,
        reloadReason,
        memoryIgnored,
    ])).digest("hex").slice(0, 18)}`;
    const status = memoryIgnored
        ? "memory_ignored"
        : sourceStatus === "fail" || missingRequired.length
            ? "source_incomplete"
            : reloadAudit.shouldReload === false
                ? "fresh_reused_stable_sources"
                : "fresh_reloaded";
    const gate = {
        schema: "ccm-child-agent-memory-dispatch-freshness-gate-v1",
        version: group_memory_shared_1.GROUP_MEMORY_DISPATCH_FRESHNESS_GATE_VERSION,
        dispatch_gate_id: dispatchId,
        group_id: String(input.groupId || input.group_id || ""),
        target_project: String(input.targetProject || input.target_project || ""),
        scope,
        generated_at: generatedAt,
        status,
        memory_ignored: memoryIgnored,
        action: memoryIgnored
            ? "do_not_use_platform_memory"
            : status === "source_incomplete"
                ? "use_current_context_but_verify_missing_sources"
                : reloadAudit.shouldReload === false
                    ? "reuse_stable_context_sources"
                    : "use_reloaded_context",
        source_manifest: {
            checksum: sourceChecksum,
            status: sourceStatus,
            entry_count: Number(sourceManifest.entryCount || 0),
            typed_doc_count: Number(sourceManifest.typedDocCount || 0),
            latest_mtime: sourceManifest.latestMtime || "",
            missing_required: missingRequired,
        },
        reload_audit: {
            reason: reloadReason,
            original_reason: reloadAudit.originalReason || reloadReason,
            should_reload: reloadAudit.shouldReload !== false,
            cache_action: reloadAudit.cacheAction || "",
            hook_event: reloadAudit.hookEvent || "",
            previous_audit_at: reloadAudit.previousAuditAt || "",
            source_changed: reloadAudit.sourceManifestChanged === true || reloadAudit.sourceChangeTrigger?.triggered === true,
            load_plan_changed: reloadAudit.loadPlanChanged === true,
            source_change_trigger: reloadAudit.sourceChangeTrigger || null,
        },
        receipt_contract: {
            memory_used_should_reference_gate: !memoryIgnored,
            memory_ignored_should_reference_gate: memoryIgnored,
            required_receipt_fields: ["memoryUsed", "memoryIgnored"],
        },
    };
    return {
        ...gate,
        context_budget: (0, context_budget_1.buildContextBudget)({ context: gate, maxChars: 8000, maxTokens: 20_000 }),
    };
}
function recordGroupPostCompactFirstDispatchMarker(groupId, input = {}) {
    const generatedAt = String(input.generatedAt || input.generated_at || new Date().toISOString());
    const groupSessionId = String(input.groupSessionId || input.group_session_id || "default");
    const targetProject = String(input.targetProject || input.target_project || "").trim();
    const scope = String(input.scope || (targetProject ? `child:${targetProject}` : "child"));
    const parts = (0, group_memory_shared_1.resolvePostCompactBoundaryMarkerParts)(groupId, input);
    if (!parts)
        return null;
    const ledgerFile = (0, group_memory_storage_1.getGroupPostCompactDispatchLedgerFile)(groupId, groupSessionId);
    const ledgerDisabled = input.disableLedger === true
        || input.disable_ledger === true
        || input.disablePostCompactDispatchLedger === true
        || input.disable_post_compact_dispatch_ledger === true;
    const ledger = ledgerDisabled ? { scopes: {}, entries: [] } : (0, group_memory_shared_1.readGroupPostCompactDispatchLedger)(groupId, groupSessionId);
    const scopeKey = `${scope}|${parts.boundaryId}`;
    const previous = ledger.scopes?.[scopeKey] || null;
    const dispatchSequence = Number(previous?.dispatchSequence || previous?.dispatch_sequence || 0) + 1;
    const firstDispatchAfterCompact = dispatchSequence === 1;
    const gate = input.postCompactReinjectionGate || input.post_compact_reinjection_gate || {};
    const markerCore = {
        schema: "ccm-post-compact-first-dispatch-marker-v1",
        version: group_memory_shared_1.GROUP_MEMORY_POST_COMPACT_FIRST_DISPATCH_MARKER_VERSION,
        marker_id: `pcfd_${crypto.createHash("sha256").update(JSON.stringify([
            groupId,
            targetProject,
            scope,
            parts.boundaryId,
            dispatchSequence,
        ])).digest("hex").slice(0, 18)}`,
        group_id: groupId,
        group_session_id: groupSessionId,
        target_project: targetProject,
        scope,
        generated_at: generatedAt,
        boundary_id: parts.boundaryId,
        raw_boundary_id: parts.rawBoundaryId,
        summarized_through_message_id: parts.summarizedThroughMessageId,
        summary_checksum: parts.summaryChecksum,
        compacted_message_count: parts.compactedMessageCount,
        first_dispatch_after_compact: firstDispatchAfterCompact,
        dispatch_sequence: dispatchSequence,
        previous_dispatch_at: previous?.generatedAt || previous?.generated_at || "",
        status: firstDispatchAfterCompact ? "first_dispatch_after_compact" : "post_compact_followup_dispatch",
        action: firstDispatchAfterCompact
            ? "treat_reinjected_memory_as_fresh_recovered_context"
            : "reuse_recovered_context_with_sequence_awareness",
        reinjection_gate_id: gate.reinjection_gate_id || gate.reinjectionGateId || "",
        candidate_count: Number(gate.candidate_count || gate.candidateCount || 0),
        ledger_file: ledgerFile,
        cc_parity_reference: {
            source: "Claude Code pendingPostCompaction / consumePostCompaction",
            semantics: "mark once per compact boundary and target child Agent dispatch sequence",
        },
        receipt_contract: {
            memory_used_or_ignored_may_reference_marker: true,
            required_receipt_fields: ["memoryUsed", "memoryIgnored"],
            note: "该 marker 是压缩后派发遥测；first_dispatch_after_compact=true 时，子 Agent 应把本轮记忆包视为压缩恢复后的第一跳上下文。",
        },
    };
    const marker = {
        ...markerCore,
        context_budget: (0, context_budget_1.buildContextBudget)({ context: markerCore, maxChars: 5000, maxTokens: 12_000 }),
    };
    if (!ledgerDisabled) {
        ledger.scopes = ledger.scopes || {};
        ledger.scopes[scopeKey] = {
            groupId,
            groupSessionId,
            targetProject,
            scope,
            boundaryId: parts.boundaryId,
            rawBoundaryId: parts.rawBoundaryId,
            summarizedThroughMessageId: parts.summarizedThroughMessageId,
            summaryChecksum: parts.summaryChecksum,
            dispatchSequence,
            firstDispatchAt: previous?.firstDispatchAt || previous?.first_dispatch_at || generatedAt,
            generatedAt,
            latestMarkerId: marker.marker_id,
            reinjectionGateId: marker.reinjection_gate_id,
            candidateCount: marker.candidate_count,
        };
        ledger.entries = [...(ledger.entries || []), markerCore].slice(-160);
        ledger.updatedAt = generatedAt;
        (0, group_memory_shared_1.writeGroupPostCompactDispatchLedger)(groupId, ledger, groupSessionId);
    }
    return marker;
}
//# sourceMappingURL=group-compact-file-references-part-03.js.map