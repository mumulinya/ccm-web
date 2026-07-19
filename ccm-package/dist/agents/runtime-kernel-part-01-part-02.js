"use strict";
// Behavior-freeze split from runtime-kernel-part-01.ts (part 2/2).
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildWorkerMemoryRecallTrustContract = buildWorkerMemoryRecallTrustContract;
exports.renderWorkerMemoryRecallTrustContract = renderWorkerMemoryRecallTrustContract;
exports.extractPressureMemoryProvenanceReceiptDiscipline = extractPressureMemoryProvenanceReceiptDiscipline;
exports.renderPressureMemoryProvenanceReceiptDiscipline = renderPressureMemoryProvenanceReceiptDiscipline;
exports.extractPressureProvenanceDispatchFeedbackPolicy = extractPressureProvenanceDispatchFeedbackPolicy;
exports.renderPressureProvenanceDispatchFeedbackPolicy = renderPressureProvenanceDispatchFeedbackPolicy;
exports.extractPressureProvenanceProviderDispatchAdvisory = extractPressureProvenanceProviderDispatchAdvisory;
exports.renderPressureProvenanceProviderDispatchAdvisory = renderPressureProvenanceProviderDispatchAdvisory;
exports.renderProviderSwitchDecisionReceipt = renderProviderSwitchDecisionReceipt;
exports.extractProviderRankingCompactRepairReceiptMemoryContract = extractProviderRankingCompactRepairReceiptMemoryContract;
exports.renderProviderRankingCompactRepairReceiptMemoryContract = renderProviderRankingCompactRepairReceiptMemoryContract;
exports.extractPostCompactReinjectionRepairReceiptMemoryContract = extractPostCompactReinjectionRepairReceiptMemoryContract;
exports.renderPostCompactReinjectionRepairReceiptMemoryContract = renderPostCompactReinjectionRepairReceiptMemoryContract;
const runtime_kernel_part_01_part_01_1 = require("./runtime-kernel-part-01-part-01");
function buildWorkerMemoryRecallTrustContract(memory = null, memoryPolicy = {}, deliveryCapsuleInput = null, expectedBinding = null) {
    if (memoryPolicy?.ignored === true)
        return null;
    const recall = (0, runtime_kernel_part_01_part_01_1.extractWorkerTypedMemoryRecall)(memory);
    const docs = Array.isArray(recall?.recalled) ? recall.recalled : [];
    if (!recall?.schema || recall.ignored === true || !docs.length)
        return null;
    const rows = docs.map((doc) => {
        const freshness = doc.freshness || {};
        return {
            rel_path: String(doc.relPath || doc.rel_path || ""),
            document_checksum: String(doc.checksum || doc.document_checksum || ""),
            age_days: Math.max(0, Number(freshness.age_days || freshness.ageDays || 0)),
            age_label: String(freshness.age_label || freshness.ageLabel || "today"),
            stale: freshness.stale === true,
            current_source_verification_required: true,
        };
    }).filter((row) => row.rel_path);
    if (!rows.length)
        return null;
    const groupId = String(memory?.group_id || memory?.groupId || "");
    const groupSessionId = String(memory?.group_session_id || memory?.groupSessionId || "");
    const scopeId = groupId && groupSessionId && groupSessionId !== "default" ? `${groupId}--${groupSessionId}` : groupId;
    const deliveryCapsule = (0, runtime_kernel_part_01_part_01_1.validateWorkerTypedMemoryDeliveryCapsule)(deliveryCapsuleInput || (0, runtime_kernel_part_01_part_01_1.extractWorkerTypedMemoryDeliveryCapsule)(memory), { expectedBinding });
    const contract = {
        schema: "ccm-worker-memory-recall-trust-contract-v1",
        version: 1,
        group_id: groupId,
        group_session_id: groupSessionId,
        scope_id: scopeId,
        recalled_count: rows.length,
        stale_count: rows.filter((row) => row.stale).length,
        fresh_count: rows.filter((row) => !row.stale).length,
        stale_after_days: 1,
        required_rel_paths: rows.map((row) => row.rel_path),
        stale_rel_paths: rows.filter((row) => row.stale).map((row) => row.rel_path),
        verification_required_before_recommendation: true,
        current_source_wins_on_conflict: true,
        stale_memory_must_be_updated_or_removed: true,
        receipt_required: true,
        required_receipt_field: "CCM_AGENT_RECEIPT.typedMemoryUsage",
        required_receipt_fields: ["relPath", "usageState", "currentSourceVerified", "currentSourceEvidence", "reason"],
        conflict_receipt_fields: ["conflictDetected", "conflictKind", "recommendedMemoryAction", "conflictReason", "replacementMemory"],
        delivery_capsule_required: rows.length > 0,
        delivery_capsule_checksum: deliveryCapsule?.capsule_checksum || "",
        delivery_capsule_checksum_valid: deliveryCapsule?.checksum_valid === true,
        delivery_capsule_binding_checksum: expectedBinding?.binding_checksum || "",
        delivery_capsule_binding_valid: deliveryCapsule?.binding_valid === true,
        delivery_capsule_complete: deliveryCapsule?.delivery_complete === true,
        rows,
    };
    contract.contract_checksum = (0, runtime_kernel_part_01_part_01_1.hash)([
        contract.schema,
        contract.scope_id,
        contract.delivery_capsule_checksum,
        contract.delivery_capsule_checksum_valid,
        contract.delivery_capsule_binding_checksum,
        contract.delivery_capsule_binding_valid,
        contract.delivery_capsule_complete,
        rows.map((row) => [row.rel_path, row.document_checksum, row.age_days, row.stale]),
    ], 32);
    return contract;
}
function renderWorkerMemoryRecallTrustContract(contract = null) {
    if (!contract?.schema || !Array.isArray(contract.rows) || !contract.rows.length)
        return "";
    return [
        "## Before recommending from memory",
        `Memory recall trust contract：scope=${contract.scope_id || ""}；recalled=${contract.recalled_count || 0}；stale=${contract.stale_count || 0}；checksum=${contract.contract_checksum || ""}`,
        contract.delivery_capsule_required === true
            ? `- Delivery capsule：checksum=${contract.delivery_capsule_checksum || "missing"}；valid=${contract.delivery_capsule_checksum_valid === true}；binding=${contract.delivery_capsule_binding_valid === true}；complete=${contract.delivery_capsule_complete === true}。无效、身份不匹配或不完整时必须 fail closed，不得使用 capsule 正文。`
            : "",
        "- A recalled memory is a point-in-time claim, not live repository or resource state. Current files and resources win on conflict.",
        "- Before recommending a recalled file path, check it exists. Before recommending a function or flag, search current source. Before the user acts on a recommendation, verify it first.",
        contract.stale_count > 0 ? `- Stale recalled memories: ${(contract.stale_rel_paths || []).join(", ")}. Their code behavior and file:line claims require fresh verification.` : "- Recalled memories are at most one day old, but specific code and resource claims still require current-source verification.",
        "- Final CCM_AGENT_RECEIPT.typedMemoryUsage must cover every relPath. used/verified claims require currentSourceEvidence that CCM can recompute; ignored claims require a reason.",
        "- If current evidence conflicts with memory, do not act on the stale claim. Set conflictDetected=true with conflictKind, recommendedMemoryAction, and conflictReason; update also requires replacementMemory. This creates a user-confirmed candidate and never authorizes the worker to mutate long-term memory directly.",
    ].filter(Boolean).join("\n");
}
function extractPressureMemoryProvenanceReceiptDiscipline(memory = {}, fallback = null) {
    const candidate = fallback
        || memory?.pressure_memory_provenance_receipt_discipline
        || memory?.pressureMemoryProvenanceReceiptDiscipline
        || memory?.group_state?.typedMemory?.pressureProvenanceReceiptDiscipline
        || memory?.group_state?.typed_memory?.pressure_provenance_receipt_discipline
        || memory?.typedMemory?.pressureProvenanceReceiptDiscipline
        || null;
    if (!candidate?.schema)
        return null;
    const rows = Array.isArray(candidate.rows) ? candidate.rows : [];
    const exampleRows = Array.isArray(candidate.exampleRows || candidate.example_rows) ? (candidate.exampleRows || candidate.example_rows) : [];
    return {
        ...candidate,
        active: candidate.active === true || rows.length > 0,
        rows,
        exampleRows,
    };
}
function renderPressureMemoryProvenanceReceiptDiscipline(discipline = {}) {
    if (!discipline?.schema || discipline.active === false)
        return "";
    const rows = Array.isArray(discipline.rows) ? discipline.rows.slice(0, 6) : [];
    const examples = Array.isArray(discipline.exampleRows || discipline.example_rows)
        ? (discipline.exampleRows || discipline.example_rows).slice(0, 3)
        : [];
    return [
        `Pressure memory provenance receipt discipline：docs=${discipline.docCount || rows.length || 0}；source=${discipline.source || "typed_memory_pressure_repair_provenance"}`,
        "- CCM_AGENT_RECEIPT.memoryProvenanceUsage is required for every surfaced pressure repair MEMORY.md row.",
        "- Required fields: relPath, usageState, provenanceStatus, repairWorkItemId, repairStatus, repairGapType, currentSourceVerified.",
        "- If usageState is used/verified for disputed_under_repair or stale_evidence_under_repair memory, reread or verify the current source first and set currentSourceVerified=true.",
        ...rows.map((row) => [
            `- relPath=${row.relPath || row.rel_path || row.name || "unknown"}`,
            `provenanceStatus=${row.provenanceStatus || row.provenance_status || "under_repair"}`,
            `repairWorkItemId=${row.repairWorkItemId || row.repair_work_item_id || "unknown"}`,
            `repairStatus=${row.repairStatus || row.repair_status || "pending"}`,
            `repairGapType=${row.repairGapType || row.repair_gap_type || "pressure_repair_provenance"}`,
        ].join("；")),
        examples.length ? `- Example CCM_AGENT_RECEIPT.memoryProvenanceUsage=${JSON.stringify(examples)}` : "",
    ].filter(Boolean).join("\n");
}
function extractPressureProvenanceDispatchFeedbackPolicy(memory = {}, fallback = null) {
    const candidate = fallback
        || memory?.pressure_provenance_dispatch_feedback_policy
        || memory?.pressureProvenanceDispatchFeedbackPolicy
        || memory?.group_state?.typedMemory?.pressureProvenanceDispatchFeedbackPolicy
        || memory?.group_state?.typed_memory?.pressure_provenance_dispatch_feedback_policy
        || memory?.typedMemory?.pressureProvenanceDispatchFeedbackPolicy
        || null;
    if (!candidate?.schema)
        return null;
    const policyRows = Array.isArray(candidate.policyRows || candidate.policy_rows)
        ? (candidate.policyRows || candidate.policy_rows)
        : [];
    const active = candidate.active === true
        ? true
        : candidate.active === false
            ? false
            : policyRows.length > 0 && candidate.disabled !== true;
    return {
        ...candidate,
        active,
        policyRows,
    };
}
function renderPressureProvenanceDispatchFeedbackPolicy(policy = {}) {
    if (!policy?.schema || policy.active === false)
        return "";
    const rows = Array.isArray(policy.policyRows || policy.policy_rows)
        ? (policy.policyRows || policy.policy_rows).slice(0, 4)
        : [];
    const fields = Array.isArray(policy.requiredReceiptFields || policy.required_receipt_fields)
        ? (policy.requiredReceiptFields || policy.required_receipt_fields)
        : [];
    return [
        `Pressure provenance dispatch feedback policy：agentType=${policy.agentType || policy.agent_type || "unknown"}；project=${policy.targetProject || policy.target_project || "unknown"}；severity=${policy.severity || "medium"}；action=${policy.action || "strengthen_pressure_memory_provenance_receipt_contract"}`,
        "- This executor/project has historical post-dispatch pressure provenance receipt violations; ACK must acknowledge memoryProvenanceUsage and final receipts must be reviewed before closing.",
        fields.length ? `- Required receipt fields: ${fields.join(", ")}.` : "",
        policy.closeGate ? `- Close gate: ${policy.closeGate || policy.close_gate}.` : "",
        ...rows.map((row) => [
            `- historical agentType=${row.agent_type || row.agentType || "unknown"}`,
            `project=${row.project || "unknown"}`,
            `violations=${row.violation_count || row.violationCount || 0}`,
            Number(row.recovery_credit || row.recoveryCredit || 0) > 0 ? `recoveryCredit=${row.recovery_credit || row.recoveryCredit || 0}` : "",
            (row.effective_violation_count ?? row.effectiveViolationCount) !== undefined ? `effectiveViolations=${row.effective_violation_count ?? row.effectiveViolationCount}` : "",
            row.relapsed === true ? `relapsed=true` : "",
            Number(row.post_recovery_violation_count || row.postRecoveryViolationCount || 0) > 0 ? `postRecoveryViolations=${row.post_recovery_violation_count || row.postRecoveryViolationCount || 0}` : "",
            `missingMemoryProvenanceUsage=${row.missing_memory_provenance_usage_count || row.missingMemoryProvenanceUsageCount || 0}`,
            `currentSourceVerifiedGap=${row.current_source_verified_gap_count || row.currentSourceVerifiedGapCount || 0}`,
        ].filter(Boolean).join("；")),
    ].filter(Boolean).join("\n");
}
function extractPressureProvenanceProviderDispatchAdvisory(memory = {}, fallback = null) {
    const candidate = fallback
        || memory?.pressure_provenance_provider_dispatch_advisory
        || memory?.pressureProvenanceProviderDispatchAdvisory
        || memory?.pressure_provenance_feedback_provider_dispatch_advisory
        || memory?.pressureProvenanceFeedbackProviderDispatchAdvisory
        || memory?.group_state?.typedMemory?.pressureProvenanceProviderDispatchAdvisory
        || memory?.group_state?.typed_memory?.pressure_provenance_provider_dispatch_advisory
        || memory?.typedMemory?.pressureProvenanceProviderDispatchAdvisory
        || null;
    if (!candidate?.schema)
        return null;
    const selected = candidate.selected_candidate || candidate.selectedCandidate || candidate.current_candidate || candidate.currentCandidate || candidate;
    const dispatchPolicy = String(selected.dispatch_policy || selected.dispatchPolicy || candidate.dispatch_policy || candidate.dispatchPolicy || "");
    return {
        ...candidate,
        selected_candidate: selected,
        dispatch_policy: dispatchPolicy || "normal_dispatch",
        should_hold_dispatch: candidate.should_hold_dispatch === true
            || candidate.shouldHoldDispatch === true
            || selected.should_hold_dispatch === true
            || selected.shouldHoldDispatch === true
            || dispatchPolicy === "hold_until_repair",
    };
}
function renderPressureProvenanceProviderDispatchAdvisory(advisory = {}) {
    if (!advisory?.schema)
        return "";
    const selected = advisory.selected_candidate || advisory.selectedCandidate || advisory.current_candidate || advisory.currentCandidate || advisory;
    const alternatives = Array.isArray(advisory.safer_alternatives || advisory.saferAlternatives)
        ? (advisory.safer_alternatives || advisory.saferAlternatives).slice(0, 4)
        : [];
    const openRepairIds = Array.isArray(selected.current_open_repair_item_ids || selected.currentOpenRepairItemIds)
        ? (selected.current_open_repair_item_ids || selected.currentOpenRepairItemIds).slice(0, 6)
        : [];
    const reliabilitySnapshot = advisory.provider_reliability_snapshot || advisory.providerReliabilitySnapshot || null;
    const selectedRankingProvenance = selected.provider_ranking_provenance || selected.providerRankingProvenance || {};
    const selectedTypedMemoryRelPaths = Array.isArray(selectedRankingProvenance.typed_memory_rel_paths || selectedRankingProvenance.typedMemoryRelPaths)
        ? (selectedRankingProvenance.typed_memory_rel_paths || selectedRankingProvenance.typedMemoryRelPaths).slice(0, 4)
        : [];
    const selectedTypedMemoryRowIds = Array.isArray(selectedRankingProvenance.typed_memory_row_ids || selectedRankingProvenance.typedMemoryRowIds)
        ? (selectedRankingProvenance.typed_memory_row_ids || selectedRankingProvenance.typedMemoryRowIds).slice(0, 4)
        : [];
    return [
        `Pressure provenance provider dispatch advisory：agentType=${selected.agent_type || selected.agentType || advisory.agent_type || advisory.agentType || "unknown"}；project=${selected.project || advisory.project || "unknown"}；health=${selected.health_status || selected.healthStatus || advisory.health_status || advisory.healthStatus || "unknown"}；policy=${selected.dispatch_policy || selected.dispatchPolicy || advisory.dispatch_policy || advisory.dispatchPolicy || "normal_dispatch"}`,
        advisory.should_hold_dispatch === true || advisory.shouldHoldDispatch === true || selected.dispatch_policy === "hold_until_repair" || selected.dispatchPolicy === "hold_until_repair"
            ? "- Pre-dispatch hold: do not launch this child-agent runner until pressure provenance repair/recovery closes the critical state."
            : "",
        selected.dispatch_recommendation || selected.dispatchRecommendation ? `- Recommendation: ${selected.dispatch_recommendation || selected.dispatchRecommendation}.` : "",
        Number(selected.effective_violation_count || selected.effectiveViolationCount || 0) > 0 ? `- effectiveViolations=${selected.effective_violation_count || selected.effectiveViolationCount || 0}; recoveryCredit=${selected.recovery_credit || selected.recoveryCredit || 0}; relapsed=${selected.relapsed === true}.` : "",
        Number(selected.provider_override_followup_receipt_validation_attempt_count || selected.providerOverrideFollowupReceiptValidationAttemptCount || 0) > 0
            ? `- Corrected receipt validation history: attempts=${selected.provider_override_followup_receipt_validation_attempt_count || selected.providerOverrideFollowupReceiptValidationAttemptCount || 0}; failed=${selected.provider_override_followup_receipt_validation_failed_count || selected.providerOverrideFollowupReceiptValidationFailedCount || 0}; passed=${selected.provider_override_followup_receipt_validation_passed_count || selected.providerOverrideFollowupReceiptValidationPassedCount || 0}; consecutiveFailures=${selected.provider_override_followup_receipt_validation_consecutive_failure_count || selected.providerOverrideFollowupReceiptValidationConsecutiveFailureCount || 0}; escalated=${selected.provider_override_followup_receipt_validation_escalated === true || selected.providerOverrideFollowupReceiptValidationEscalated === true}; repairVerified=${selected.provider_override_followup_receipt_validation_repair_verified === true || selected.providerOverrideFollowupReceiptValidationRepairVerified === true}.`
            : "",
        Number(selected.provider_switch_execution_executed_count || selected.providerSwitchExecutionExecutedCount || 0) > 0
            ? `- Provider switch execution history: executed=${selected.provider_switch_execution_executed_count || selected.providerSwitchExecutionExecutedCount || 0}; passed=${selected.provider_switch_execution_passed_count || selected.providerSwitchExecutionPassedCount || 0}; failed=${selected.provider_switch_execution_failed_count || selected.providerSwitchExecutionFailedCount || 0}; mismatch=${selected.provider_switch_execution_mismatch_count || selected.providerSwitchExecutionMismatchCount || 0}; escalated=${selected.provider_switch_execution_mismatch_escalated === true || selected.providerSwitchExecutionMismatchEscalated === true}; decayedRisk=${selected.provider_switch_execution_weighted_risk_score || selected.providerSwitchExecutionWeightedRiskScore || 0}; riskScore=${selected.provider_switch_execution_risk_score || selected.providerSwitchExecutionRiskScore || 0}; rankPenalty=${selected.local_execution_rank_penalty || selected.localExecutionRankPenalty || 0}; actualProviders=${(selected.provider_switch_execution_actual_providers || selected.providerSwitchExecutionActualProviders || []).slice(0, 6).join(",") || "unknown"}. Passed history is not future switch authorization.`
            : "",
        selectedTypedMemoryRelPaths.length || selectedTypedMemoryRowIds.length
            ? `- Provider ranking provenance: memory=${selectedTypedMemoryRelPaths.join(",") || "unknown"}; rows=${selectedTypedMemoryRowIds.join(",") || "unknown"}; compactSafe=true.`
            : "",
        selected.cross_group_provider_reliability_actionable === true || selected.crossGroupProviderReliabilityActionable === true
            ? `- Cross-group provider reliability guidance: risk=${selected.cross_group_provider_reliability_risk_status || selected.crossGroupProviderReliabilityRiskStatus || "unknown"}; score=${selected.cross_group_provider_reliability_risk_score || selected.crossGroupProviderReliabilityRiskScore || 0}; confidence=${selected.cross_group_provider_reliability_confidence || selected.crossGroupProviderReliabilityConfidence || 0}; sourceGroups=${selected.cross_group_provider_reliability_source_group_count || selected.crossGroupProviderReliabilitySourceGroupCount || 0}; guidanceOnly=true; localPolicyOverrideAllowed=false; no private group memory is included.`
            : "",
        reliabilitySnapshot?.snapshot_id
            ? `- Provider reliability snapshot: id=${reliabilitySnapshot.snapshot_id}; generation=${reliabilitySnapshot.generation_id || "unknown"}; status=${reliabilitySnapshot.status || "unknown"}; expires=${reliabilitySnapshot.expires_at || "unknown"}; checksum=${reliabilitySnapshot.snapshot_checksum || "missing"}.`
            : "",
        openRepairIds.length ? `- Open repair work items: ${openRepairIds.join(", ")}.` : "",
        alternatives.length ? `- Safer alternatives: ${alternatives.map((item) => {
            const provenance = item.provider_ranking_provenance || item.providerRankingProvenance || {};
            const relPaths = Array.isArray(provenance.typed_memory_rel_paths || provenance.typedMemoryRelPaths) ? (provenance.typed_memory_rel_paths || provenance.typedMemoryRelPaths).slice(0, 2).join(",") : "";
            const rowIds = Array.isArray(provenance.typed_memory_row_ids || provenance.typedMemoryRowIds) ? (provenance.typed_memory_row_ids || provenance.typedMemoryRowIds).slice(0, 2).join(",") : "";
            return `${item.agent_type || item.agentType || "unknown"}(${item.local_health_status || item.localHealthStatus || item.health_status || item.healthStatus || "healthy"}; risk=${item.global_risk_status || item.globalRiskStatus || "empty"}; rank=${item.composite_rank || item.compositeRank || 0}<${item.selected_composite_rank || item.selectedCompositeRank || 0}; execPenalty=${item.local_execution_rank_penalty || item.localExecutionRankPenalty || 0}; execRisk=${item.provider_switch_execution_weighted_risk_score || item.providerSwitchExecutionWeightedRiskScore || 0}; mem=${relPaths || "none"}; rows=${rowIds || "none"}; configured=${item.configured === true})`;
        }).join(", ")}. Current assignment is unchanged.` : "",
    ].filter(Boolean).join("\n");
}
function renderProviderSwitchDecisionReceipt(receipt = {}) {
    if (receipt?.schema !== "ccm-provider-switch-decision-receipt-v1")
        return "";
    const oldProvider = receipt.old_provider || receipt.oldProvider || {};
    const newProvider = receipt.new_provider || receipt.newProvider || {};
    const snapshot = receipt.provider_reliability_snapshot || receipt.providerReliabilitySnapshot || {};
    const authority = receipt.authority || {};
    const compatibility = receipt.task_compatibility || receipt.taskCompatibility || {};
    const rankingProvenance = receipt.provider_ranking_provenance || receipt.providerRankingProvenance || {};
    const requestedProvenance = rankingProvenance.requested_candidate || rankingProvenance.requestedCandidate || newProvider.provider_ranking_provenance || newProvider.providerRankingProvenance || {};
    const rankingRelPaths = Array.isArray(requestedProvenance.typed_memory_rel_paths || requestedProvenance.typedMemoryRelPaths)
        ? (requestedProvenance.typed_memory_rel_paths || requestedProvenance.typedMemoryRelPaths).slice(0, 4)
        : [];
    const rankingRowIds = Array.isArray(requestedProvenance.typed_memory_row_ids || requestedProvenance.typedMemoryRowIds)
        ? (requestedProvenance.typed_memory_row_ids || requestedProvenance.typedMemoryRowIds).slice(0, 4)
        : [];
    return [
        `Provider switch decision receipt: id=${receipt.receipt_id || receipt.receiptId || ""}; status=${receipt.status || "unknown"}; old=${oldProvider.agent_type || oldProvider.agentType || "unknown"}; new=${newProvider.agent_type || newProvider.agentType || "unknown"}; project=${receipt.project || newProvider.project || "unknown"}.`,
        `- Snapshot: id=${snapshot.snapshot_id || snapshot.snapshotId || "missing"}; generation=${snapshot.generation_id || snapshot.generationId || "missing"}; status=${snapshot.status || "missing"}; checksum=${snapshot.snapshot_checksum || snapshot.snapshotChecksum || "missing"}; expires=${snapshot.expires_at || snapshot.expiresAt || "missing"}.`,
        `- Task compatibility: confirmed=${compatibility.confirmed === true}; evidence=${Array.isArray(compatibility.evidence) ? compatibility.evidence.slice(0, 4).join("; ") : "missing"}.`,
        `- Authority: kind=${authority.kind || "missing"}; approved=${authority.approved === true}; localPolicyAuthority=${authority.local_policy_authority === true || authority.localPolicyAuthority === true}.`,
        rankingRelPaths.length || rankingRowIds.length
            ? `- Ranking provenance: memory=${rankingRelPaths.join(",") || "unknown"}; rows=${rankingRowIds.join(",") || "unknown"}; candidateRank=${newProvider.composite_rank || newProvider.compositeRank || 0}; selectedRank=${newProvider.selected_composite_rank || newProvider.selectedCompositeRank || 0}; compactSafe=${rankingProvenance.compact_safe === true || rankingProvenance.compactSafe === true}.`
            : "",
        receipt.valid === true && receipt.status === "approved"
            ? "- This is an approved explicit provider switch. The child session must bind this receipt, and the final CCM_AGENT_RECEIPT must preserve the system-attested executed provider."
            : "- This provider switch is not valid. Do not execute the proposed alternative as an approved switch.",
    ].filter(Boolean).join("\n");
}
function extractProviderRankingCompactRepairReceiptMemoryContract(memory = {}, fallback = null) {
    const candidate = fallback
        || memory?.provider_ranking_compact_repair_receipt_memory_contract
        || memory?.providerRankingCompactRepairReceiptMemoryContract
        || memory?.provider_ranking_compact_repair_receipt_recall
        || memory?.providerRankingCompactRepairReceiptRecall
        || memory?.group_state?.typedMemory?.providerRankingCompactRepairReceiptRecall
        || memory?.group_state?.typed_memory?.provider_ranking_compact_repair_receipt_recall
        || memory?.typedMemory?.providerRankingCompactRepairReceiptRecall
        || null;
    if (!candidate?.schema && !candidate?.docRelPath && !candidate?.doc_rel_path)
        return null;
    const active = candidate.active === true
        || candidate.recalledThisTurn === true
        || candidate.recalled_this_turn === true
        || Number(candidate.archivedCount || candidate.archived_count || 0) > 0;
    const docRelPath = String(candidate.docRelPath || candidate.doc_rel_path || "provider-ranking-provenance-compact-repair-receipt-memory.md").trim();
    const typedMemoryRelPaths = Array.isArray(candidate.typedMemoryRelPaths || candidate.typed_memory_rel_paths)
        ? (candidate.typedMemoryRelPaths || candidate.typed_memory_rel_paths).map((item) => String(item || "").trim()).filter(Boolean).slice(0, 12)
        : [];
    const typedMemoryRowIds = Array.isArray(candidate.typedMemoryRowIds || candidate.typed_memory_row_ids)
        ? (candidate.typedMemoryRowIds || candidate.typed_memory_row_ids).map((item) => String(item || "").trim()).filter(Boolean).slice(0, 12)
        : [];
    const receiptIds = Array.isArray(candidate.receiptIds || candidate.receipt_ids)
        ? (candidate.receiptIds || candidate.receipt_ids).map((item) => String(item || "").trim()).filter(Boolean).slice(0, 8)
        : [];
    const receiptChecksums = Array.isArray(candidate.receiptChecksums || candidate.receipt_checksums)
        ? (candidate.receiptChecksums || candidate.receipt_checksums).map((item) => String(item || "").trim()).filter(Boolean).slice(0, 8)
        : [];
    const targetPaths = (0, runtime_kernel_part_01_part_01_1.uniqueRuntimeStrings)([
        candidate.targetPaths,
        candidate.target_paths,
        candidate.repeatableRelPaths,
        candidate.repeatable_rel_paths,
    ], 24);
    const memoryUsageReceiptDocRelPaths = (0, runtime_kernel_part_01_part_01_1.uniqueRuntimeStrings)([
        candidate.memoryUsageReceiptDocRelPaths,
        candidate.memory_usage_receipt_doc_rel_paths,
    ], 12);
    const memoryUsageReceiptDisciplineRelPaths = (0, runtime_kernel_part_01_part_01_1.uniqueRuntimeStrings)([
        candidate.memoryUsageReceiptDisciplineRelPaths,
        candidate.memory_usage_receipt_discipline_rel_paths,
        targetPaths.filter((item) => item === "provider-ranking-memory-usage-receipt-discipline.md"),
    ], 8);
    if (!active || !docRelPath)
        return null;
    return {
        schema: "ccm-provider-ranking-compact-repair-receipt-memory-usage-contract-v1",
        version: 1,
        active: true,
        source_schema: candidate.schema || "",
        doc_rel_path: docRelPath,
        archived_count: Number(candidate.archivedCount || candidate.archived_count || 0),
        recalled_this_turn: candidate.recalledThisTurn === true || candidate.recalled_this_turn === true,
        required_receipt_fields: ["memoryUsed", "memoryIgnored"],
        allowed_usage_states: ["used", "verified", "ignored", "background"],
        typed_memory_rel_paths: typedMemoryRelPaths,
        typed_memory_row_ids: typedMemoryRowIds,
        receipt_ids: receiptIds,
        receipt_checksums: receiptChecksums,
        memory_usage_receipt_doc_rel_paths: memoryUsageReceiptDocRelPaths,
        memory_usage_receipt_discipline_rel_paths: memoryUsageReceiptDisciplineRelPaths,
        memory_usage_receipt_discipline_required: memoryUsageReceiptDisciplineRelPaths.length > 0,
        memory_receipt_required_doc_rel_paths: (0, runtime_kernel_part_01_part_01_1.uniqueRuntimeStrings)([docRelPath, ...memoryUsageReceiptDisciplineRelPaths], 10),
        authorization_boundary: "provider switch execution history is ranking evidence only, not authorization; every explicit provider switch still requires a fresh valid provider switch decision receipt/checksum/local authority/task compatibility proof",
        memory_used_template: `${docRelPath}; usageState=verified|background; ranking evidence only, not authorization; fresh valid provider switch decision receipt required for any explicit switch`,
        memory_ignored_template: `${docRelPath}; usageState=ignored; reason=<why this recalled memory was not used>; ranking evidence only, not authorization`,
    };
}
function renderProviderRankingCompactRepairReceiptMemoryContract(contract = {}) {
    if (!contract?.schema || contract.active === false)
        return "";
    const relPaths = Array.isArray(contract.typed_memory_rel_paths || contract.typedMemoryRelPaths)
        ? (contract.typed_memory_rel_paths || contract.typedMemoryRelPaths).slice(0, 6)
        : [];
    const rowIds = Array.isArray(contract.typed_memory_row_ids || contract.typedMemoryRowIds)
        ? (contract.typed_memory_row_ids || contract.typedMemoryRowIds).slice(0, 6)
        : [];
    const disciplineRelPaths = (0, runtime_kernel_part_01_part_01_1.uniqueRuntimeStrings)([
        contract.memory_usage_receipt_discipline_rel_paths,
        contract.memoryUsageReceiptDisciplineRelPaths,
    ], 6);
    const requiredReceiptDocRelPaths = (0, runtime_kernel_part_01_part_01_1.uniqueRuntimeStrings)([
        contract.memory_receipt_required_doc_rel_paths,
        contract.memoryReceiptRequiredDocRelPaths,
        contract.doc_rel_path || contract.docRelPath || "provider-ranking-provenance-compact-repair-receipt-memory.md",
    ], 10);
    return [
        `Provider ranking compact repair receipt memory usage contract：doc=${contract.doc_rel_path || contract.docRelPath || "provider-ranking-provenance-compact-repair-receipt-memory.md"}；archived=${contract.archived_count || contract.archivedCount || 0}；recalled=${contract.recalled_this_turn === true || contract.recalledThisTurn === true}.`,
        "- Final CCM_AGENT_RECEIPT.memoryUsed or memoryIgnored must cite this doc relPath and declare used/verified/ignored/background.",
        disciplineRelPaths.length ? `- Receipt discipline typed MEMORY.md surfaced: ${disciplineRelPaths.join(", ")}. Final CCM_AGENT_RECEIPT.memoryUsed or memoryIgnored must also cite surfaced receipt discipline docs with usageState.` : "",
        requiredReceiptDocRelPaths.length ? `- Required receipt doc relPaths: ${requiredReceiptDocRelPaths.join(", ")}.` : "",
        "- Boundary: provider switch execution history is ranking evidence only, not authorization; any explicit provider switch still requires a fresh valid provider switch decision receipt/checksum/local authority/task compatibility proof.",
        relPaths.length || rowIds.length ? `- Compact-safe provenance anchors: relPaths=${relPaths.join(",") || "none"}; rowIds=${rowIds.join(",") || "none"}.` : "",
        contract.memory_used_template ? `- memoryUsed template: ${contract.memory_used_template}` : "",
        contract.memory_ignored_template ? `- memoryIgnored template: ${contract.memory_ignored_template}` : "",
    ].filter(Boolean).join("\n");
}
function extractPostCompactReinjectionRepairReceiptMemoryContract(memory = {}, fallback = null) {
    const candidate = fallback
        || memory?.post_compact_reinjection_repair_receipt_memory_contract
        || memory?.postCompactReinjectionRepairReceiptMemoryContract
        || memory?.post_compact_reinjection_repair_receipt_recall
        || memory?.postCompactReinjectionRepairReceiptRecall
        || memory?.group_state?.typedMemory?.postCompactReinjectionRepairReceiptRecall
        || memory?.group_state?.typed_memory?.post_compact_reinjection_repair_receipt_recall
        || memory?.typedMemory?.postCompactReinjectionRepairReceiptRecall
        || null;
    if (!candidate?.schema && !candidate?.docRelPaths && !candidate?.doc_rel_paths)
        return null;
    const sourceSchema = String(candidate.schema || "");
    const recallSource = sourceSchema === "ccm-post-compact-reinjection-repair-receipt-worker-context-recall-v1";
    const recalledThisTurn = candidate.recalledThisTurn === true || candidate.recalled_this_turn === true;
    const active = candidate.active === true && (!recallSource || recalledThisTurn);
    const docRelPaths = (0, runtime_kernel_part_01_part_01_1.uniqueRuntimeStrings)([
        candidate.surfacedRelPaths,
        candidate.surfaced_rel_paths,
        candidate.docRelPaths,
        candidate.doc_rel_paths,
        candidate.docRelPath,
        candidate.doc_rel_path,
    ], 8);
    if (!active || !docRelPaths.length)
        return null;
    if (sourceSchema === "ccm-post-compact-reinjection-repair-receipt-memory-usage-contract-v1") {
        return {
            ...candidate,
            active: true,
            doc_rel_paths: docRelPaths,
            memory_receipt_required_doc_rel_paths: (0, runtime_kernel_part_01_part_01_1.uniqueRuntimeStrings)([
                candidate.memory_receipt_required_doc_rel_paths,
                candidate.memoryReceiptRequiredDocRelPaths,
                docRelPaths,
            ], 12),
        };
    }
    const rows = Array.isArray(candidate.rows) ? candidate.rows.slice(-12) : [];
    const sessionBinding = memory?.session_binding || memory?.sessionBinding || {};
    const gateIds = (0, runtime_kernel_part_01_part_01_1.uniqueRuntimeStrings)([
        candidate.gateIds,
        candidate.gate_ids,
        rows.map((row) => row.reinjection_gate_id || row.reinjectionGateId),
    ], 16);
    const candidateIds = (0, runtime_kernel_part_01_part_01_1.uniqueRuntimeStrings)([
        candidate.candidateIds,
        candidate.candidate_ids,
        rows.map((row) => row.post_compact_candidate_id || row.postCompactCandidateId),
    ], 16);
    const candidateValues = (0, runtime_kernel_part_01_part_01_1.uniqueRuntimeStrings)([
        candidate.candidateValues,
        candidate.candidate_values,
        rows.map((row) => row.post_compact_candidate_value || row.postCompactCandidateValue),
    ], 16);
    const completionDocRelPaths = (0, runtime_kernel_part_01_part_01_1.uniqueRuntimeStrings)([
        candidate.completionDocRelPaths,
        candidate.completion_doc_rel_paths,
    ], 12);
    const completionWorkItemIds = (0, runtime_kernel_part_01_part_01_1.uniqueRuntimeStrings)([
        candidate.completionWorkItemIds,
        candidate.completion_work_item_ids,
        candidate.preservationRepairWorkItemIds,
        candidate.preservation_repair_work_item_ids,
        rows.filter((row) => ["receipt_memory_usage_repair_completion", "completion_memory_preservation_repair_closure"].includes(row.row_kind)).flatMap((row) => [row.work_item_id, ...(Array.isArray(row.completion_work_item_ids) ? row.completion_work_item_ids : [])]),
    ], 16);
    const completionTimelineBindingIds = (0, runtime_kernel_part_01_part_01_1.uniqueRuntimeStrings)([
        candidate.completionTimelineBindingIds,
        candidate.completion_timeline_binding_ids,
        rows.filter((row) => ["receipt_memory_usage_repair_completion", "completion_memory_preservation_repair_closure"].includes(row.row_kind)).flatMap((row) => [row.timeline_binding_id, ...(Array.isArray(row.completion_timeline_binding_ids) ? row.completion_timeline_binding_ids : [])]),
    ], 16);
    const historicalTaskAgentSessionIds = (0, runtime_kernel_part_01_part_01_1.uniqueRuntimeStrings)([
        candidate.taskAgentSessionIds,
        candidate.task_agent_session_ids,
        candidate.originalTaskAgentSessionIds,
        candidate.original_task_agent_session_ids,
        candidate.repairTaskAgentSessionIds,
        candidate.repair_task_agent_session_ids,
        candidate.preservationHistoricalTaskAgentSessionIds,
        candidate.preservation_historical_task_agent_session_ids,
        rows.flatMap((row) => [row.historical_task_agent_session_id || row.task_agent_session_id, ...(Array.isArray(row.historical_task_agent_session_ids) ? row.historical_task_agent_session_ids : [])]),
    ], 16);
    const historicalNativeSessionIds = (0, runtime_kernel_part_01_part_01_1.uniqueRuntimeStrings)([
        candidate.nativeSessionIds,
        candidate.native_session_ids,
        candidate.originalNativeSessionIds,
        candidate.original_native_session_ids,
        candidate.repairNativeSessionIds,
        candidate.repair_native_session_ids,
        candidate.preservationHistoricalNativeSessionIds,
        candidate.preservation_historical_native_session_ids,
        rows.flatMap((row) => [row.historical_native_session_id || row.native_session_id, ...(Array.isArray(row.historical_native_session_ids) ? row.historical_native_session_ids : [])]),
    ], 16);
    const preservationFailedRetryIds = (0, runtime_kernel_part_01_part_01_1.uniqueRuntimeStrings)([candidate.preservationFailedRetryIds, candidate.preservation_failed_retry_ids, rows.map((row) => row.failed_retry_id)], 16);
    const preservationFailedOutcomeIds = (0, runtime_kernel_part_01_part_01_1.uniqueRuntimeStrings)([candidate.preservationFailedOutcomeIds, candidate.preservation_failed_outcome_ids, rows.map((row) => row.failed_outcome_id)], 16);
    const preservationCorrectedRetryIds = (0, runtime_kernel_part_01_part_01_1.uniqueRuntimeStrings)([candidate.preservationCorrectedRetryIds, candidate.preservation_corrected_retry_ids, rows.map((row) => row.corrected_retry_id)], 16);
    const preservationCorrectedOutcomeIds = (0, runtime_kernel_part_01_part_01_1.uniqueRuntimeStrings)([candidate.preservationCorrectedOutcomeIds, candidate.preservation_corrected_outcome_ids, rows.map((row) => row.corrected_outcome_id)], 16);
    const closureUsageFeedback = candidate.preservationClosureUsageFeedback || candidate.preservation_closure_usage_feedback || {};
    const closureFeedbackConflict = candidate.preservationClosureFeedbackConflict
        || candidate.preservation_closure_feedback_conflict
        || closureUsageFeedback.feedbackConflict
        || closureUsageFeedback.feedback_conflict
        || null;
    const closureConflictResolution = candidate.preservationClosureConflictResolution
        || candidate.preservation_closure_conflict_resolution
        || closureUsageFeedback.feedbackConflictResolution
        || closureUsageFeedback.feedback_conflict_resolution
        || closureFeedbackConflict?.resolution
        || null;
    return {
        schema: "ccm-post-compact-reinjection-repair-receipt-memory-usage-contract-v1",
        version: 1,
        active: true,
        source_schema: sourceSchema,
        recalled_this_turn: recalledThisTurn,
        archived_count: Number(candidate.archivedCount || candidate.archived_count || rows.length || 0),
        doc_rel_paths: docRelPaths,
        memory_receipt_required_doc_rel_paths: docRelPaths,
        required_receipt_fields: ["memoryUsed", "memoryIgnored"],
        allowed_usage_states: ["used", "verified", "ignored"],
        used_current_source_verified_required: true,
        ignored_reason_required: true,
        freshness_boundary: "historical repair completion is recovery evidence, not permanent repository truth; future use must reverify the current source",
        current_session_binding_id: String(sessionBinding.binding_id || sessionBinding.bindingId || ""),
        current_task_agent_session_id: String(sessionBinding.task_agent_session_id || sessionBinding.taskAgentSessionId || ""),
        current_native_session_id: String(sessionBinding.native_session_id || sessionBinding.nativeSessionId || ""),
        reinjection_gate_ids: gateIds,
        post_compact_candidate_ids: candidateIds,
        post_compact_candidate_values: candidateValues,
        corrected_receipt_completion_memory_active: completionWorkItemIds.length > 0,
        corrected_receipt_completion_doc_rel_paths: completionDocRelPaths,
        corrected_receipt_completion_work_item_ids: completionWorkItemIds,
        corrected_receipt_completion_timeline_binding_ids: completionTimelineBindingIds,
        historical_task_agent_session_ids: historicalTaskAgentSessionIds,
        historical_native_session_ids: historicalNativeSessionIds,
        preservation_failed_retry_ids: preservationFailedRetryIds,
        preservation_failed_outcome_ids: preservationFailedOutcomeIds,
        preservation_corrected_retry_ids: preservationCorrectedRetryIds,
        preservation_corrected_outcome_ids: preservationCorrectedOutcomeIds,
        closure_feedback_conflict_active: closureFeedbackConflict?.active === true,
        closure_feedback_arbitration_state: closureFeedbackConflict?.arbitration_state || closureFeedbackConflict?.arbitrationState || "",
        closure_feedback_conflict_ratio: Number(closureFeedbackConflict?.conflict_ratio || closureFeedbackConflict?.conflictRatio || 0),
        closure_feedback_positive_weight: Number(closureFeedbackConflict?.positive?.weighted_evidence || closureFeedbackConflict?.positive?.weightedEvidence || 0),
        closure_feedback_ignored_weight: Number(closureFeedbackConflict?.ignored?.weighted_evidence || closureFeedbackConflict?.ignored?.weightedEvidence || 0),
        closure_feedback_current_session_verification_required: closureFeedbackConflict?.active === true,
        closure_feedback_historical_majority_authorization_allowed: false,
        closure_feedback_task_family_key: closureUsageFeedback?.taskFamily?.key || closureUsageFeedback?.task_family?.key || "",
        closure_feedback_task_family_tokens: (0, runtime_kernel_part_01_part_01_1.uniqueRuntimeStrings)([closureUsageFeedback?.taskFamily?.tokens, closureUsageFeedback?.task_family?.tokens], 40),
        closure_conflict_resolution_active: closureConflictResolution?.active === true,
        closure_conflict_resolution_reopened: closureConflictResolution?.reopened === true,
        closure_conflict_resolution_state: closureConflictResolution?.state || "",
        closure_conflict_resolution_entry_id: closureConflictResolution?.resolution_entry_id || closureConflictResolution?.resolutionEntryId || "",
        closure_conflict_resolution_usage_state: closureConflictResolution?.resolution_usage_state || closureConflictResolution?.resolutionUsageState || "",
        closure_conflict_resolution_task_agent_session_id: closureConflictResolution?.task_agent_session_id || closureConflictResolution?.taskAgentSessionId || "",
        closure_conflict_resolution_native_session_id: closureConflictResolution?.native_session_id || closureConflictResolution?.nativeSessionId || "",
        closure_conflict_resolution_reversible: closureConflictResolution?.reversible === true,
        closure_conflict_resolution_historical_branches_preserved: closureConflictResolution?.historical_branches_preserved === true,
        rows: rows.map((row) => ({
            row_id: row.row_id || "",
            row_kind: row.row_kind || "",
            reinjection_gate_id: row.reinjection_gate_id || "",
            post_compact_candidate_id: row.post_compact_candidate_id || "",
            post_compact_candidate_kind: row.post_compact_candidate_kind || "",
            post_compact_candidate_value: row.post_compact_candidate_value || "",
            usage_state: row.usage_state || "",
            work_item_id: row.work_item_id || "",
            timeline_binding_id: row.timeline_binding_id || "",
            original_worker_context_packet_id: row.original_worker_context_packet_id || "",
            failed_retry_id: row.failed_retry_id || "",
            failed_outcome_id: row.failed_outcome_id || "",
            corrected_retry_id: row.corrected_retry_id || "",
            corrected_outcome_id: row.corrected_outcome_id || "",
            completion_doc_rel_paths: Array.isArray(row.completion_doc_rel_paths) ? row.completion_doc_rel_paths.slice(0, 8) : [],
            completion_work_item_ids: Array.isArray(row.completion_work_item_ids) ? row.completion_work_item_ids.slice(0, 12) : [],
            completion_timeline_binding_ids: Array.isArray(row.completion_timeline_binding_ids) ? row.completion_timeline_binding_ids.slice(0, 12) : [],
            required_doc_rel_paths: Array.isArray(row.required_doc_rel_paths) ? row.required_doc_rel_paths.slice(0, 8) : [],
            coverage_rows: Array.isArray(row.coverage_rows) ? row.coverage_rows.slice(0, 8) : [],
            historical_task_agent_session_id: row.historical_task_agent_session_id || "",
            historical_native_session_id: row.historical_native_session_id || "",
            repair_task_agent_session_id: row.repair_task_agent_session_id || "",
            repair_native_session_id: row.repair_native_session_id || "",
            exact_identity_restored: row.exact_identity_restored === true,
            current_session_boundary_restored: row.current_session_boundary_restored === true,
            historical_sessions_remain_evidence_only: row.historical_sessions_remain_evidence_only === true,
            completion_source: row.completion_source || "",
            resolution_reason: row.resolution_reason || "",
            resolution_entry_id: row.resolution_entry_id || "",
            resolution_usage_state: row.resolution_usage_state || "",
            parent_conflict_fingerprint: row.parent_conflict_fingerprint || "",
            reversible: row.reversible === true,
            historical_branches_preserved: row.historical_branches_preserved === true,
        })),
        memory_used_templates: docRelPaths.map((relPath) => `${relPath}; usageState=verified|used; currentSourceVerified=true; historical repair completion is recovery evidence, not permanent repository truth`),
        memory_ignored_templates: docRelPaths.map((relPath) => `${relPath}; usageState=ignored; reason=<why this recalled repair memory was not used>`),
    };
}
function renderPostCompactReinjectionRepairReceiptMemoryContract(contract = {}) {
    if (!contract?.schema || contract.active === false)
        return "";
    const docRelPaths = (0, runtime_kernel_part_01_part_01_1.uniqueRuntimeStrings)([
        contract.doc_rel_paths,
        contract.docRelPaths,
        contract.memory_receipt_required_doc_rel_paths,
        contract.memoryReceiptRequiredDocRelPaths,
    ], 8);
    const gateIds = (0, runtime_kernel_part_01_part_01_1.uniqueRuntimeStrings)([contract.reinjection_gate_ids, contract.reinjectionGateIds], 8);
    const candidateIds = (0, runtime_kernel_part_01_part_01_1.uniqueRuntimeStrings)([contract.post_compact_candidate_ids, contract.postCompactCandidateIds], 8);
    const completionWorkItemIds = (0, runtime_kernel_part_01_part_01_1.uniqueRuntimeStrings)([contract.corrected_receipt_completion_work_item_ids, contract.correctedReceiptCompletionWorkItemIds], 8);
    const completionTimelineBindingIds = (0, runtime_kernel_part_01_part_01_1.uniqueRuntimeStrings)([contract.corrected_receipt_completion_timeline_binding_ids, contract.correctedReceiptCompletionTimelineBindingIds], 8);
    const historicalTaskSessions = (0, runtime_kernel_part_01_part_01_1.uniqueRuntimeStrings)([contract.historical_task_agent_session_ids, contract.historicalTaskAgentSessionIds], 6);
    const historicalNativeSessions = (0, runtime_kernel_part_01_part_01_1.uniqueRuntimeStrings)([contract.historical_native_session_ids, contract.historicalNativeSessionIds], 6);
    const failedRetryIds = (0, runtime_kernel_part_01_part_01_1.uniqueRuntimeStrings)([contract.preservation_failed_retry_ids, contract.preservationFailedRetryIds], 6);
    const failedOutcomeIds = (0, runtime_kernel_part_01_part_01_1.uniqueRuntimeStrings)([contract.preservation_failed_outcome_ids, contract.preservationFailedOutcomeIds], 6);
    const correctedRetryIds = (0, runtime_kernel_part_01_part_01_1.uniqueRuntimeStrings)([contract.preservation_corrected_retry_ids, contract.preservationCorrectedRetryIds], 6);
    const correctedOutcomeIds = (0, runtime_kernel_part_01_part_01_1.uniqueRuntimeStrings)([contract.preservation_corrected_outcome_ids, contract.preservationCorrectedOutcomeIds], 6);
    return [
        `Post-compact reinjection repair receipt memory usage contract：docs=${docRelPaths.join(",") || "none"}；archived=${contract.archived_count || contract.archivedCount || 0}；recalled=${contract.recalled_this_turn === true || contract.recalledThisTurn === true}.`,
        "- Final CCM_AGENT_RECEIPT.memoryUsed or memoryIgnored must cite every surfaced receipt MEMORY.md.",
        "- memoryUsed with usageState=used/verified requires currentSourceVerified=true in this new child Agent session.",
        "- memoryIgnored with usageState=ignored requires an explicit reason.",
        "- Freshness boundary: historical repair completion is recovery evidence, not permanent repository truth; future use must reverify the current source.",
        contract.current_session_binding_id ? `- Current child session binding: ${contract.current_session_binding_id}; task_agent_session=${contract.current_task_agent_session_id || ""}; native_session=${contract.current_native_session_id || ""}.` : "",
        gateIds.length || candidateIds.length ? `- Historical repair identities: gates=${gateIds.join(",") || "none"}; candidates=${candidateIds.join(",") || "none"}.` : "",
        completionWorkItemIds.length || completionTimelineBindingIds.length ? `- Corrected-receipt completion identities: work_items=${completionWorkItemIds.join(",") || "none"}; timelines=${completionTimelineBindingIds.join(",") || "none"}.` : "",
        historicalTaskSessions.length || historicalNativeSessions.length ? `- Historical sessions are evidence only: task_agent_sessions=${historicalTaskSessions.join(",") || "none"}; native_sessions=${historicalNativeSessions.join(",") || "none"}.` : "",
        failedRetryIds.length || correctedRetryIds.length ? `- Completion-memory preservation repair retries: failed=${failedRetryIds.join(",") || "none"}; corrected=${correctedRetryIds.join(",") || "none"}.` : "",
        failedOutcomeIds.length || correctedOutcomeIds.length ? `- Completion-memory preservation repair outcomes: failed=${failedOutcomeIds.join(",") || "none"}; corrected=${correctedOutcomeIds.join(",") || "none"}; corrected history remains recovery evidence only.` : "",
        contract.closure_feedback_conflict_active === true
            ? `- Closure feedback conflict: state=${contract.closure_feedback_arbitration_state || "contradictory_reverify_current_session"}; positive_weight=${contract.closure_feedback_positive_weight || 0}; ignored_weight=${contract.closure_feedback_ignored_weight || 0}; ratio=${contract.closure_feedback_conflict_ratio || 0}. Historical majority cannot authorize promotion or suppression; this current child session must re-read current source and independently return memoryUsed or memoryIgnored.`
            : "",
        contract.closure_conflict_resolution_active === true
            ? `- Closure conflict resolution history: state=${contract.closure_conflict_resolution_state || "resolved"}; usageState=${contract.closure_conflict_resolution_usage_state || ""}; resolution_entry=${contract.closure_conflict_resolution_entry_id || ""}; historical task/native session=${contract.closure_conflict_resolution_task_agent_session_id || ""}/${contract.closure_conflict_resolution_native_session_id || ""}. This resolution is reversible ranking evidence only; reverify current source in this new session and preserve both historical conflict branches.`
            : "",
        contract.corrected_receipt_completion_memory_active === true ? "- Historical original/repair sessions never authorize this child Agent session; bind the new memoryUsed/memoryIgnored decision to the current task/native session." : "",
        ...(Array.isArray(contract.memory_used_templates) ? contract.memory_used_templates.slice(0, 4).map((item) => `- memoryUsed template: ${item}`) : []),
        ...(Array.isArray(contract.memory_ignored_templates) ? contract.memory_ignored_templates.slice(0, 4).map((item) => `- memoryIgnored template: ${item}`) : []),
    ].filter(Boolean).join("\n");
}
//# sourceMappingURL=runtime-kernel-part-01-part-02.js.map