"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.API_MICROCOMPACT_NATIVE_PROOF_REPAIR_SOURCES_FOR_COORDINATOR = exports.REPLAY_REPAIR_TIMELINE_REQUIRED_EVENTS_FOR_COORDINATOR = void 0;
exports.buildPressureProvenanceProviderDispatchAdvisoryForCoordinator = buildPressureProvenanceProviderDispatchAdvisoryForCoordinator;
exports.providerSwitchDecisionReceiptComparableForCoordinator = providerSwitchDecisionReceiptComparableForCoordinator;
exports.providerSwitchDecisionReceiptChecksumForCoordinator = providerSwitchDecisionReceiptChecksumForCoordinator;
exports.normalizeProviderSwitchAuthorityForCoordinator = normalizeProviderSwitchAuthorityForCoordinator;
exports.normalizeProviderSwitchRequestForCoordinator = normalizeProviderSwitchRequestForCoordinator;
exports.providerSwitchRequestForAssignmentForCoordinator = providerSwitchRequestForAssignmentForCoordinator;
exports.validateProviderSwitchDecisionReceiptForCoordinator = validateProviderSwitchDecisionReceiptForCoordinator;
exports.buildProviderSwitchDecisionReceiptForCoordinator = buildProviderSwitchDecisionReceiptForCoordinator;
exports.providerRankingProvenanceListForCoordinator = providerRankingProvenanceListForCoordinator;
exports.providerRankingProvenancePacketSummaryForCoordinator = providerRankingProvenancePacketSummaryForCoordinator;
exports.buildProviderRankingProvenancePreservationForCoordinator = buildProviderRankingProvenancePreservationForCoordinator;
exports.normalizeProviderRankingProvenancePreservationForCoordinator = normalizeProviderRankingProvenancePreservationForCoordinator;
exports.postCompactReceiptMemoryUsageRepairCompletionPacketSummaryForCoordinator = postCompactReceiptMemoryUsageRepairCompletionPacketSummaryForCoordinator;
exports.buildPostCompactReceiptMemoryUsageRepairCompletionPreservationForCoordinator = buildPostCompactReceiptMemoryUsageRepairCompletionPreservationForCoordinator;
exports.normalizePostCompactReceiptMemoryUsageRepairCompletionPreservationForCoordinator = normalizePostCompactReceiptMemoryUsageRepairCompletionPreservationForCoordinator;
exports.maybeRetryWorkerContextPacketCompactionForCoordinator = maybeRetryWorkerContextPacketCompactionForCoordinator;
exports.rawProviderDispatchOverrideForCoordinator = rawProviderDispatchOverrideForCoordinator;
exports.normalizeProviderDispatchOverrideReceiptForCoordinator = normalizeProviderDispatchOverrideReceiptForCoordinator;
exports.buildWorkerContextPreDispatchGateForCoordinator = buildWorkerContextPreDispatchGateForCoordinator;
exports.buildWorkerContextProviderDispatchDecisionForCoordinator = buildWorkerContextProviderDispatchDecisionForCoordinator;
exports.summarizeWorkerContextPacketTypedMemoryPressureRecallForCoordinator = summarizeWorkerContextPacketTypedMemoryPressureRecallForCoordinator;
exports.readReplayRepairDispatchPlanLedgerForCoordinator = readReplayRepairDispatchPlanLedgerForCoordinator;
exports.readReplayRepairDispatchBindingLedgerForCoordinator = readReplayRepairDispatchBindingLedgerForCoordinator;
exports.recordWorkerContextPacketAssignmentBindingForCoordinator = recordWorkerContextPacketAssignmentBindingForCoordinator;
exports.providerSwitchBindingLedgerCountersForCoordinator = providerSwitchBindingLedgerCountersForCoordinator;
exports.findWorkerContextBindingIndexForCoordinator = findWorkerContextBindingIndexForCoordinator;
exports.recordWorkerContextProviderSwitchSessionBindingForCoordinator = recordWorkerContextProviderSwitchSessionBindingForCoordinator;
exports.recordWorkerContextProviderSwitchExecutionReceiptForCoordinator = recordWorkerContextProviderSwitchExecutionReceiptForCoordinator;
exports.recordWorkerContextProviderDispatchOverrideCompletionForCoordinator = recordWorkerContextProviderDispatchOverrideCompletionForCoordinator;
exports.readReplayRepairDispatchTimelineBindingLedgerForCoordinator = readReplayRepairDispatchTimelineBindingLedgerForCoordinator;
exports.uniqueCoordinatorStrings = uniqueCoordinatorStrings;
exports.replayRepairWorkItemStatusForCoordinator = replayRepairWorkItemStatusForCoordinator;
exports.replayRepairWorkItemOpenForCoordinator = replayRepairWorkItemOpenForCoordinator;
exports.isApiMicrocompactNativeProofRepairSourceForCoordinator = isApiMicrocompactNativeProofRepairSourceForCoordinator;
exports.isTimelineClosableNativeRepairSourceForCoordinator = isTimelineClosableNativeRepairSourceForCoordinator;
exports.isProviderRankingProvenanceCompactRepairSourceForCoordinator = isProviderRankingProvenanceCompactRepairSourceForCoordinator;
exports.isPostCompactReinjectionRepairForCoordinator = isPostCompactReinjectionRepairForCoordinator;
exports.replayRepairWorkItemStatsForCoordinator = replayRepairWorkItemStatsForCoordinator;
exports.readReplayRepairWorkItemLedgerForCoordinator = readReplayRepairWorkItemLedgerForCoordinator;
exports.writeReplayRepairWorkItemLedgerForCoordinator = writeReplayRepairWorkItemLedgerForCoordinator;
exports.providerDispatchOverrideFollowupWorkItemIdForCoordinator = providerDispatchOverrideFollowupWorkItemIdForCoordinator;
exports.syncProviderDispatchOverrideFollowupRepairWorkItemForCoordinator = syncProviderDispatchOverrideFollowupRepairWorkItemForCoordinator;
exports.pressureProvenanceUsageRowsFromReceiptForCoordinator = pressureProvenanceUsageRowsFromReceiptForCoordinator;
exports.buildProviderDispatchOverrideCompletionForCoordinator = buildProviderDispatchOverrideCompletionForCoordinator;
exports.providerOverrideFollowupContractStringListForCoordinator = providerOverrideFollowupContractStringListForCoordinator;
exports.providerOverrideFollowupContractReceiptRowValueForCoordinator = providerOverrideFollowupContractReceiptRowValueForCoordinator;
exports.providerOverrideFollowupContractReceiptRowReverifiedForCoordinator = providerOverrideFollowupContractReceiptRowReverifiedForCoordinator;
exports.providerOverrideFollowupContractReceiptRowMatchesForCoordinator = providerOverrideFollowupContractReceiptRowMatchesForCoordinator;
const group_memory_index_1 = require("./group-memory-index");
const group_orchestrator_prompts_1 = require("./group-orchestrator-prompts");
const group_orchestrator_coded_part_01_1 = require("./group-orchestrator-coded-part-01");
const group_orchestrator_coded_part_02_1 = require("./group-orchestrator-coded-part-02");
function buildPressureProvenanceProviderDispatchAdvisoryForCoordinator(groupId, project, agentType, policy = null, options = {}) {
    if (!groupId || !project || !agentType || !policy?.schema)
        return null;
    const rows = Array.isArray(policy.policyRows || policy.policy_rows)
        ? (policy.policyRows || policy.policy_rows)
        : [];
    const targetKey = `${String(agentType || "unknown").toLowerCase()}|${String(project || "unknown").toLowerCase()}`;
    const row = rows.find((item) => `${String(item.agent_type || item.agentType || "unknown").toLowerCase()}|${String(item.project || "unknown").toLowerCase()}` === targetKey)
        || rows[0]
        || {};
    const hasEvidence = policy.active === true
        || row.recovered === true
        || Number(row.violation_count || row.violationCount || 0) > 0
        || Number(row.effective_violation_count || row.effectiveViolationCount || 0) > 0
        || Number(row.provider_override_followup_receipt_validation_attempt_count || row.providerOverrideFollowupReceiptValidationAttemptCount || 0) > 0
        || Number(row.provider_switch_execution_executed_count || row.providerSwitchExecutionExecutedCount || 0) > 0
        || Number(row.provider_switch_execution_mismatch_count || row.providerSwitchExecutionMismatchCount || 0) > 0
        || row.cross_group_provider_reliability_actionable === true
        || row.crossGroupProviderReliabilityActionable === true;
    if (!hasEvidence)
        return null;
    const healthStatus = (0, group_orchestrator_coded_part_02_1.pressureProvenanceProviderHealthForCoordinator)(policy, row);
    const dispatchPolicy = (0, group_orchestrator_coded_part_02_1.pressureProvenanceProviderDispatchPolicyForCoordinator)(healthStatus);
    const holdDisabled = options.disablePressureProvenanceProviderDispatchHold === true
        || options.disable_pressure_provenance_provider_dispatch_hold === true
        || options.disableProviderDispatchHold === true
        || options.disable_provider_dispatch_hold === true;
    const shouldHoldDispatch = dispatchPolicy === "hold_until_repair" && !holdDisabled;
    const configuredCandidates = (0, group_orchestrator_coded_part_02_1.providerReliabilityConfiguredCandidatesForCoordinator)(project, agentType, options);
    const snapshotEnabled = configuredCandidates.length > 0
        || options.enableProviderReliabilitySnapshot === true
        || options.enable_provider_reliability_snapshot === true;
    const snapshotRead = snapshotEnabled
        ? (0, group_memory_index_1.getOrRefreshGlobalProviderDispatchReliabilitySnapshot)({
            snapshotFile: options.providerReliabilitySnapshotFile || options.provider_reliability_snapshot_file,
            ttlMs: options.providerReliabilitySnapshotTtlMs || options.provider_reliability_snapshot_ttl_ms,
            crossGroupProviderReliabilityGroupIds: options.crossGroupProviderReliabilityGroupIds || options.cross_group_provider_reliability_group_ids,
            minSourceGroups: options.crossGroupProviderReliabilityMinSourceGroups || options.cross_group_provider_reliability_min_source_groups || options.minSourceGroups || options.min_source_groups,
            providerReliabilityHalfLifeDays: options.providerReliabilityHalfLifeDays || options.provider_reliability_half_life_days,
            providerOverrideFollowupReceiptValidationFailureThreshold: options.providerOverrideFollowupReceiptValidationFailureThreshold || options.provider_override_followup_receipt_validation_failure_threshold,
            nowMs: options.providerReliabilitySnapshotNowMs || options.provider_reliability_snapshot_now_ms,
            generatedAt: options.generatedAt || options.generated_at,
        })
        : null;
    const selectedGlobalSignal = (0, group_orchestrator_coded_part_02_1.providerReliabilitySignalForAgentForCoordinator)(snapshotRead, agentType);
    const selectedExecutionRankPenalty = (0, group_orchestrator_coded_part_02_1.providerSwitchExecutionRankPenaltyForCoordinator)(row);
    const selectedCompositeRank = (0, group_orchestrator_coded_part_02_1.providerReliabilityHealthRankForCoordinator)(healthStatus) * 10
        + (0, group_orchestrator_coded_part_02_1.providerReliabilityRiskRankForCoordinator)(selectedGlobalSignal?.risk_status || row.cross_group_provider_reliability_risk_status || "empty")
        + selectedExecutionRankPenalty;
    const rankedProviderCandidates = configuredCandidates.map((candidate) => {
        const candidatePolicy = (0, group_memory_index_1.buildPressureProvenancePreDispatchComplianceDispatchPolicy)(groupId, {
            ...options,
            targetProject: project,
            agentType: candidate.agent_type,
        });
        const candidateRows = Array.isArray(candidatePolicy.policyRows || candidatePolicy.policy_rows)
            ? (candidatePolicy.policyRows || candidatePolicy.policy_rows)
            : [];
        const candidateRow = candidateRows.find((item) => String(item.agent_type || item.agentType || "").trim().toLowerCase() === String(candidate.agent_type || "").trim().toLowerCase()
            && String(item.project || "").trim().toLowerCase() === String(project || "").trim().toLowerCase()) || candidateRows[0] || {};
        const candidateHealth = (0, group_orchestrator_coded_part_02_1.pressureProvenanceProviderHealthForCoordinator)(candidatePolicy, candidateRow);
        const candidateDispatchPolicy = (0, group_orchestrator_coded_part_02_1.pressureProvenanceProviderDispatchPolicyForCoordinator)(candidateHealth);
        const candidateSignal = (0, group_orchestrator_coded_part_02_1.providerReliabilitySignalForAgentForCoordinator)(snapshotRead, candidate.agent_type);
        const candidateExecutionRankPenalty = (0, group_orchestrator_coded_part_02_1.providerSwitchExecutionRankPenaltyForCoordinator)(candidateRow);
        const compositeRank = (0, group_orchestrator_coded_part_02_1.providerReliabilityHealthRankForCoordinator)(candidateHealth) * 10
            + (0, group_orchestrator_coded_part_02_1.providerReliabilityRiskRankForCoordinator)(candidateSignal?.risk_status || candidateRow.cross_group_provider_reliability_risk_status || "empty")
            + candidateExecutionRankPenalty;
        return {
            schema: "ccm-provider-dispatch-safer-alternative-v1",
            agent_type: candidate.agent_type,
            project,
            configured: true,
            source: candidate.source,
            local_health_status: candidateHealth,
            local_dispatch_policy: candidateDispatchPolicy,
            local_policy_active: candidatePolicy.active === true,
            global_risk_status: candidateSignal?.risk_status || "empty",
            global_risk_score: Number(candidateSignal?.risk_score || 0),
            global_confidence: Number(candidateSignal?.confidence || 0),
            global_source_group_count: Number(candidateSignal?.source_group_count || 0),
            local_execution_rank_penalty: candidateExecutionRankPenalty,
            selected_local_execution_rank_penalty: selectedExecutionRankPenalty,
            provider_switch_execution_executed_count: Number(candidateRow.provider_switch_execution_executed_count || candidateRow.providerSwitchExecutionExecutedCount || 0),
            provider_switch_execution_passed_count: Number(candidateRow.provider_switch_execution_passed_count || candidateRow.providerSwitchExecutionPassedCount || 0),
            provider_switch_execution_failed_count: Number(candidateRow.provider_switch_execution_failed_count || candidateRow.providerSwitchExecutionFailedCount || 0),
            provider_switch_execution_mismatch_count: Number(candidateRow.provider_switch_execution_mismatch_count || candidateRow.providerSwitchExecutionMismatchCount || 0),
            provider_switch_execution_decayed_mismatch_score: Number(candidateRow.provider_switch_execution_decayed_mismatch_score || candidateRow.providerSwitchExecutionDecayedMismatchScore || 0),
            provider_switch_execution_decayed_failed_score: Number(candidateRow.provider_switch_execution_decayed_failed_score || candidateRow.providerSwitchExecutionDecayedFailedScore || 0),
            provider_switch_execution_decayed_passed_score: Number(candidateRow.provider_switch_execution_decayed_passed_score || candidateRow.providerSwitchExecutionDecayedPassedScore || 0),
            provider_switch_execution_weighted_risk_score: Number(candidateRow.provider_switch_execution_weighted_risk_score || candidateRow.providerSwitchExecutionWeightedRiskScore || 0),
            provider_switch_execution_risk_score: Number(candidateRow.provider_switch_execution_risk_score || candidateRow.providerSwitchExecutionRiskScore || 0),
            provider_switch_execution_risk_confidence: Number(candidateRow.provider_switch_execution_risk_confidence || candidateRow.providerSwitchExecutionRiskConfidence || 0),
            provider_switch_execution_row_ids: Array.isArray(candidateRow.provider_switch_execution_row_ids || candidateRow.providerSwitchExecutionRowIds) ? (candidateRow.provider_switch_execution_row_ids || candidateRow.providerSwitchExecutionRowIds).slice(0, 12) : [],
            provider_switch_execution_memory_rel_paths: Array.isArray(candidateRow.provider_switch_execution_memory_rel_paths || candidateRow.providerSwitchExecutionMemoryRelPaths) ? (candidateRow.provider_switch_execution_memory_rel_paths || candidateRow.providerSwitchExecutionMemoryRelPaths).slice(0, 8) : [],
            composite_rank: compositeRank,
            selected_composite_rank: selectedCompositeRank,
            provider_ranking_provenance: (0, group_orchestrator_coded_part_02_1.providerSwitchExecutionRankingProvenanceForCoordinator)({
                ...candidateRow,
                local_execution_rank_penalty: candidateExecutionRankPenalty,
                composite_rank: compositeRank,
                selected_composite_rank: selectedCompositeRank,
            }, "candidate"),
            safer_than_selected: compositeRank < selectedCompositeRank
                && !["critical", "warning"].includes(candidateHealth)
                && candidateDispatchPolicy !== "hold_until_repair",
            snapshot_id: snapshotRead?.snapshot?.snapshot_id || "",
            snapshot_checksum: snapshotRead?.snapshot?.snapshot_checksum || "",
            snapshot_status: snapshotRead?.status || "",
        };
    })
        .sort((a, b) => Number(a.composite_rank || 0) - Number(b.composite_rank || 0) || String(a.agent_type || "").localeCompare(String(b.agent_type || "")));
    const saferAlternatives = rankedProviderCandidates
        .filter((candidate) => candidate.safer_than_selected)
        .slice(0, 6);
    const selected = {
        schema: "ccm-pressure-provenance-feedback-provider-dispatch-selected-candidate-v1",
        groupId,
        project,
        agent_type: agentType,
        health_status: healthStatus,
        dispatch_policy: dispatchPolicy,
        dispatch_recommendation: shouldHoldDispatch
            ? "hold_child_dispatch_until_pressure_provenance_repair"
            : healthStatus === "warning"
                ? "strict_receipt_review_or_repair_before_ordinary_dispatch"
                : healthStatus === "monitor"
                    ? "allow_dispatch_with_receipt_sampling"
                    : "allow_dispatch_with_pressure_provenance_monitoring",
        policy_action: policy.action || "",
        policy_severity: policy.severity || "",
        relapsed: row.relapsed === true,
        recovered: row.recovered === true,
        violation_count: Number(row.violation_count || row.violationCount || 0),
        effective_violation_count: Number(row.effective_violation_count || row.effectiveViolationCount || row.violation_count || 0),
        recovery_credit: Number(row.recovery_credit || row.recoveryCredit || 0),
        post_recovery_violation_count: Number(row.post_recovery_violation_count || row.postRecoveryViolationCount || 0),
        recovery_last_compliant_at: row.recovery_last_compliant_at || row.recoveryLastCompliantAt || "",
        recovery_streak_broken_at: row.recovery_streak_broken_at || row.recoveryStreakBrokenAt || "",
        current_open_repair_item_ids: [...new Set([
                ...(Array.isArray(row.repair_work_item_ids || row.repairWorkItemIds) ? (row.repair_work_item_ids || row.repairWorkItemIds) : []),
                ...(Array.isArray(row.provider_override_followup_receipt_validation_repair_work_item_ids || row.providerOverrideFollowupReceiptValidationRepairWorkItemIds)
                    ? (row.provider_override_followup_receipt_validation_repair_work_item_ids || row.providerOverrideFollowupReceiptValidationRepairWorkItemIds)
                    : []),
            ])].slice(0, 8),
        provider_override_followup_repaired: row.provider_override_followup_repaired === true || row.providerOverrideFollowupRepaired === true,
        provider_override_followup_only: row.provider_override_followup_only === true || row.providerOverrideFollowupOnly === true,
        provider_override_followup_repaired_count: Number(row.provider_override_followup_repaired_count || row.providerOverrideFollowupRepairedCount || 0),
        provider_override_followup_memory_provenance_usage_count: Number(row.provider_override_followup_memory_provenance_usage_count || row.providerOverrideFollowupMemoryProvenanceUsageCount || 0),
        provider_override_followup_current_source_verified_count: Number(row.provider_override_followup_current_source_verified_count || row.providerOverrideFollowupCurrentSourceVerifiedCount || 0),
        provider_override_followup_last_completed_at: row.provider_override_followup_last_completed_at || row.providerOverrideFollowupLastCompletedAt || "",
        provider_override_followup_fresh_after_last_violation: row.provider_override_followup_fresh_after_last_violation === true || row.providerOverrideFollowupFreshAfterLastViolation === true,
        provider_override_followup_rel_paths: Array.isArray(row.provider_override_followup_rel_paths || row.providerOverrideFollowupRelPaths) ? (row.provider_override_followup_rel_paths || row.providerOverrideFollowupRelPaths).slice(0, 8) : [],
        provider_override_followup_work_item_ids: Array.isArray(row.provider_override_followup_work_item_ids || row.providerOverrideFollowupWorkItemIds) ? (row.provider_override_followup_work_item_ids || row.providerOverrideFollowupWorkItemIds).slice(0, 8) : [],
        provider_override_followup_override_ids: Array.isArray(row.provider_override_followup_override_ids || row.providerOverrideFollowupOverrideIds) ? (row.provider_override_followup_override_ids || row.providerOverrideFollowupOverrideIds).slice(0, 8) : [],
        provider_override_followup_receipt_validation_attempt_count: Number(row.provider_override_followup_receipt_validation_attempt_count || row.providerOverrideFollowupReceiptValidationAttemptCount || 0),
        provider_override_followup_receipt_validation_failed_count: Number(row.provider_override_followup_receipt_validation_failed_count || row.providerOverrideFollowupReceiptValidationFailedCount || 0),
        provider_override_followup_receipt_validation_passed_count: Number(row.provider_override_followup_receipt_validation_passed_count || row.providerOverrideFollowupReceiptValidationPassedCount || 0),
        provider_override_followup_receipt_validation_consecutive_failure_count: Number(row.provider_override_followup_receipt_validation_consecutive_failure_count || row.providerOverrideFollowupReceiptValidationConsecutiveFailureCount || 0),
        provider_override_followup_receipt_validation_latest_status: row.provider_override_followup_receipt_validation_latest_status || row.providerOverrideFollowupReceiptValidationLatestStatus || "",
        provider_override_followup_receipt_validation_escalated: row.provider_override_followup_receipt_validation_escalated === true || row.providerOverrideFollowupReceiptValidationEscalated === true,
        provider_override_followup_receipt_validation_repair_verified: row.provider_override_followup_receipt_validation_repair_verified === true || row.providerOverrideFollowupReceiptValidationRepairVerified === true,
        provider_override_followup_receipt_validation_last_failed_at: row.provider_override_followup_receipt_validation_last_failed_at || row.providerOverrideFollowupReceiptValidationLastFailedAt || "",
        provider_override_followup_receipt_validation_last_passed_at: row.provider_override_followup_receipt_validation_last_passed_at || row.providerOverrideFollowupReceiptValidationLastPassedAt || "",
        provider_override_followup_receipt_validation_ids: Array.isArray(row.provider_override_followup_receipt_validation_ids || row.providerOverrideFollowupReceiptValidationIds) ? (row.provider_override_followup_receipt_validation_ids || row.providerOverrideFollowupReceiptValidationIds).slice(0, 8) : [],
        provider_override_followup_receipt_validation_repair_work_item_ids: Array.isArray(row.provider_override_followup_receipt_validation_repair_work_item_ids || row.providerOverrideFollowupReceiptValidationRepairWorkItemIds) ? (row.provider_override_followup_receipt_validation_repair_work_item_ids || row.providerOverrideFollowupReceiptValidationRepairWorkItemIds).slice(0, 8) : [],
        provider_override_followup_receipt_validation_gap_codes: Array.isArray(row.provider_override_followup_receipt_validation_gap_codes || row.providerOverrideFollowupReceiptValidationGapCodes) ? (row.provider_override_followup_receipt_validation_gap_codes || row.providerOverrideFollowupReceiptValidationGapCodes).slice(0, 8) : [],
        provider_override_followup_receipt_validation_decayed_failure_score: Number(row.provider_override_followup_receipt_validation_decayed_failure_score || row.providerOverrideFollowupReceiptValidationDecayedFailureScore || 0),
        provider_override_followup_receipt_validation_decayed_passed_score: Number(row.provider_override_followup_receipt_validation_decayed_passed_score || row.providerOverrideFollowupReceiptValidationDecayedPassedScore || 0),
        provider_override_followup_receipt_validation_risk_score: Number(row.provider_override_followup_receipt_validation_risk_score || row.providerOverrideFollowupReceiptValidationRiskScore || 0),
        provider_override_followup_receipt_validation_risk_confidence: Number(row.provider_override_followup_receipt_validation_risk_confidence || row.providerOverrideFollowupReceiptValidationRiskConfidence || 0),
        provider_switch_execution_history_present: row.provider_switch_execution_history_present === true || row.providerSwitchExecutionHistoryPresent === true,
        provider_switch_execution_executed_count: Number(row.provider_switch_execution_executed_count || row.providerSwitchExecutionExecutedCount || 0),
        provider_switch_execution_approved_count: Number(row.provider_switch_execution_approved_count || row.providerSwitchExecutionApprovedCount || 0),
        provider_switch_execution_passed_count: Number(row.provider_switch_execution_passed_count || row.providerSwitchExecutionPassedCount || 0),
        provider_switch_execution_failed_count: Number(row.provider_switch_execution_failed_count || row.providerSwitchExecutionFailedCount || 0),
        provider_switch_execution_mismatch_count: Number(row.provider_switch_execution_mismatch_count || row.providerSwitchExecutionMismatchCount || 0),
        provider_switch_execution_mismatch_escalated: row.provider_switch_execution_mismatch_escalated === true || row.providerSwitchExecutionMismatchEscalated === true,
        provider_switch_execution_mismatch_threshold: Number(row.provider_switch_execution_mismatch_threshold || row.providerSwitchExecutionMismatchThreshold || 0),
        provider_switch_execution_expected_provider: row.provider_switch_execution_expected_provider || row.providerSwitchExecutionExpectedProvider || "",
        provider_switch_execution_actual_providers: Array.isArray(row.provider_switch_execution_actual_providers || row.providerSwitchExecutionActualProviders) ? (row.provider_switch_execution_actual_providers || row.providerSwitchExecutionActualProviders).slice(0, 8) : [],
        provider_switch_execution_last_executed_at: row.provider_switch_execution_last_executed_at || row.providerSwitchExecutionLastExecutedAt || "",
        provider_switch_execution_last_failed_at: row.provider_switch_execution_last_failed_at || row.providerSwitchExecutionLastFailedAt || "",
        provider_switch_execution_last_passed_at: row.provider_switch_execution_last_passed_at || row.providerSwitchExecutionLastPassedAt || "",
        provider_switch_execution_receipt_ids: Array.isArray(row.provider_switch_execution_receipt_ids || row.providerSwitchExecutionReceiptIds) ? (row.provider_switch_execution_receipt_ids || row.providerSwitchExecutionReceiptIds).slice(0, 8) : [],
        provider_switch_execution_decision_receipt_ids: Array.isArray(row.provider_switch_execution_decision_receipt_ids || row.providerSwitchExecutionDecisionReceiptIds) ? (row.provider_switch_execution_decision_receipt_ids || row.providerSwitchExecutionDecisionReceiptIds).slice(0, 8) : [],
        provider_switch_execution_gap_codes: Array.isArray(row.provider_switch_execution_gap_codes || row.providerSwitchExecutionGapCodes) ? (row.provider_switch_execution_gap_codes || row.providerSwitchExecutionGapCodes).slice(0, 8) : [],
        provider_switch_execution_decayed_mismatch_score: Number(row.provider_switch_execution_decayed_mismatch_score || row.providerSwitchExecutionDecayedMismatchScore || 0),
        provider_switch_execution_decayed_failed_score: Number(row.provider_switch_execution_decayed_failed_score || row.providerSwitchExecutionDecayedFailedScore || 0),
        provider_switch_execution_decayed_passed_score: Number(row.provider_switch_execution_decayed_passed_score || row.providerSwitchExecutionDecayedPassedScore || 0),
        provider_switch_execution_weighted_risk_score: Number(row.provider_switch_execution_weighted_risk_score || row.providerSwitchExecutionWeightedRiskScore || 0),
        provider_switch_execution_risk_score: Number(row.provider_switch_execution_risk_score || row.providerSwitchExecutionRiskScore || 0),
        provider_switch_execution_risk_confidence: Number(row.provider_switch_execution_risk_confidence || row.providerSwitchExecutionRiskConfidence || 0),
        provider_switch_execution_half_life_days: Number(row.provider_switch_execution_half_life_days || row.providerSwitchExecutionHalfLifeDays || 0),
        provider_switch_execution_row_ids: Array.isArray(row.provider_switch_execution_row_ids || row.providerSwitchExecutionRowIds) ? (row.provider_switch_execution_row_ids || row.providerSwitchExecutionRowIds).slice(0, 12) : [],
        provider_switch_execution_memory_rel_paths: Array.isArray(row.provider_switch_execution_memory_rel_paths || row.providerSwitchExecutionMemoryRelPaths) ? (row.provider_switch_execution_memory_rel_paths || row.providerSwitchExecutionMemoryRelPaths).slice(0, 8) : [],
        local_execution_rank_penalty: selectedExecutionRankPenalty,
        composite_rank: selectedCompositeRank,
        provider_ranking_provenance: (0, group_orchestrator_coded_part_02_1.providerSwitchExecutionRankingProvenanceForCoordinator)({
            ...row,
            local_execution_rank_penalty: selectedExecutionRankPenalty,
            composite_rank: selectedCompositeRank,
            selected_composite_rank: selectedCompositeRank,
        }, "selected"),
        cross_group_provider_reliability_guidance: row.cross_group_provider_reliability_guidance || row.crossGroupProviderReliabilityGuidance || null,
        cross_group_provider_reliability_actionable: row.cross_group_provider_reliability_actionable === true || row.crossGroupProviderReliabilityActionable === true,
        cross_group_provider_reliability_risk_status: row.cross_group_provider_reliability_risk_status || row.crossGroupProviderReliabilityRiskStatus || "empty",
        cross_group_provider_reliability_risk_score: Number(row.cross_group_provider_reliability_risk_score || row.crossGroupProviderReliabilityRiskScore || 0),
        cross_group_provider_reliability_confidence: Number(row.cross_group_provider_reliability_confidence || row.crossGroupProviderReliabilityConfidence || 0),
        cross_group_provider_reliability_source_group_count: Number(row.cross_group_provider_reliability_source_group_count || row.crossGroupProviderReliabilitySourceGroupCount || 0),
        ...(snapshotRead?.snapshot ? {
            provider_reliability_snapshot_id: snapshotRead.snapshot.snapshot_id || "",
            provider_reliability_snapshot_checksum: snapshotRead.snapshot.snapshot_checksum || "",
            provider_reliability_snapshot_status: snapshotRead.status || "missing",
            provider_reliability_snapshot_expires_at: snapshotRead.snapshot.expires_at || "",
            provider_reliability_snapshot_generation_id: snapshotRead.snapshot.generation_id || "",
        } : {}),
        should_hold_dispatch: shouldHoldDispatch,
    };
    return {
        schema: "ccm-pressure-provenance-provider-dispatch-advisory-selection-v1",
        version: 1,
        groupId,
        project,
        agent_type: agentType,
        source: "typed-feedback:pressure-provenance-provider-dispatch-advisory",
        source_policy_action: policy.action || "",
        source_policy_severity: policy.severity || "",
        selected_candidate: selected,
        dispatch_policy: dispatchPolicy,
        health_status: healthStatus,
        should_hold_dispatch: shouldHoldDispatch,
        ...(snapshotRead?.snapshot ? { provider_reliability_snapshot: {
                schema: "ccm-provider-dispatch-reliability-snapshot-ref-v1",
                snapshot_id: snapshotRead.snapshot.snapshot_id || "",
                generation_id: snapshotRead.snapshot.generation_id || "",
                snapshot_checksum: snapshotRead.snapshot.snapshot_checksum || "",
                payload_checksum: snapshotRead.snapshot.payload_checksum || "",
                status: snapshotRead.status || "",
                usable: snapshotRead.usable === true,
                refreshed: snapshotRead.refreshed === true,
                generated_at: snapshotRead.snapshot.generated_at || "",
                expires_at: snapshotRead.snapshot.expires_at || "",
                source_generation_checksum: snapshotRead.snapshot.source_provenance?.generation_checksum || "",
                source_ledger_count: Number(snapshotRead.snapshot.source_provenance?.source_ledger_count || 0),
                guidance_only: true,
                local_policy_override_allowed: false,
                contains_private_memory: false,
            } } : {}),
        ranked_provider_candidate_count: rankedProviderCandidates.length,
        ranked_provider_candidates: rankedProviderCandidates.slice(0, 12),
        safer_alternative_count: saferAlternatives.length,
        safer_alternatives: saferAlternatives,
        recommendation: shouldHoldDispatch
            ? selected.provider_switch_execution_mismatch_escalated
                ? `hold ${agentType}/${project} provider switches after ${selected.provider_switch_execution_mismatch_count || 0} system-attested execution mismatch(es)`
                : selected.provider_override_followup_receipt_validation_escalated
                    ? `hold ${agentType}/${project} child-agent dispatch after ${selected.provider_override_followup_receipt_validation_consecutive_failure_count || 0} consecutive corrected-receipt validation failures`
                    : `hold ${agentType}/${project} child-agent dispatch until pressure provenance repair closes`
            : saferAlternatives.length
                ? `keep current ${agentType}/${project} assignment unchanged, but prefer configured safer candidate ${saferAlternatives[0].agent_type} on the next dispatch decision when task/provider compatibility is confirmed`
                : selected.provider_switch_execution_mismatch_count > 0
                    ? `allow ${agentType}/${project} with receipt sampling; provider switch execution history has ${selected.provider_switch_execution_mismatch_count || 0} mismatch(es), and passed history is not future switch authorization`
                    : selected.provider_override_followup_repaired
                        ? `allow ${agentType}/${project} dispatch with receipt sampling; verified provider override follow-up history exists but current evidence is still required`
                        : selected.cross_group_provider_reliability_actionable
                            ? `allow ${agentType}/${project} only with receipt sampling based on privacy-redacted cross-group reliability guidance; local group policy remains authoritative`
                            : selected.dispatch_recommendation,
        generated_at: new Date().toISOString(),
    };
}
function providerSwitchDecisionReceiptComparableForCoordinator(receipt = {}) {
    const comparable = { ...receipt };
    delete comparable.receipt_checksum;
    delete comparable.validation;
    delete comparable.gaps;
    delete comparable.valid;
    return comparable;
}
function providerSwitchDecisionReceiptChecksumForCoordinator(receipt = {}) {
    return (0, group_orchestrator_coded_part_01_1.hashCoordinator)(providerSwitchDecisionReceiptComparableForCoordinator(receipt), 48);
}
function normalizeProviderSwitchAuthorityForCoordinator(value = {}) {
    const authority = value && typeof value === "object" ? value : {};
    const kind = String(authority.kind || authority.type || authority.source || "").trim().toLowerCase();
    const localKinds = new Set(["local_user", "user", "task_runtime_override", "group_local_policy", "local_policy"]);
    return {
        kind,
        authority_id: String(authority.authority_id || authority.authorityId || authority.id || "").trim(),
        approved: authority.approved === true || authority.allowed === true,
        local_policy_authority: authority.local_policy_authority === true
            || authority.localPolicyAuthority === true
            || localKinds.has(kind),
        allow_switch_away_from_held_provider: authority.allow_switch_away_from_held_provider === true
            || authority.allowSwitchAwayFromHeldProvider === true,
        reason: (0, group_orchestrator_prompts_1.compactText)(authority.reason || authority.note || "", 360),
    };
}
function normalizeProviderSwitchRequestForCoordinator(value = {}) {
    const request = value && typeof value === "object" ? value : {};
    const evidence = Array.isArray(request.compatibility_evidence || request.compatibilityEvidence)
        ? (request.compatibility_evidence || request.compatibilityEvidence)
        : request.compatibility_evidence || request.compatibilityEvidence
            ? [request.compatibility_evidence || request.compatibilityEvidence]
            : [];
    return {
        requested_agent_type: String(request.requested_agent_type
            || request.requestedAgentType
            || request.new_agent_type
            || request.newAgentType
            || request.provider
            || request.runner
            || "").trim(),
        compatibility_confirmed: request.compatibility_confirmed === true || request.compatibilityConfirmed === true,
        compatibility_evidence: uniqueCoordinatorStrings(evidence).slice(0, 12),
        reason: (0, group_orchestrator_prompts_1.compactText)(request.reason || request.switch_reason || request.switchReason || "", 500),
        authority: normalizeProviderSwitchAuthorityForCoordinator(request.authority || request.approval || {}),
    };
}
function providerSwitchRequestForAssignmentForCoordinator(member = {}, project = "", options = {}) {
    const requests = options.providerSwitchRequests || options.provider_switch_requests || {};
    const mapped = requests && typeof requests === "object"
        ? requests[project] || requests["*"] || null
        : null;
    return mapped
        || member.providerSwitchRequest
        || member.provider_switch_request
        || options.providerSwitchRequest
        || options.provider_switch_request
        || null;
}
function validateProviderSwitchDecisionReceiptForCoordinator(receipt = {}, options = {}) {
    return require("./group-orchestrator-worker-context").validateProviderSwitchDecisionReceiptForCoordinator(receipt, options);
}
function buildProviderSwitchDecisionReceiptForCoordinator(groupId, assignment = {}, requestValue = {}, options = {}) {
    return require("./group-orchestrator-worker-context").buildProviderSwitchDecisionReceiptForCoordinator(groupId, assignment, requestValue, options);
}
function providerRankingProvenanceListForCoordinator(packet = {}) {
    const advisory = packet.pressure_provenance_provider_dispatch_advisory
        || packet.pressureProvenanceProviderDispatchAdvisory
        || {};
    const selected = advisory.selected_candidate || advisory.selectedCandidate || {};
    const alternatives = Array.isArray(advisory.safer_alternatives || advisory.saferAlternatives)
        ? (advisory.safer_alternatives || advisory.saferAlternatives)
        : [];
    const ranked = Array.isArray(advisory.ranked_provider_candidates || advisory.rankedProviderCandidates)
        ? (advisory.ranked_provider_candidates || advisory.rankedProviderCandidates)
        : [];
    const receipt = packet.provider_switch_decision_receipt || packet.providerSwitchDecisionReceipt || {};
    const receiptProvenance = receipt.provider_ranking_provenance || receipt.providerRankingProvenance || {};
    return [
        selected.provider_ranking_provenance || selected.providerRankingProvenance,
        ...alternatives.map((item) => item.provider_ranking_provenance || item.providerRankingProvenance),
        ...ranked.map((item) => item.provider_ranking_provenance || item.providerRankingProvenance),
        receiptProvenance.selected || receiptProvenance.selected_candidate || receiptProvenance.selectedCandidate,
        receiptProvenance.requested_candidate || receiptProvenance.requestedCandidate,
        receipt.old_provider?.provider_ranking_provenance || receipt.oldProvider?.providerRankingProvenance,
        receipt.new_provider?.provider_ranking_provenance || receipt.newProvider?.providerRankingProvenance,
    ].filter((item) => item && typeof item === "object");
}
function providerRankingProvenancePacketSummaryForCoordinator(packet = {}) {
    const receipt = packet.provider_switch_decision_receipt || packet.providerSwitchDecisionReceipt || {};
    const receiptProvenance = receipt.provider_ranking_provenance || receipt.providerRankingProvenance || {};
    const provenances = providerRankingProvenanceListForCoordinator(packet);
    const relPaths = uniqueCoordinatorStrings(provenances.flatMap((item) => Array.isArray(item.typed_memory_rel_paths || item.typedMemoryRelPaths) ? (item.typed_memory_rel_paths || item.typedMemoryRelPaths) : [])).slice(0, 16);
    const rowIds = uniqueCoordinatorStrings(provenances.flatMap((item) => Array.isArray(item.typed_memory_row_ids || item.typedMemoryRowIds) ? (item.typed_memory_row_ids || item.typedMemoryRowIds) : [])).slice(0, 32);
    const executionReceiptIds = uniqueCoordinatorStrings(provenances.flatMap((item) => Array.isArray(item.execution_receipt_ids || item.executionReceiptIds) ? (item.execution_receipt_ids || item.executionReceiptIds) : [])).slice(0, 24);
    const decisionReceiptIds = uniqueCoordinatorStrings([
        ...provenances.flatMap((item) => Array.isArray(item.decision_receipt_ids || item.decisionReceiptIds) ? (item.decision_receipt_ids || item.decisionReceiptIds) : []),
        receipt.receipt_id || receipt.receiptId || "",
    ]).filter(Boolean).slice(0, 24);
    const providerSwitchDecisionReceiptPresent = receipt.schema === "ccm-provider-switch-decision-receipt-v1";
    const present = provenances.length > 0 || relPaths.length > 0 || rowIds.length > 0 || (providerSwitchDecisionReceiptPresent && receiptProvenance?.schema);
    return {
        schema: "ccm-provider-ranking-provenance-packet-summary-v1",
        present,
        compact_safe: provenances.some((item) => item.compact_safe === true || item.compactSafe === true)
            || receiptProvenance.compact_safe === true
            || receiptProvenance.compactSafe === true,
        provider_switch_decision_receipt_present: providerSwitchDecisionReceiptPresent,
        provider_switch_decision_receipt_id: receipt.receipt_id || receipt.receiptId || "",
        provider_switch_decision_receipt_checksum: receipt.receipt_checksum || receipt.receiptChecksum || "",
        typed_memory_rel_paths: relPaths,
        typed_memory_row_ids: rowIds,
        execution_receipt_ids: executionReceiptIds,
        decision_receipt_ids: decisionReceiptIds,
        provenance_count: provenances.length,
    };
}
function buildProviderRankingProvenancePreservationForCoordinator(beforePacket = {}, afterPacket = {}, options = {}) {
    const before = providerRankingProvenancePacketSummaryForCoordinator(beforePacket);
    const after = providerRankingProvenancePacketSummaryForCoordinator(afterPacket);
    const required = before.present === true || before.provider_switch_decision_receipt_present === true;
    const missingRelPaths = before.typed_memory_rel_paths.filter((item) => !after.typed_memory_rel_paths.includes(item));
    const missingRowIds = before.typed_memory_row_ids.filter((item) => !after.typed_memory_row_ids.includes(item));
    const gaps = uniqueCoordinatorStrings([
        required && after.present !== true ? "provider_ranking_provenance_missing_after_compact" : "",
        before.provider_switch_decision_receipt_present === true && after.provider_switch_decision_receipt_present !== true ? "provider_switch_decision_receipt_missing_after_compact" : "",
        before.provider_switch_decision_receipt_id && after.provider_switch_decision_receipt_id && before.provider_switch_decision_receipt_id !== after.provider_switch_decision_receipt_id ? "provider_switch_decision_receipt_id_changed" : "",
        missingRelPaths.length ? "typed_memory_rel_paths_missing_after_compact" : "",
        missingRowIds.length ? "typed_memory_row_ids_missing_after_compact" : "",
    ]);
    const preserved = !required || gaps.length === 0;
    return {
        schema: "ccm-provider-ranking-provenance-preservation-v1",
        required,
        preserved,
        compact_safe_preserved: !required || (after.compact_safe === true && gaps.length === 0),
        source: "worker_context_packet_compaction_retry",
        retry_id: options.retry_id || options.retryId || "",
        before,
        after,
        missing_typed_memory_rel_paths: missingRelPaths,
        missing_typed_memory_row_ids: missingRowIds,
        gaps,
    };
}
function normalizeProviderRankingProvenancePreservationForCoordinator(raw = null) {
    if (!raw || typeof raw !== "object" || raw.schema !== "ccm-provider-ranking-provenance-preservation-v1")
        return null;
    const before = raw.before || {};
    const after = raw.after || {};
    const summary = (value = {}) => ({
        schema: "ccm-provider-ranking-provenance-packet-summary-v1",
        present: value.present === true,
        compact_safe: value.compact_safe === true || value.compactSafe === true,
        provider_switch_decision_receipt_present: value.provider_switch_decision_receipt_present === true || value.providerSwitchDecisionReceiptPresent === true,
        provider_switch_decision_receipt_id: String(value.provider_switch_decision_receipt_id || value.providerSwitchDecisionReceiptId || ""),
        provider_switch_decision_receipt_checksum: String(value.provider_switch_decision_receipt_checksum || value.providerSwitchDecisionReceiptChecksum || ""),
        typed_memory_rel_paths: uniqueCoordinatorStrings(Array.isArray(value.typed_memory_rel_paths || value.typedMemoryRelPaths) ? (value.typed_memory_rel_paths || value.typedMemoryRelPaths) : []).slice(0, 16),
        typed_memory_row_ids: uniqueCoordinatorStrings(Array.isArray(value.typed_memory_row_ids || value.typedMemoryRowIds) ? (value.typed_memory_row_ids || value.typedMemoryRowIds) : []).slice(0, 32),
        execution_receipt_ids: uniqueCoordinatorStrings(Array.isArray(value.execution_receipt_ids || value.executionReceiptIds) ? (value.execution_receipt_ids || value.executionReceiptIds) : []).slice(0, 24),
        decision_receipt_ids: uniqueCoordinatorStrings(Array.isArray(value.decision_receipt_ids || value.decisionReceiptIds) ? (value.decision_receipt_ids || value.decisionReceiptIds) : []).slice(0, 24),
        provenance_count: Number(value.provenance_count || value.provenanceCount || 0),
    });
    return {
        schema: "ccm-provider-ranking-provenance-preservation-v1",
        required: raw.required === true,
        preserved: raw.preserved === true,
        compact_safe_preserved: raw.compact_safe_preserved === true || raw.compactSafePreserved === true,
        source: String(raw.source || "worker_context_packet_compaction_retry"),
        retry_id: String(raw.retry_id || raw.retryId || ""),
        before: summary(before),
        after: summary(after),
        missing_typed_memory_rel_paths: uniqueCoordinatorStrings(Array.isArray(raw.missing_typed_memory_rel_paths || raw.missingTypedMemoryRelPaths) ? (raw.missing_typed_memory_rel_paths || raw.missingTypedMemoryRelPaths) : []).slice(0, 16),
        missing_typed_memory_row_ids: uniqueCoordinatorStrings(Array.isArray(raw.missing_typed_memory_row_ids || raw.missingTypedMemoryRowIds) ? (raw.missing_typed_memory_row_ids || raw.missingTypedMemoryRowIds) : []).slice(0, 32),
        gaps: uniqueCoordinatorStrings(Array.isArray(raw.gaps) ? raw.gaps : []).slice(0, 16),
    };
}
function postCompactReceiptMemoryUsageRepairCompletionPacketSummaryForCoordinator(packet = {}) {
    const contract = packet.post_compact_reinjection_repair_receipt_memory_contract
        || packet.postCompactReinjectionRepairReceiptMemoryContract
        || {};
    const acceptance = packet.acceptance || {};
    const requiredDocRelPaths = uniqueCoordinatorStrings(contract.memory_receipt_required_doc_rel_paths || contract.memoryReceiptRequiredDocRelPaths || []).slice(0, 16);
    const completionDocRelPaths = uniqueCoordinatorStrings(contract.corrected_receipt_completion_doc_rel_paths || contract.correctedReceiptCompletionDocRelPaths || []).slice(0, 16);
    const workItemIds = uniqueCoordinatorStrings(contract.corrected_receipt_completion_work_item_ids || contract.correctedReceiptCompletionWorkItemIds || []).slice(0, 24);
    const timelineBindingIds = uniqueCoordinatorStrings(contract.corrected_receipt_completion_timeline_binding_ids || contract.correctedReceiptCompletionTimelineBindingIds || []).slice(0, 24);
    const historicalTaskAgentSessionIds = uniqueCoordinatorStrings(contract.historical_task_agent_session_ids || contract.historicalTaskAgentSessionIds || []).slice(0, 24);
    const historicalNativeSessionIds = uniqueCoordinatorStrings(contract.historical_native_session_ids || contract.historicalNativeSessionIds || []).slice(0, 24);
    const currentSessionBindingId = String(contract.current_session_binding_id || contract.currentSessionBindingId || "");
    const currentTaskAgentSessionId = String(contract.current_task_agent_session_id || contract.currentTaskAgentSessionId || "");
    const currentNativeSessionId = String(contract.current_native_session_id || contract.currentNativeSessionId || "");
    const conflictResolutionDocRelPaths = requiredDocRelPaths.filter((relPath) => relPath === "post-compact-completion-memory-preservation-closure-conflict-resolutions.md");
    const conflictResolutionActive = contract.closure_conflict_resolution_active === true;
    const conflictResolutionReopened = contract.closure_conflict_resolution_reopened === true;
    const conflictResolutionEntryId = String(contract.closure_conflict_resolution_entry_id || "");
    const conflictResolutionState = String(contract.closure_conflict_resolution_state || "");
    const conflictResolutionUsageState = String(contract.closure_conflict_resolution_usage_state || "");
    const conflictResolutionTaskAgentSessionId = String(contract.closure_conflict_resolution_task_agent_session_id || "");
    const conflictResolutionNativeSessionId = String(contract.closure_conflict_resolution_native_session_id || "");
    const conflictResolutionPresent = !!conflictResolutionEntryId && (conflictResolutionActive || conflictResolutionReopened);
    const present = contract.active === true && contract.corrected_receipt_completion_memory_active === true;
    const authorityBoundaryValid = !present || (!!currentSessionBindingId
        && !!currentTaskAgentSessionId
        && !!currentNativeSessionId
        && !historicalTaskAgentSessionIds.includes(currentTaskAgentSessionId)
        && !historicalNativeSessionIds.includes(currentNativeSessionId));
    return {
        schema: "ccm-post-compact-receipt-memory-usage-repair-completion-packet-summary-v1",
        present,
        completion_doc_rel_paths: completionDocRelPaths,
        required_doc_rel_paths: requiredDocRelPaths,
        work_item_ids: workItemIds,
        timeline_binding_ids: timelineBindingIds,
        historical_task_agent_session_ids: historicalTaskAgentSessionIds,
        historical_native_session_ids: historicalNativeSessionIds,
        current_session_binding_id: currentSessionBindingId,
        current_task_agent_session_id: currentTaskAgentSessionId,
        current_native_session_id: currentNativeSessionId,
        conflict_resolution_present: conflictResolutionPresent,
        conflict_resolution_doc_rel_paths: conflictResolutionDocRelPaths,
        conflict_resolution_active: conflictResolutionActive,
        conflict_resolution_reopened: conflictResolutionReopened,
        conflict_resolution_state: conflictResolutionState,
        conflict_resolution_entry_id: conflictResolutionEntryId,
        conflict_resolution_usage_state: conflictResolutionUsageState,
        conflict_resolution_task_agent_session_id: conflictResolutionTaskAgentSessionId,
        conflict_resolution_native_session_id: conflictResolutionNativeSessionId,
        conflict_resolution_reversible: contract.closure_conflict_resolution_reversible === true,
        conflict_resolution_historical_branches_preserved: contract.closure_conflict_resolution_historical_branches_preserved === true,
        conflict_resolution_reverification_acceptance_required: acceptance.post_compact_completion_memory_preservation_closure_conflict_resolution_reverification_required === true,
        conflict_resolution_reversible_acceptance_required: acceptance.post_compact_completion_memory_preservation_closure_conflict_resolution_reversible === true,
        conflict_verification_acceptance_required: acceptance.post_compact_completion_memory_preservation_closure_feedback_conflict_current_session_verification_required === true,
        usage_acceptance_required: acceptance.post_compact_receipt_memory_usage_repair_completion_memory_usage_required === true,
        current_session_acceptance_required: acceptance.post_compact_receipt_memory_usage_repair_completion_current_session_binding_required === true,
        authority_boundary_valid: authorityBoundaryValid,
    };
}
function buildPostCompactReceiptMemoryUsageRepairCompletionPreservationForCoordinator(beforePacket = {}, afterPacket = {}, options = {}) {
    const before = postCompactReceiptMemoryUsageRepairCompletionPacketSummaryForCoordinator(beforePacket);
    const after = postCompactReceiptMemoryUsageRepairCompletionPacketSummaryForCoordinator(afterPacket);
    const required = before.present === true;
    const missingCompletionDocRelPaths = before.completion_doc_rel_paths.filter((item) => !after.completion_doc_rel_paths.includes(item));
    const missingRequiredDocRelPaths = before.required_doc_rel_paths.filter((item) => !after.required_doc_rel_paths.includes(item));
    const missingWorkItemIds = before.work_item_ids.filter((item) => !after.work_item_ids.includes(item));
    const missingTimelineBindingIds = before.timeline_binding_ids.filter((item) => !after.timeline_binding_ids.includes(item));
    const missingHistoricalTaskAgentSessionIds = before.historical_task_agent_session_ids.filter((item) => !after.historical_task_agent_session_ids.includes(item));
    const missingHistoricalNativeSessionIds = before.historical_native_session_ids.filter((item) => !after.historical_native_session_ids.includes(item));
    const missingConflictResolutionDocRelPaths = before.conflict_resolution_doc_rel_paths.filter((item) => !after.conflict_resolution_doc_rel_paths.includes(item));
    const gaps = uniqueCoordinatorStrings([
        required && after.present !== true ? "completion_memory_contract_missing_after_compact" : "",
        missingCompletionDocRelPaths.length ? "completion_doc_rel_paths_missing_after_compact" : "",
        missingRequiredDocRelPaths.length ? "required_doc_rel_paths_missing_after_compact" : "",
        missingWorkItemIds.length ? "completion_work_item_ids_missing_after_compact" : "",
        missingTimelineBindingIds.length ? "completion_timeline_binding_ids_missing_after_compact" : "",
        missingHistoricalTaskAgentSessionIds.length ? "historical_task_agent_session_ids_missing_after_compact" : "",
        missingHistoricalNativeSessionIds.length ? "historical_native_session_ids_missing_after_compact" : "",
        required && before.current_session_binding_id !== after.current_session_binding_id ? "current_session_binding_changed_after_compact" : "",
        required && before.current_task_agent_session_id !== after.current_task_agent_session_id ? "current_task_agent_session_changed_after_compact" : "",
        required && before.current_native_session_id !== after.current_native_session_id ? "current_native_session_changed_after_compact" : "",
        required && after.usage_acceptance_required !== true ? "completion_memory_usage_acceptance_missing_after_compact" : "",
        required && after.current_session_acceptance_required !== true ? "completion_current_session_acceptance_missing_after_compact" : "",
        required && after.authority_boundary_valid !== true ? "historical_session_promoted_to_current_authority" : "",
        before.conflict_resolution_present && after.conflict_resolution_present !== true ? "conflict_resolution_contract_missing_after_compact" : "",
        missingConflictResolutionDocRelPaths.length ? "conflict_resolution_doc_rel_paths_missing_after_compact" : "",
        before.conflict_resolution_present && before.conflict_resolution_entry_id !== after.conflict_resolution_entry_id ? "conflict_resolution_entry_id_changed_after_compact" : "",
        before.conflict_resolution_present && before.conflict_resolution_state !== after.conflict_resolution_state ? "conflict_resolution_state_changed_after_compact" : "",
        before.conflict_resolution_present && before.conflict_resolution_usage_state !== after.conflict_resolution_usage_state ? "conflict_resolution_usage_state_changed_after_compact" : "",
        before.conflict_resolution_present && before.conflict_resolution_task_agent_session_id !== after.conflict_resolution_task_agent_session_id ? "conflict_resolution_task_session_changed_after_compact" : "",
        before.conflict_resolution_present && before.conflict_resolution_native_session_id !== after.conflict_resolution_native_session_id ? "conflict_resolution_native_session_changed_after_compact" : "",
        before.conflict_resolution_present && before.conflict_resolution_active !== after.conflict_resolution_active ? "conflict_resolution_active_state_changed_after_compact" : "",
        before.conflict_resolution_present && before.conflict_resolution_reopened !== after.conflict_resolution_reopened ? "conflict_resolution_reopened_state_changed_after_compact" : "",
        before.conflict_resolution_present && after.conflict_resolution_reversible !== true ? "conflict_resolution_reversible_missing_after_compact" : "",
        before.conflict_resolution_present && after.conflict_resolution_historical_branches_preserved !== true ? "conflict_resolution_historical_branches_missing_after_compact" : "",
        before.conflict_resolution_active && after.conflict_resolution_reverification_acceptance_required !== true ? "conflict_resolution_reverification_acceptance_missing_after_compact" : "",
        before.conflict_resolution_active && after.conflict_resolution_reversible_acceptance_required !== true ? "conflict_resolution_reversible_acceptance_missing_after_compact" : "",
        before.conflict_resolution_reopened && after.conflict_verification_acceptance_required !== true ? "reopened_conflict_current_session_verification_missing_after_compact" : "",
    ]);
    return {
        schema: "ccm-post-compact-receipt-memory-usage-repair-completion-preservation-v1",
        required,
        preserved: !required || gaps.length === 0,
        source: "worker_context_packet_compaction_retry",
        retry_id: String(options.retry_id || options.retryId || ""),
        before,
        after,
        missing_completion_doc_rel_paths: missingCompletionDocRelPaths,
        missing_required_doc_rel_paths: missingRequiredDocRelPaths,
        missing_work_item_ids: missingWorkItemIds,
        missing_timeline_binding_ids: missingTimelineBindingIds,
        missing_historical_task_agent_session_ids: missingHistoricalTaskAgentSessionIds,
        missing_historical_native_session_ids: missingHistoricalNativeSessionIds,
        missing_conflict_resolution_doc_rel_paths: missingConflictResolutionDocRelPaths,
        gaps,
    };
}
function normalizePostCompactReceiptMemoryUsageRepairCompletionPreservationForCoordinator(raw = null) {
    if (!raw || typeof raw !== "object" || raw.schema !== "ccm-post-compact-receipt-memory-usage-repair-completion-preservation-v1")
        return null;
    const summary = (value = {}) => ({
        schema: "ccm-post-compact-receipt-memory-usage-repair-completion-packet-summary-v1",
        present: value.present === true,
        completion_doc_rel_paths: uniqueCoordinatorStrings(value.completion_doc_rel_paths || value.completionDocRelPaths || []).slice(0, 16),
        required_doc_rel_paths: uniqueCoordinatorStrings(value.required_doc_rel_paths || value.requiredDocRelPaths || []).slice(0, 16),
        work_item_ids: uniqueCoordinatorStrings(value.work_item_ids || value.workItemIds || []).slice(0, 24),
        timeline_binding_ids: uniqueCoordinatorStrings(value.timeline_binding_ids || value.timelineBindingIds || []).slice(0, 24),
        historical_task_agent_session_ids: uniqueCoordinatorStrings(value.historical_task_agent_session_ids || value.historicalTaskAgentSessionIds || []).slice(0, 24),
        historical_native_session_ids: uniqueCoordinatorStrings(value.historical_native_session_ids || value.historicalNativeSessionIds || []).slice(0, 24),
        current_session_binding_id: String(value.current_session_binding_id || value.currentSessionBindingId || ""),
        current_task_agent_session_id: String(value.current_task_agent_session_id || value.currentTaskAgentSessionId || ""),
        current_native_session_id: String(value.current_native_session_id || value.currentNativeSessionId || ""),
        conflict_resolution_present: value.conflict_resolution_present === true || value.conflictResolutionPresent === true,
        conflict_resolution_doc_rel_paths: uniqueCoordinatorStrings(value.conflict_resolution_doc_rel_paths || value.conflictResolutionDocRelPaths || []).slice(0, 8),
        conflict_resolution_active: value.conflict_resolution_active === true || value.conflictResolutionActive === true,
        conflict_resolution_reopened: value.conflict_resolution_reopened === true || value.conflictResolutionReopened === true,
        conflict_resolution_state: String(value.conflict_resolution_state || value.conflictResolutionState || ""),
        conflict_resolution_entry_id: String(value.conflict_resolution_entry_id || value.conflictResolutionEntryId || ""),
        conflict_resolution_usage_state: String(value.conflict_resolution_usage_state || value.conflictResolutionUsageState || ""),
        conflict_resolution_task_agent_session_id: String(value.conflict_resolution_task_agent_session_id || value.conflictResolutionTaskAgentSessionId || ""),
        conflict_resolution_native_session_id: String(value.conflict_resolution_native_session_id || value.conflictResolutionNativeSessionId || ""),
        conflict_resolution_reversible: value.conflict_resolution_reversible === true || value.conflictResolutionReversible === true,
        conflict_resolution_historical_branches_preserved: value.conflict_resolution_historical_branches_preserved === true || value.conflictResolutionHistoricalBranchesPreserved === true,
        conflict_resolution_reverification_acceptance_required: value.conflict_resolution_reverification_acceptance_required === true || value.conflictResolutionReverificationAcceptanceRequired === true,
        conflict_resolution_reversible_acceptance_required: value.conflict_resolution_reversible_acceptance_required === true || value.conflictResolutionReversibleAcceptanceRequired === true,
        conflict_verification_acceptance_required: value.conflict_verification_acceptance_required === true || value.conflictVerificationAcceptanceRequired === true,
        usage_acceptance_required: value.usage_acceptance_required === true || value.usageAcceptanceRequired === true,
        current_session_acceptance_required: value.current_session_acceptance_required === true || value.currentSessionAcceptanceRequired === true,
        authority_boundary_valid: value.authority_boundary_valid === true || value.authorityBoundaryValid === true,
    });
    return {
        schema: "ccm-post-compact-receipt-memory-usage-repair-completion-preservation-v1",
        required: raw.required === true,
        preserved: raw.preserved === true,
        source: String(raw.source || "worker_context_packet_compaction_retry"),
        retry_id: String(raw.retry_id || raw.retryId || ""),
        before: summary(raw.before || {}),
        after: summary(raw.after || {}),
        missing_completion_doc_rel_paths: uniqueCoordinatorStrings(raw.missing_completion_doc_rel_paths || raw.missingCompletionDocRelPaths || []).slice(0, 16),
        missing_required_doc_rel_paths: uniqueCoordinatorStrings(raw.missing_required_doc_rel_paths || raw.missingRequiredDocRelPaths || []).slice(0, 16),
        missing_work_item_ids: uniqueCoordinatorStrings(raw.missing_work_item_ids || raw.missingWorkItemIds || []).slice(0, 24),
        missing_timeline_binding_ids: uniqueCoordinatorStrings(raw.missing_timeline_binding_ids || raw.missingTimelineBindingIds || []).slice(0, 24),
        missing_historical_task_agent_session_ids: uniqueCoordinatorStrings(raw.missing_historical_task_agent_session_ids || raw.missingHistoricalTaskAgentSessionIds || []).slice(0, 24),
        missing_historical_native_session_ids: uniqueCoordinatorStrings(raw.missing_historical_native_session_ids || raw.missingHistoricalNativeSessionIds || []).slice(0, 24),
        missing_conflict_resolution_doc_rel_paths: uniqueCoordinatorStrings(raw.missing_conflict_resolution_doc_rel_paths || raw.missingConflictResolutionDocRelPaths || []).slice(0, 8),
        gaps: uniqueCoordinatorStrings(raw.gaps || []).slice(0, 24),
    };
}
function maybeRetryWorkerContextPacketCompactionForCoordinator(baseAssignment, dependsOn, replayRepairDispatchBriefs, initialPacket, initialGate, options = {}) {
    return require("./group-orchestrator-worker-context").maybeRetryWorkerContextPacketCompactionForCoordinator(baseAssignment, dependsOn, replayRepairDispatchBriefs, initialPacket, initialGate, options);
}
function rawProviderDispatchOverrideForCoordinator(assignment = {}, packet = {}) {
    return assignment.provider_dispatch_override
        || assignment.providerDispatchOverride
        || assignment.pressure_provenance_provider_dispatch_override
        || assignment.pressureProvenanceProviderDispatchOverride
        || packet.provider_dispatch_override
        || packet.providerDispatchOverride
        || packet.pressure_provenance_provider_dispatch_override
        || packet.pressureProvenanceProviderDispatchOverride
        || null;
}
function normalizeProviderDispatchOverrideReceiptForCoordinator(raw = null, context = {}) {
    if (!raw || typeof raw !== "object")
        return null;
    const project = String(context.project || "").trim();
    const agentType = String(context.agentType || context.agent_type || "").trim();
    const receiptProject = String(raw.project || raw.target_project || raw.targetProject || "").trim();
    const receiptAgentType = String(raw.agent_type || raw.agentType || raw.provider || raw.runner || "").trim();
    const schema = String(raw.schema || "ccm-pressure-provenance-provider-dispatch-override-receipt-v1").trim();
    const overrideAction = String(raw.override_action || raw.overrideAction || raw.action || "allow_once").trim();
    const approvedBy = String(raw.approved_by || raw.approvedBy || raw.user || raw.user_id || raw.userId || "").trim();
    const reason = String(raw.reason || raw.justification || raw.user_reason || raw.userReason || "").trim();
    const expiresAt = String(raw.expires_at || raw.expiresAt || "").trim();
    const nowMs = Number(context.nowMs || Date.now());
    const expiresMs = expiresAt ? Date.parse(expiresAt) : NaN;
    const gaps = [];
    if (schema !== "ccm-pressure-provenance-provider-dispatch-override-receipt-v1"
        && schema !== "ccm-worker-context-provider-dispatch-override-receipt-v1")
        gaps.push("schema");
    if (raw.approved !== true && raw.user_approved !== true && raw.userApproved !== true)
        gaps.push("approved");
    if (raw.risk_accepted !== true && raw.riskAccepted !== true)
        gaps.push("risk_accepted");
    if (raw.acknowledges_repair_required !== true && raw.acknowledgesRepairRequired !== true)
        gaps.push("acknowledges_repair_required");
    if (!approvedBy)
        gaps.push("approved_by");
    if (!reason)
        gaps.push("reason");
    if (receiptProject && project && receiptProject.toLowerCase() !== project.toLowerCase())
        gaps.push("project_mismatch");
    if (receiptAgentType && agentType && receiptAgentType.toLowerCase() !== agentType.toLowerCase())
        gaps.push("agent_type_mismatch");
    if (expiresAt && (!Number.isFinite(expiresMs) || expiresMs <= nowMs))
        gaps.push("expires_at");
    if (!["allow_once", "allow", "force_dispatch"].includes(overrideAction))
        gaps.push("override_action");
    const valid = gaps.length === 0;
    const overrideId = String(raw.override_id || raw.overrideId || `provider-dispatch-override:${(0, group_orchestrator_coded_part_01_1.hashCoordinator)([
        context.groupId || context.group_id || "",
        project,
        agentType,
        approvedBy,
        reason,
        raw.approved_at || raw.approvedAt || "",
    ], 14)}`);
    return {
        schema: "ccm-pressure-provenance-provider-dispatch-override-receipt-v1",
        version: 1,
        override_id: overrideId,
        status: valid ? "valid" : "invalid",
        valid,
        gaps,
        override_action: overrideAction,
        approved: raw.approved === true || raw.user_approved === true || raw.userApproved === true,
        approved_by: approvedBy,
        approved_at: raw.approved_at || raw.approvedAt || raw.at || "",
        risk_accepted: raw.risk_accepted === true || raw.riskAccepted === true,
        acknowledges_repair_required: raw.acknowledges_repair_required === true || raw.acknowledgesRepairRequired === true,
        reason,
        project: receiptProject || project,
        agent_type: receiptAgentType || agentType,
        health_status: context.healthStatus || context.health_status || raw.health_status || raw.healthStatus || "",
        dispatch_policy: context.dispatchPolicy || context.dispatch_policy || raw.dispatch_policy || raw.dispatchPolicy || "",
        expires_at: expiresAt,
        source: raw.source || "user_approved_provider_dispatch_override",
        raw,
    };
}
function buildWorkerContextPreDispatchGateForCoordinator(assignment = {}, packet = {}) {
    return require("./group-orchestrator-worker-context").buildWorkerContextPreDispatchGateForCoordinator(assignment, packet);
}
function buildWorkerContextProviderDispatchDecisionForCoordinator(assignment = {}, packet = {}, gate = {}, options = {}) {
    return require("./group-orchestrator-worker-context").buildWorkerContextProviderDispatchDecisionForCoordinator(assignment, packet, gate, options);
}
function summarizeWorkerContextPacketTypedMemoryPressureRecallForCoordinator(packet = {}) {
    const memory = packet.memory || packet.group_memory || packet.groupMemory || {};
    const recall = memory?.group_state?.typedMemory?.recall
        || memory?.group_state?.typed_memory?.recall
        || memory?.groupState?.typedMemory?.recall
        || memory?.typedMemory?.recall
        || memory?.typed_memory?.recall
        || memory?.typedMemoryRecall
        || memory?.typed_memory_recall
        || null;
    const scoring = recall?.workerContextPressureScoring || recall?.worker_context_pressure_scoring || {};
    const feedbackPolicyScoring = recall?.workerContextPressureFeedbackPolicyScoring
        || recall?.worker_context_pressure_feedback_policy_scoring
        || {};
    const provenanceRequiresReceipt = (match = {}) => {
        const provenance = String(match.provenance_status || match.provenanceStatus || "").trim();
        return provenance === "disputed_under_repair"
            || provenance === "stale_evidence_under_repair"
            || !!String(match.repair_work_item_id || match.repairWorkItemId || match.work_item_id || match.workItemId || "").trim()
            || match.repair_open === true
            || match.repairOpen === true;
    };
    const docs = (Array.isArray(recall?.recalled) ? recall.recalled : [])
        .filter((doc) => {
        const pressure = doc.workerContextPressureRecall || doc.worker_context_pressure_recall || {};
        const pressureUsage = doc.workerContextPressureUsage || doc.worker_context_pressure_usage || {};
        const pressureFeedbackPolicy = doc.workerContextPressureFeedbackPolicy || doc.worker_context_pressure_feedback_policy || {};
        return Number(pressure.adjustment || 0) > 0
            || Number(pressureUsage.adjustment || 0) !== 0
            || (Array.isArray(pressureUsage.matched) && pressureUsage.matched.length > 0)
            || Number(pressureFeedbackPolicy.adjustment || 0) !== 0
            || pressureFeedbackPolicy.risk_doc === true;
    })
        .map((doc) => {
        const pressure = doc.workerContextPressureRecall || doc.worker_context_pressure_recall || {};
        const pressureUsage = doc.workerContextPressureUsage || doc.worker_context_pressure_usage || {};
        const pressureFeedbackPolicy = doc.workerContextPressureFeedbackPolicy || doc.worker_context_pressure_feedback_policy || {};
        const pressureUsageMatches = Array.isArray(pressureUsage.matched) ? pressureUsage.matched : [];
        const primaryUsage = pressureUsageMatches.find(provenanceRequiresReceipt) || pressureUsageMatches[0] || {};
        const requiresMemoryProvenanceUsage = provenanceRequiresReceipt(doc) || pressureUsageMatches.some(provenanceRequiresReceipt);
        return {
            rel_path: doc.relPath || doc.rel_path || "",
            name: doc.name || "",
            type: doc.type || "",
            score: Number(doc.score || 0),
            pressure_adjustment: Number(pressure.adjustment || 0),
            pressure_status: pressure.pressure_status || scoring.pressure_status || "",
            kinds: Array.isArray(pressure.kinds) ? pressure.kinds.slice(0, 8) : [],
            pressure_usage_adjustment: Number(pressureUsage.adjustment || 0),
            pressure_feedback_policy_adjustment: Number(pressureFeedbackPolicy.adjustment || 0),
            pressure_feedback_policy_action: pressureFeedbackPolicy.action || "",
            pressure_feedback_policy_risk_doc: pressureFeedbackPolicy.risk_doc === true,
            pressure_feedback_policy_repair_first: pressureFeedbackPolicy.repair_first === true,
            pressure_usage_recommendation: primaryUsage.recommendation || "",
            pressure_usage_matches: pressureUsageMatches.slice(0, 4).map((match) => ({
                rel_path: match.rel_path || match.relPath || doc.relPath || doc.rel_path || "",
                name: match.name || doc.name || "",
                target_project: match.target_project || match.targetProject || "",
                recommendation: match.recommendation || "",
                hint_scope: match.hint_scope || match.hintScope || "",
                provenance_status: match.provenance_status || match.provenanceStatus || "",
                repair_work_item_id: match.repair_work_item_id || match.repairWorkItemId || "",
                repair_status: match.repair_status || match.repairStatus || "",
                repair_gap_type: match.repair_gap_type || match.repairGapType || "",
                repair_open: match.repair_open === true || match.repairOpen === true,
                source_group_count: Number(match.source_group_count || match.sourceGroupCount || 0),
            })),
            provenance_status: primaryUsage.provenance_status || primaryUsage.provenanceStatus || "",
            repair_work_item_id: primaryUsage.repair_work_item_id || primaryUsage.repairWorkItemId || "",
            repair_status: primaryUsage.repair_status || primaryUsage.repairStatus || "",
            repair_gap_type: primaryUsage.repair_gap_type || primaryUsage.repairGapType || "",
            requires_memory_provenance_usage: requiresMemoryProvenanceUsage,
        };
    });
    return {
        schema: "ccm-worker-context-packet-typed-memory-pressure-recall-v1",
        active: scoring.active === true || docs.length > 0,
        pressure_status: scoring.pressure_status || "",
        boosted_count: docs.length,
        recalled_count: Array.isArray(recall?.recalled) ? recall.recalled.length : 0,
        pressure_feedback_policy_scoring: feedbackPolicyScoring?.schema ? feedbackPolicyScoring : null,
        docs: docs.slice(0, 12),
    };
}
function readReplayRepairDispatchPlanLedgerForCoordinator(groupId, groupSessionId = "") {
    return require("./group-orchestrator-replay-repair").readReplayRepairDispatchPlanLedgerForCoordinator(groupId, groupSessionId);
}
function readReplayRepairDispatchBindingLedgerForCoordinator(groupId) {
    return require("./group-orchestrator-replay-repair").readReplayRepairDispatchBindingLedgerForCoordinator(groupId);
}
function recordWorkerContextPacketAssignmentBindingForCoordinator(groupId, assignment = {}, options = {}) {
    return require("./group-orchestrator-worker-context").recordWorkerContextPacketAssignmentBindingForCoordinator(groupId, assignment, options);
}
function providerSwitchBindingLedgerCountersForCoordinator(entries = []) {
    return {
        providerSwitchAdvisedCount: entries.filter((item) => item.provider_switch_ledger_state?.advised_alternative === true).length,
        providerSwitchApprovedCount: entries.filter((item) => item.provider_switch_ledger_state?.approved_switch === true).length,
        providerSwitchSessionBoundCount: entries.filter((item) => item.worker_context_provider_switch_session_binding?.status === "bound").length,
        providerSwitchExecutedCount: entries.filter((item) => !!item.provider_switch_ledger_state?.actually_executed_provider).length,
        providerSwitchExecutionPassedCount: entries.filter((item) => item.worker_context_provider_switch_execution_receipt?.status === "passed").length,
        providerSwitchExecutionFailedCount: entries.filter((item) => item.worker_context_provider_switch_execution_receipt?.status === "failed").length,
    };
}
function findWorkerContextBindingIndexForCoordinator(entries = [], input = {}) {
    const bindingId = String(input.binding_id || input.bindingId || "").trim();
    const assignmentId = String(input.assignment_id || input.assignmentId || "").trim();
    const dispatchKey = String(input.dispatch_key || input.dispatchKey || "").trim();
    const packetId = String(input.worker_context_packet_id || input.workerContextPacketId || "").trim();
    return entries.findIndex((entry) => {
        if (bindingId && String(entry.binding_id || "") === bindingId)
            return true;
        if (assignmentId && String(entry.assignment_id || "") === assignmentId)
            return true;
        if (dispatchKey && String(entry.dispatch_key || "") === dispatchKey)
            return true;
        return !!packetId && String(entry.worker_context_packet_id || "") === packetId;
    });
}
function recordWorkerContextProviderSwitchSessionBindingForCoordinator(groupId, input = {}, options = {}) {
    return require("./group-orchestrator-worker-context").recordWorkerContextProviderSwitchSessionBindingForCoordinator(groupId, input, options);
}
function recordWorkerContextProviderSwitchExecutionReceiptForCoordinator(groupId, input = {}, options = {}) {
    return require("./group-orchestrator-worker-context").recordWorkerContextProviderSwitchExecutionReceiptForCoordinator(groupId, input, options);
}
function recordWorkerContextProviderDispatchOverrideCompletionForCoordinator(groupId, input = {}, options = {}) {
    return require("./group-orchestrator-worker-context").recordWorkerContextProviderDispatchOverrideCompletionForCoordinator(groupId, input, options);
}
function readReplayRepairDispatchTimelineBindingLedgerForCoordinator(groupId) {
    return require("./group-orchestrator-replay-repair").readReplayRepairDispatchTimelineBindingLedgerForCoordinator(groupId);
}
function uniqueCoordinatorStrings(values = []) {
    return [...new Set((values || []).map((item) => String(item || "").trim()).filter(Boolean))];
}
exports.REPLAY_REPAIR_TIMELINE_REQUIRED_EVENTS_FOR_COORDINATOR = [
    "dispatch",
    "child_agent_start",
    "worker_handoff_ready",
    "task_agent_memory_context_snapshot",
    "child_agent_receipt",
];
function replayRepairWorkItemStatusForCoordinator(value) {
    const status = String(value || "").trim().toLowerCase();
    if (["in_progress", "running", "claimed", "dispatching"].includes(status))
        return "in_progress";
    if (["blocked", "needs_info", "needs_user", "waiting"].includes(status))
        return "blocked";
    if (["completed", "done", "resolved", "ok"].includes(status))
        return "completed";
    if (["cancelled", "canceled", "superseded"].includes(status))
        return "cancelled";
    return "pending";
}
function replayRepairWorkItemOpenForCoordinator(status) {
    return ["pending", "in_progress", "blocked"].includes(replayRepairWorkItemStatusForCoordinator(status));
}
exports.API_MICROCOMPACT_NATIVE_PROOF_REPAIR_SOURCES_FOR_COORDINATOR = new Set([
    "api_microcompact_native_apply_binding_repair",
    "api_microcompact_native_apply_provider_reproof",
]);
function isApiMicrocompactNativeProofRepairSourceForCoordinator(source) {
    return exports.API_MICROCOMPACT_NATIVE_PROOF_REPAIR_SOURCES_FOR_COORDINATOR.has(String(source || "").trim());
}
function isTimelineClosableNativeRepairSourceForCoordinator(source) {
    return String(source || "").trim() === "api_microcompact_native_apply_binding_repair";
}
function isProviderRankingProvenanceCompactRepairSourceForCoordinator(source) {
    return String(source || "").trim() === "worker_context_provider_ranking_provenance_compact_repair";
}
function isPostCompactReinjectionRepairForCoordinator(value = {}) {
    return String(value.source || "").trim() === "compact_boundary_replay_repair"
        && String(value.component || "").trim() === "post_compact_reinject";
}
function replayRepairWorkItemStatsForCoordinator(items = []) {
    const normalized = (Array.isArray(items) ? items : []).map((item) => replayRepairWorkItemStatusForCoordinator(item.status));
    return {
        total: normalized.length,
        openItemCount: normalized.filter(status => replayRepairWorkItemOpenForCoordinator(status)).length,
        pendingCount: normalized.filter(status => status === "pending").length,
        inProgressCount: normalized.filter(status => status === "in_progress").length,
        blockedCount: normalized.filter(status => status === "blocked").length,
        completedCount: normalized.filter(status => status === "completed").length,
        cancelledCount: normalized.filter(status => status === "cancelled").length,
    };
}
function readReplayRepairWorkItemLedgerForCoordinator(groupId) {
    return require("./group-orchestrator-replay-repair").readReplayRepairWorkItemLedgerForCoordinator(groupId);
}
function writeReplayRepairWorkItemLedgerForCoordinator(groupId, items = [], at = new Date().toISOString(), extra = {}) {
    const ledger = readReplayRepairWorkItemLedgerForCoordinator(groupId);
    const next = {
        ...ledger,
        ...extra,
        schema: ledger.schema || "ccm-compact-boundary-replay-repair-work-items-v1",
        version: ledger.version || 1,
        groupId: ledger.groupId || groupId,
        file: ledger.file || (0, group_orchestrator_coded_part_01_1.getReplayRepairWorkItemsFileForCoordinator)(groupId),
        items: items.slice(-160),
        stats: replayRepairWorkItemStatsForCoordinator(items),
        updatedAt: at,
    };
    (0, group_orchestrator_coded_part_01_1.writeJsonAtomicForCoordinator)(next.file, next);
    return next;
}
function providerDispatchOverrideFollowupWorkItemIdForCoordinator(groupId, entry = {}) {
    const decision = entry.worker_context_provider_dispatch_decision || entry.provider_dispatch_decision || {};
    const overrideReceipt = entry.worker_context_provider_dispatch_override_receipt
        || decision.provider_dispatch_override_receipt
        || decision.override
        || {};
    return `provider-dispatch-override-followup:${(0, group_orchestrator_coded_part_01_1.hashCoordinator)([
        groupId,
        decision.decision_id || "",
        overrideReceipt.override_id || "",
        entry.assignment_id || "",
        entry.worker_context_packet_id || "",
    ], 14)}`;
}
function syncProviderDispatchOverrideFollowupRepairWorkItemForCoordinator(groupId, entry = {}, at = new Date().toISOString()) {
    const decision = entry.worker_context_provider_dispatch_decision || entry.provider_dispatch_decision || {};
    if (!groupId || decision.action !== "dispatch_with_provider_override")
        return null;
    const overrideReceipt = entry.worker_context_provider_dispatch_override_receipt
        || decision.provider_dispatch_override_receipt
        || decision.override
        || {};
    if (overrideReceipt?.valid !== true)
        return null;
    const ledger = readReplayRepairWorkItemLedgerForCoordinator(groupId);
    const items = Array.isArray(ledger.items) ? [...ledger.items] : [];
    const workItemId = providerDispatchOverrideFollowupWorkItemIdForCoordinator(groupId, entry);
    const evidence = [
        `decision_id=${decision.decision_id || ""}`,
        `override_id=${overrideReceipt.override_id || ""}`,
        `assignment_id=${entry.assignment_id || ""}`,
        `worker_context_packet_id=${entry.worker_context_packet_id || ""}`,
    ].filter(Boolean);
    const draft = {
        schema: "ccm-provider-dispatch-override-followup-repair-work-item-v1",
        id: workItemId,
        work_item_id: workItemId,
        source: "worker_context_pressure_provenance_provider_dispatch_override_followup",
        component: "worker_context_pressure_provenance_provider_dispatch_override",
        status: "pending",
        priority: "high",
        groupId,
        project: entry.project || decision.project || "",
        agent_type: entry.agent_type || decision.agent_type || "unknown",
        assignment_id: entry.assignment_id || "",
        dispatch_key: entry.dispatch_key || "",
        worker_context_packet_id: entry.worker_context_packet_id || "",
        decision_id: decision.decision_id || "",
        override_id: overrideReceipt.override_id || "",
        repair_target: "pressure_provenance_provider_override_followup",
        expected: "child Agent completion receipt must include memoryProvenanceUsage rows with currentSourceVerified=true after provider override dispatch",
        prompt_patch: "因为本次 provider hold 被用户结构化 override 放行，完成回执必须补强 memoryProvenanceUsage/currentSourceVerified=true，并说明后续 pressure provenance repair/recovery 证据。",
        reason: decision.reason || overrideReceipt.reason || "provider dispatch override requires follow-up pressure provenance repair evidence",
        evidence: uniqueCoordinatorStrings(evidence).slice(0, 24),
        blockers: [],
        needs: ["等待 override 子 Agent 完成回执补强 memoryProvenanceUsage/currentSourceVerified=true"],
        createdAt: at,
        updatedAt: at,
    };
    const existingIndex = items.findIndex((item) => String(item.work_item_id || item.id || "") === workItemId);
    if (existingIndex >= 0) {
        const existing = items[existingIndex];
        items[existingIndex] = {
            ...existing,
            ...draft,
            status: replayRepairWorkItemOpenForCoordinator(existing.status) ? existing.status || "pending" : existing.status,
            createdAt: existing.createdAt || existing.created_at || draft.createdAt,
            evidence: uniqueCoordinatorStrings([...(Array.isArray(existing.evidence) ? existing.evidence : []), ...draft.evidence]).slice(-24),
            needs: replayRepairWorkItemOpenForCoordinator(existing.status) ? uniqueCoordinatorStrings([...(Array.isArray(existing.needs) ? existing.needs : []), ...draft.needs]).slice(-12) : [],
            updatedAt: at,
        };
    }
    else {
        items.push(draft);
    }
    const next = writeReplayRepairWorkItemLedgerForCoordinator(groupId, items, at, {
        latestProviderDispatchOverrideFollowup: {
            work_item_id: workItemId,
            decision_id: decision.decision_id || "",
            override_id: overrideReceipt.override_id || "",
            assignment_id: entry.assignment_id || "",
            at,
        },
    });
    return {
        schema: "ccm-provider-dispatch-override-followup-repair-work-item-ref-v1",
        work_item_id: workItemId,
        file: next.file,
        status: (next.items || []).find((item) => String(item.work_item_id || item.id || "") === workItemId)?.status || "pending",
        source: "worker_context_pressure_provenance_provider_dispatch_override_followup",
    };
}
function pressureProvenanceUsageRowsFromReceiptForCoordinator(receipt = {}) {
    return [
        ...(Array.isArray(receipt.memoryProvenanceUsage) ? receipt.memoryProvenanceUsage : []),
        ...(Array.isArray(receipt.memory_provenance_usage) ? receipt.memory_provenance_usage : []),
        ...(Array.isArray(receipt.pressureMemoryProvenanceUsage) ? receipt.pressureMemoryProvenanceUsage : []),
        ...(Array.isArray(receipt.pressure_memory_provenance_usage) ? receipt.pressure_memory_provenance_usage : []),
    ].filter((row) => row && typeof row === "object");
}
function buildProviderDispatchOverrideCompletionForCoordinator(entry = {}, input = {}, at = new Date().toISOString()) {
    const receipt = input.receipt || input.ccm_receipt || input.delivery_summary || {};
    const rows = pressureProvenanceUsageRowsFromReceiptForCoordinator(receipt);
    const verifiedRows = rows.filter((row) => row.currentSourceVerified === true || row.current_source_verified === true);
    const receiptStatus = String(input.receipt_status || input.receiptStatus || receipt.status || "").trim().toLowerCase();
    const statusDone = ["done", "completed", "ok", "success"].includes(receiptStatus);
    const completionOk = statusDone && rows.length > 0 && verifiedRows.length === rows.length;
    const decision = entry.worker_context_provider_dispatch_decision || entry.provider_dispatch_decision || {};
    const overrideReceipt = entry.worker_context_provider_dispatch_override_receipt
        || decision.provider_dispatch_override_receipt
        || decision.override
        || {};
    return {
        schema: "ccm-worker-context-provider-dispatch-override-completion-v1",
        completion_id: `provider-dispatch-override-completion:${(0, group_orchestrator_coded_part_01_1.hashCoordinator)([
            entry.binding_id || "",
            entry.assignment_id || "",
            entry.worker_context_packet_id || "",
            input.task_id || input.taskId || "",
            input.execution_id || input.executionId || "",
        ], 14)}`,
        status: completionOk ? "completed" : "needs_repair",
        groupId: entry.groupId || input.groupId || input.group_id || "",
        project: entry.project || input.project || "",
        agent_type: entry.agent_type || input.agent_type || input.agentType || "unknown",
        binding_id: entry.binding_id || "",
        assignment_id: entry.assignment_id || input.assignment_id || input.assignmentId || "",
        dispatch_key: entry.dispatch_key || input.dispatch_key || input.dispatchKey || "",
        worker_context_packet_id: entry.worker_context_packet_id || input.worker_context_packet_id || input.workerContextPacketId || "",
        decision_id: decision.decision_id || "",
        override_id: overrideReceipt.override_id || "",
        followup_work_item_id: entry.worker_context_provider_dispatch_override_followup_repair?.work_item_id
            || entry.provider_dispatch_override_followup_repair_work_item?.work_item_id
            || "",
        task_id: input.task_id || input.taskId || "",
        worker_handoff_id: input.worker_handoff_id || input.workerHandoffId || "",
        task_agent_session_id: input.task_agent_session_id || input.taskAgentSessionId || "",
        native_session_id: input.native_session_id || input.nativeSessionId || "",
        execution_id: input.execution_id || input.executionId || "",
        memory_context_snapshot_id: input.memory_context_snapshot_id || input.memoryContextSnapshotId || "",
        memory_context_snapshot_checksum: input.memory_context_snapshot_checksum || input.memoryContextSnapshotChecksum || "",
        receipt_status: receiptStatus,
        receipt,
        memory_provenance_usage_count: rows.length,
        current_source_verified_count: verifiedRows.length,
        completion_ok: completionOk,
        reason: completionOk
            ? "override child-agent completion receipt supplied verified memoryProvenanceUsage follow-up evidence"
            : "override child-agent completion receipt missing verified memoryProvenanceUsage follow-up evidence",
        at,
    };
}
function providerOverrideFollowupContractStringListForCoordinator(value, limit = 16) {
    const raw = Array.isArray(value)
        ? value
        : value === undefined || value === null || value === "" ? [] : [value];
    const out = [];
    const seen = new Set();
    for (const item of raw) {
        const text = String(item || "").trim();
        const key = text.toLowerCase();
        if (!text || seen.has(key))
            continue;
        seen.add(key);
        out.push(text);
        if (out.length >= limit)
            break;
    }
    return out;
}
function providerOverrideFollowupContractReceiptRowValueForCoordinator(row = {}, keys = []) {
    for (const key of keys) {
        const value = row[key];
        if (value !== undefined && value !== null && String(value || "").trim())
            return String(value || "").trim();
    }
    return "";
}
function providerOverrideFollowupContractReceiptRowReverifiedForCoordinator(row = {}) {
    return row.providerDispatchOverrideFollowupHistoryReverified === true
        || row.provider_dispatch_override_followup_history_reverified === true
        || row.providerOverrideFollowupHistoryReverified === true
        || row.provider_override_followup_history_reverified === true;
}
function providerOverrideFollowupContractReceiptRowMatchesForCoordinator(row = {}, kind, value) {
    const target = String(value || "").trim().toLowerCase();
    if (!target)
        return false;
    if (kind === "rel_path") {
        return providerOverrideFollowupContractReceiptRowValueForCoordinator(row, ["relPath", "rel_path", "path", "memoryRelPath", "memory_rel_path"]).toLowerCase() === target;
    }
    if (kind === "work_item") {
        return providerOverrideFollowupContractReceiptRowValueForCoordinator(row, ["repairWorkItemId", "repair_work_item_id", "workItemId", "work_item_id"]).toLowerCase() === target;
    }
    if (kind === "override") {
        return providerOverrideFollowupContractReceiptRowValueForCoordinator(row, ["providerDispatchOverrideId", "provider_dispatch_override_id", "overrideId", "override_id"]).toLowerCase() === target;
    }
    return false;
}
//# sourceMappingURL=group-orchestrator-coded-part-03.js.map