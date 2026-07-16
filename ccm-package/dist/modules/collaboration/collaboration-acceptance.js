"use strict";
// Extracted functional module. The original entry remains a compatibility facade.
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
exports.evaluateReceiptTaskAgentMemoryContextSnapshot = evaluateReceiptTaskAgentMemoryContextSnapshot;
exports.evaluateReceiptReadPlanRevalidationGate = evaluateReceiptReadPlanRevalidationGate;
exports.scoreChildAgentReceipt = scoreChildAgentReceipt;
exports.buildIndependentReviewGate = buildIndependentReviewGate;
exports.buildAcceptanceGate = buildAcceptanceGate;
exports.selectLatestDurableReceipts = selectLatestDurableReceipts;
exports.buildDeliverySummary = buildDeliverySummary;
exports.getTaskExecutionFromReceipt = getTaskExecutionFromReceipt;
exports.buildEvidenceGateFollowUps = buildEvidenceGateFollowUps;
exports.buildIndependentReviewGateFollowUps = buildIndependentReviewGateFollowUps;
exports.buildFailedIndependentReviewReworkFollowUps = buildFailedIndependentReviewReworkFollowUps;
exports.testAgentDecisionReceiptStatus = testAgentDecisionReceiptStatus;
exports.buildNativeTestAgentReceipt = buildNativeTestAgentReceipt;
exports.buildNativeTestAgentPlanBlockedReceipt = buildNativeTestAgentPlanBlockedReceipt;
exports.runtimeToolDispatchBlockedReceipt = runtimeToolDispatchBlockedReceipt;
exports.canCompleteDailyDevFromDeliverySummary = canCompleteDailyDevFromDeliverySummary;
exports.buildTaskGapContinuationDraft = buildTaskGapContinuationDraft;
exports.getTaskGapItems = getTaskGapItems;
exports.getTaskGapFingerprint = getTaskGapFingerprint;
exports.canAutoContinueTaskGaps = canAutoContinueTaskGaps;
const crypto = __importStar(require("crypto"));
const db_1 = require("../../core/db");
const group_orchestrator_1 = require("./group-orchestrator");
const display_1 = require("./display");
const memory_1 = require("./memory");
const group_memory_index_1 = require("./group-memory-index");
const agent_qa_service_1 = require("./agent-qa-service");
const task_delivery_report_1 = require("./task-delivery-report");
const post_review_spot_check_1 = require("../../agents/post-review-spot-check");
const agent_receipts_1 = require("./agent-receipts");
const agent_notifications_1 = require("./agent-notifications");
const logs_1 = require("./logs");
const storage_1 = require("./storage");
const execution_kernel_1 = require("../../agents/execution-kernel");
const agent_sessions_1 = require("../../tasks/agent-sessions");
const reasoning_loop_1 = require("../../agents/reasoning-loop");
const protocol_gates_1 = require("./protocol-gates");
const runtime_kernel_1 = require("../../agents/runtime-kernel");
const work_items_1 = require("../../agents/work-items");
const collaboration_1 = require("./collaboration");
function evaluateReceiptTaskAgentMemoryContextSnapshot(task, receipt = {}, context = {}) {
    const snapshots = (0, collaboration_1.getTaskAgentMemoryContextSnapshotSources)(context).map(collaboration_1.summarizeTaskAgentMemoryContextSnapshot);
    const agent = (0, collaboration_1.normalizeMemoryGateAgent)(receipt.agent || receipt.project || task?.target_project);
    const receiptTaskSessionId = String(receipt.task_agent_session_id || receipt.taskAgentSessionId || "").trim();
    const receiptSnapshotId = String(receipt.memory_context_snapshot_id || receipt.memoryContextSnapshotId || "").trim();
    const receiptSnapshotChecksum = String(receipt.memory_context_snapshot_checksum || receipt.memoryContextSnapshotChecksum || "").trim();
    const declaredUsage = receipt.agentMemoryContextUsage
        || receipt.agent_memory_context_usage
        || receipt.memoryContextUsage
        || receipt.memory_context_usage
        || null;
    const declaredBindingId = String(declaredUsage?.bindingId || declaredUsage?.binding_id || "").trim();
    const declaredGroupSessionId = String(declaredUsage?.groupSessionId || declaredUsage?.group_session_id || "").trim();
    const declaredSessionMemoryChecksum = String(declaredUsage?.sessionMemoryChecksum || declaredUsage?.session_memory_checksum || "").trim();
    const declaredModelExtractionExecutionId = String(declaredUsage?.modelExtractionExecutionId || declaredUsage?.model_extraction_execution_id || "").trim();
    const declaredModelExtractionReplayStatus = String(declaredUsage?.modelExtractionReplayStatus || declaredUsage?.model_extraction_replay_status || "").trim();
    const declaredFactSupersessionGraphChecksum = String(declaredUsage?.factSupersessionGraphChecksum || declaredUsage?.fact_supersession_graph_checksum || "").trim();
    const declaredUsageState = String(declaredUsage?.usageState || declaredUsage?.usage_state || "").trim().toLowerCase();
    const declaredReason = String(declaredUsage?.reason || "").trim();
    const declaredFactCitations = Array.isArray(receipt.memoryFactCitations || receipt.memory_fact_citations)
        ? (receipt.memoryFactCitations || receipt.memory_fact_citations)
        : [];
    const matchingAgent = snapshots.filter((snapshot) => {
        const target = (0, collaboration_1.normalizeMemoryGateAgent)(snapshot.project);
        return !target || !agent || target === agent;
    });
    const evaluated = matchingAgent.map((snapshot) => {
        const sessionId = String(snapshot.task_agent_session_id || "").trim();
        const binding = snapshot.group_session_memory_binding || {};
        const delivery = snapshot.delivery_receipt || {};
        const systemSessionBound = !!receiptTaskSessionId && sessionId === receiptTaskSessionId;
        const systemSnapshotBound = !!receiptSnapshotId && snapshot.snapshot_id === receiptSnapshotId;
        const systemChecksumBound = !!receiptSnapshotChecksum && snapshot.checksum === receiptSnapshotChecksum;
        const deliveryBound = delivery?.delivered === true
            && delivery?.status === "delivered"
            && snapshot.delivery_receipt_checksum_valid === true
            && String(delivery.taskAgentSessionId || "") === sessionId
            && String(delivery.memoryContextSnapshotId || "") === String(snapshot.snapshot_id || "")
            && String(delivery.memoryContextSnapshotChecksum || "") === String(snapshot.checksum || "")
            && String(delivery.groupSessionMemoryBinding?.scopeId || "") === String(snapshot.group_session_scope_id || binding.scopeId || "")
            && String(delivery.groupSessionMemoryBinding?.checksum || "") === String(binding.checksum || "")
            && String(delivery.groupSessionMemoryBindingChecksum || "") === String(binding.checksum || "")
            && delivery.modelExtractionEvidenceValid !== false;
        const bindingIdMatches = !!declaredBindingId && declaredBindingId === String(snapshot.memory_binding_id || binding.memoryBindingId || "");
        const groupSessionMatches = !!declaredGroupSessionId && declaredGroupSessionId === String(snapshot.group_session_id || binding.groupSessionId || "");
        const expectedSessionMemoryChecksum = String(snapshot.session_memory_checksum || binding.sessionMemoryChecksum || "");
        const sessionMemoryChecksumMatches = expectedSessionMemoryChecksum
            ? declaredSessionMemoryChecksum === expectedSessionMemoryChecksum
            : declaredSessionMemoryChecksum === "";
        const expectedModelExtractionExecutionId = String(binding.modelExtractionExecutionId || binding.model_extraction_execution_id || "").trim();
        const expectedModelExtractionReplayStatus = String(binding.modelExtractionReplayStatus || binding.model_extraction_replay_status || "").trim();
        const expectedFactSupersessionGraphChecksum = String(binding.factSupersessionGraphChecksum || binding.fact_supersession_graph_checksum || "").trim();
        const modelExtractionExecutionMatches = declaredModelExtractionExecutionId === expectedModelExtractionExecutionId;
        const modelExtractionReplayStatusMatches = declaredModelExtractionReplayStatus === expectedModelExtractionReplayStatus;
        const factSupersessionGraphChecksumMatches = declaredFactSupersessionGraphChecksum === expectedFactSupersessionGraphChecksum;
        const modelExtractionEvidencePass = binding.modelExtractionEvidenceRequired !== true || (binding.modelExtractionEvidenceValid === true
            && binding.deliveryReady !== false
            && String(binding.modelExtractionReplayExecutionId || binding.model_extraction_replay_execution_id || "") === expectedModelExtractionExecutionId
            && expectedModelExtractionReplayStatus === "verified"
            && modelExtractionExecutionMatches
            && modelExtractionReplayStatusMatches
            && factSupersessionGraphChecksumMatches);
        const usageStateValid = ["used", "verified", "ignored"].includes(declaredUsageState);
        const declarationCoherent = declaredUsageState === "ignored"
            ? Array.isArray(receipt.memoryIgnored || receipt.memory_ignored) && (receipt.memoryIgnored || receipt.memory_ignored).length > 0
            : Array.isArray(receipt.memoryUsed || receipt.memory_used) && (receipt.memoryUsed || receipt.memory_used).length > 0;
        const expectedSectionEvidence = Array.isArray(binding.sessionMemorySectionEvidence || binding.session_memory_section_evidence)
            ? (binding.sessionMemorySectionEvidence || binding.session_memory_section_evidence)
            : [];
        const expectedEvidenceById = new Map(expectedSectionEvidence.map((item) => [
            String(item?.evidenceId || item?.evidence_id || "").trim(),
            item,
        ]).filter(([id]) => !!id));
        const expectedActiveFacts = Array.isArray(binding.activeFacts || binding.active_facts)
            ? (binding.activeFacts || binding.active_facts)
            : [];
        const expectedActiveFactById = new Map(expectedActiveFacts.map((fact) => [
            String(fact?.factId || fact?.fact_id || "").trim(),
            fact,
        ]).filter(([id]) => !!id));
        const activeFactMessageIds = new Set((0, collaboration_1.uniqueStrings)(expectedActiveFacts.map((fact) => fact?.sourceMessageId || fact?.source_message_id || "")));
        const evaluatedFactCitations = declaredFactCitations.map((citation) => {
            const evidenceId = String(citation?.evidenceId || citation?.evidence_id || "").trim();
            const expected = expectedEvidenceById.get(evidenceId) || null;
            const section = String(citation?.section || "").trim();
            const sectionChecksum = String(citation?.sectionChecksum || citation?.section_checksum || "").trim();
            const sourceTranscriptChecksum = String(citation?.sourceTranscriptChecksum || citation?.source_transcript_checksum || "").trim();
            const sourceMessageIds = (0, collaboration_1.uniqueStrings)(citation?.sourceMessageIds || citation?.source_message_ids || []).slice(0, 40);
            const usage = String(citation?.usage || citation?.reason || "").trim();
            const factId = String(citation?.factId || citation?.fact_id || "").trim();
            const factChecksum = String(citation?.factChecksum || citation?.fact_checksum || "").trim();
            const expectedActiveFact = expectedActiveFactById.get(factId) || null;
            const sectionMatches = !!expected && section === String(expected.section || "").trim();
            const sectionChecksumMatches = !!expected && sectionChecksum === String(expected.sectionChecksum || expected.section_checksum || "").trim();
            const expectedSourceChecksum = String(expected?.sourceTranscriptChecksum || expected?.source_transcript_checksum || "").trim();
            const sourceTranscriptChecksumMatches = !!expected && (!expectedSourceChecksum || sourceTranscriptChecksum === expectedSourceChecksum);
            const expectedSourceMessageIds = new Set((0, collaboration_1.uniqueStrings)(expected?.sourceMessageIds || expected?.source_message_ids || []));
            const sourceMessageIdsRequired = expectedSourceMessageIds.size > 0;
            const sourceMessageIdsMatch = !sourceMessageIdsRequired
                || (sourceMessageIds.length > 0 && sourceMessageIds.every((messageId) => expectedSourceMessageIds.has(messageId)));
            const referencesActiveFactSource = sourceMessageIds.some((messageId) => activeFactMessageIds.has(messageId));
            const activeFactBindingRequired = !!factId || !!factChecksum || referencesActiveFactSource;
            const activeFactBindingMatches = !activeFactBindingRequired || (!!expectedActiveFact
                && factId === String(expectedActiveFact.factId || expectedActiveFact.fact_id || "")
                && factChecksum === String(expectedActiveFact.factChecksum || expectedActiveFact.fact_checksum || ""));
            return {
                evidence_id: evidenceId,
                section,
                section_checksum: sectionChecksum,
                source_transcript_checksum: sourceTranscriptChecksum,
                source_message_ids: sourceMessageIds,
                usage,
                fact_id: factId,
                fact_checksum: factChecksum,
                active_fact_binding_required: activeFactBindingRequired,
                active_fact_binding_matches: activeFactBindingMatches,
                known_evidence: !!expected,
                section_matches: sectionMatches,
                section_checksum_matches: sectionChecksumMatches,
                source_transcript_checksum_matches: sourceTranscriptChecksumMatches,
                source_message_ids_required: sourceMessageIdsRequired,
                source_message_ids_match: sourceMessageIdsMatch,
                pass: !!expected && sectionMatches && sectionChecksumMatches && sourceTranscriptChecksumMatches && sourceMessageIdsMatch && activeFactBindingMatches && !!usage,
            };
        });
        const citationsRequired = expectedSectionEvidence.length > 0 && ["used", "verified"].includes(declaredUsageState);
        const factCitationsPass = declaredUsageState === "ignored"
            ? declaredFactCitations.length === 0
            : !citationsRequired || (evaluatedFactCitations.length > 0 && evaluatedFactCitations.every((item) => item.pass));
        const pass = systemSessionBound
            && systemSnapshotBound
            && systemChecksumBound
            && deliveryBound
            && bindingIdMatches
            && groupSessionMatches
            && sessionMemoryChecksumMatches
            && modelExtractionExecutionMatches
            && modelExtractionReplayStatusMatches
            && factSupersessionGraphChecksumMatches
            && modelExtractionEvidencePass
            && usageStateValid
            && declarationCoherent
            && factCitationsPass
            && !!declaredReason;
        return {
            ...snapshot,
            pass,
            system_session_bound: systemSessionBound,
            system_snapshot_bound: systemSnapshotBound,
            system_checksum_bound: systemChecksumBound,
            delivery_bound: deliveryBound,
            binding_id_matches: bindingIdMatches,
            group_session_matches: groupSessionMatches,
            session_memory_checksum_matches: sessionMemoryChecksumMatches,
            model_extraction_execution_matches: modelExtractionExecutionMatches,
            model_extraction_replay_status_matches: modelExtractionReplayStatusMatches,
            fact_supersession_graph_checksum_matches: factSupersessionGraphChecksumMatches,
            model_extraction_evidence_passed: modelExtractionEvidencePass,
            usage_state_valid: usageStateValid,
            declaration_coherent: declarationCoherent,
            memory_fact_citations_required: citationsRequired,
            memory_fact_citations_passed: factCitationsPass,
            memory_fact_citations: evaluatedFactCitations,
            available_memory_section_evidence_count: expectedSectionEvidence.length,
        };
    });
    const bound = evaluated.filter((snapshot) => snapshot.pass === true);
    const required = matchingAgent.length > 0;
    const pass = !required || bound.length > 0;
    return {
        schema: "ccm-task-agent-memory-context-consumption-validation-v4",
        required,
        pass,
        snapshot_ids: matchingAgent.map((snapshot) => snapshot.snapshot_id).filter(Boolean),
        matched_snapshot_ids: bound.map((snapshot) => snapshot.snapshot_id).filter(Boolean),
        missing_snapshot_ids: pass ? [] : matchingAgent.map((snapshot) => snapshot.snapshot_id).filter(Boolean),
        task_agent_session_ids: matchingAgent.map((snapshot) => snapshot.task_agent_session_id).filter(Boolean),
        receipt_task_agent_session_id: receiptTaskSessionId,
        receipt_memory_context_snapshot_id: receiptSnapshotId,
        receipt_memory_context_snapshot_checksum: receiptSnapshotChecksum,
        declared_usage: declaredUsage,
        declared_binding_id: declaredBindingId,
        declared_group_session_id: declaredGroupSessionId,
        declared_session_memory_checksum: declaredSessionMemoryChecksum,
        declared_model_extraction_execution_id: declaredModelExtractionExecutionId,
        declared_model_extraction_replay_status: declaredModelExtractionReplayStatus,
        declared_fact_supersession_graph_checksum: declaredFactSupersessionGraphChecksum,
        declared_usage_state: declaredUsageState,
        declared_memory_fact_citations: declaredFactCitations,
        memory_fact_citations_required: evaluated.some((snapshot) => snapshot.memory_fact_citations_required === true),
        memory_fact_citations_passed: !required || evaluated.some((snapshot) => snapshot.pass === true && snapshot.memory_fact_citations_passed === true),
        system_delivery_required: required,
        system_delivery_passed: evaluated.some((snapshot) => snapshot.delivery_bound === true
            && snapshot.system_session_bound === true
            && snapshot.system_snapshot_bound === true
            && snapshot.system_checksum_bound === true),
        agent_declaration_required: required,
        agent_declaration_passed: evaluated.some((snapshot) => snapshot.binding_id_matches === true
            && snapshot.group_session_matches === true
            && snapshot.session_memory_checksum_matches === true
            && snapshot.model_extraction_execution_matches === true
            && snapshot.model_extraction_replay_status_matches === true
            && snapshot.fact_supersession_graph_checksum_matches === true
            && snapshot.model_extraction_evidence_passed === true
            && snapshot.usage_state_valid === true
            && snapshot.declaration_coherent === true
            && snapshot.memory_fact_citations_passed === true
            && !!declaredReason),
        gate_ids: (0, collaboration_1.uniqueStrings)(...matchingAgent.map((snapshot) => snapshot.gate_ids || [])).slice(0, 80),
        matched_gate_ids: (0, collaboration_1.uniqueStrings)(...bound.map((snapshot) => snapshot.gate_ids || [])).slice(0, 80),
        rows: evaluated,
    };
}
function evaluateReceiptReadPlanRevalidationGate(task, receipt = {}, context = {}) {
    const allGates = Array.isArray(context.readPlanRevalidationGates || context.read_plan_revalidation_gates)
        ? (context.readPlanRevalidationGates || context.read_plan_revalidation_gates)
        : (0, collaboration_1.collectTaskReadPlanRevalidationGates)(task, context);
    const agent = (0, collaboration_1.normalizeMemoryGateAgent)(receipt.agent || receipt.project || task?.target_project);
    const matchingCandidates = allGates.filter((gate) => {
        const target = (0, collaboration_1.normalizeMemoryGateAgent)(gate.target_project);
        return (!target || !agent || target === agent) && (Number(gate.required_count || 0) > 0 || Number(gate.verification_count || 0) > 0);
    });
    const used = Array.isArray(receipt.memoryUsed || receipt.memory_used) ? (receipt.memoryUsed || receipt.memory_used) : [];
    const ignored = Array.isArray(receipt.memoryIgnored || receipt.memory_ignored) ? (receipt.memoryIgnored || receipt.memory_ignored) : [];
    const structuredUsageRows = Array.isArray(receipt.readPlanRevalidationUsage || receipt.read_plan_revalidation_usage)
        ? (receipt.readPlanRevalidationUsage || receipt.read_plan_revalidation_usage)
        : [];
    const structuredUsageText = structuredUsageRows.map((row) => [
        row.gateId || row.gate_id || row.revalidationGateId || row.revalidation_gate_id ? `revalidation_gate_id=${row.gateId || row.gate_id || row.revalidationGateId || row.revalidation_gate_id}` : "",
        row.readPlanId || row.read_plan_id ? `read_plan_id=${row.readPlanId || row.read_plan_id}` : "",
        row.referenceId || row.reference_id ? `reference_id=${row.referenceId || row.reference_id}` : "",
        row.currentSourceVerified === true || row.current_source_verified === true ? "current source verified" : "",
        row.ignored === true || row.ignored_with_reason === true || row.usageState === "ignored" || row.usage_state === "ignored" ? `ignored ${row.reason || ""}` : "",
    ].filter(Boolean).join("; ")).join("\n");
    const usedText = used.map((item) => String(item || "")).join("\n");
    const ignoredText = ignored.map((item) => String(item || "")).join("\n");
    const receiptActions = Array.isArray(receipt.actions) ? receipt.actions.map((item) => String(item || "")) : [];
    const actionText = receiptActions.join("\n");
    const declarationText = [usedText, ignoredText, structuredUsageText, receipt.summary, actionText, ...(Array.isArray(receipt.verification) ? receipt.verification : [])].map((item) => String(item || "")).join("\n");
    const receiptTaskSessionId = String(receipt.task_agent_session_id || receipt.taskAgentSessionId || structuredUsageRows.find((row) => row.task_agent_session_id || row.taskAgentSessionId)?.task_agent_session_id || structuredUsageRows.find((row) => row.task_agent_session_id || row.taskAgentSessionId)?.taskAgentSessionId || "").trim();
    const receiptNativeSessionId = String(receipt.native_session_id || receipt.nativeSessionId || structuredUsageRows.find((row) => row.native_session_id || row.nativeSessionId)?.native_session_id || structuredUsageRows.find((row) => row.native_session_id || row.nativeSessionId)?.nativeSessionId || "").trim();
    const boundSessionCandidates = receiptTaskSessionId
        ? matchingCandidates.filter((gate) => !gate.task_agent_session_id || String(gate.task_agent_session_id) === receiptTaskSessionId)
        : [];
    const sessionCandidates = receiptTaskSessionId && boundSessionCandidates.length
        ? boundSessionCandidates
        : matchingCandidates;
    const latestTurn = Math.max(0, ...sessionCandidates.map((gate) => Number(gate.turn || 0)));
    const matching = latestTurn > 0
        ? sessionCandidates.filter((gate) => Number(gate.turn || 0) === latestTurn)
        : sessionCandidates;
    const hasVerifiedSignal = /(re[\s_-]?read|reread|current source verified|verified current source|current source|source verified|latest source|current file|current checksum|重新读取|重读|当前源|当前文件|最新源|重新核验|重新核对|已核验|已验证|校验当前)/i.test(declarationText);
    const hasIgnoredSignal = /(memoryignored|memory ignored|ignored|ignore|skip|not used|not needed|unused|不使用|未使用|忽略|跳过|无需使用|缺失|不存在|missing)/i.test(ignoredText || declarationText);
    const hasBoundRevalidationShorthand = /(?:readPlanRevalidation|read_plan_revalidation|读取计划重读|读取计划复核)\s*[:=：]/i.test(declarationText);
    const hasConcreteCurrentSourceReadAction = receiptActions.some((action) => /(?:re[\s_-]?read|reread|重新读取|重读|读取)/i.test(action)
        && /(?:确认|核验|核对|验证|当前|最终|current|latest|verify|confirm)/i.test(action)
        && /(?:[\w@./\\-]+\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs|vue|json|yaml|yml|md|py|java|go|rs|cs|sql|prisma)|当前(?:源|文件)|source|file)/i.test(action));
    const changedFiles = Array.isArray(receipt.filesChanged || receipt.files_changed || receipt.files)
        ? (receipt.filesChanged || receipt.files_changed || receipt.files).map((item) => String(typeof item === "string" ? item : item?.path || item?.file || "")).filter(Boolean)
        : [];
    const hasConcreteCurrentSourceDiffEvidence = changedFiles.length > 0
        && receiptActions.some((action) => /git\s+diff/i.test(action) && /(?:确认|核验|核对|检查|verify|confirm|check)/i.test(action));
    const rows = matching.map((gate) => {
        const gateId = String(gate.gate_id || "").trim();
        const requiredIds = Array.isArray(gate.required_read_plan_ids) ? gate.required_read_plan_ids.filter(Boolean) : [];
        const expectedTaskSessionId = String(gate.task_agent_session_id || "").trim();
        const expectedNativeSessionId = String(gate.native_session_id || "").trim();
        const sessionRequired = !!(expectedTaskSessionId || expectedNativeSessionId);
        const taskSessionMatched = !expectedTaskSessionId || receiptTaskSessionId === expectedTaskSessionId;
        const nativeSessionMatched = !expectedNativeSessionId || receiptNativeSessionId === expectedNativeSessionId || !receiptNativeSessionId;
        const sessionMatched = taskSessionMatched && nativeSessionMatched;
        const boundShorthand = matching.length === 1 && structuredUsageRows.length === 0 && sessionMatched && hasBoundRevalidationShorthand;
        const boundActionEvidence = matching.length === 1
            && structuredUsageRows.length === 0
            && sessionMatched
            && (hasConcreteCurrentSourceReadAction || hasConcreteCurrentSourceDiffEvidence);
        const boundEvidence = boundShorthand || boundActionEvidence;
        const gateMentioned = (!!gateId && declarationText.includes(gateId)) || boundEvidence;
        const missingReadPlanIds = boundEvidence ? [] : requiredIds.filter((id) => !declarationText.includes(String(id || "")));
        const currentSourceVerified = gateMentioned
            && missingReadPlanIds.length === 0
            && (hasVerifiedSignal || boundActionEvidence);
        const ignoredWithReason = gateMentioned && missingReadPlanIds.length === 0 && hasIgnoredSignal;
        const pass = gateMentioned && missingReadPlanIds.length === 0 && sessionMatched && (currentSourceVerified || ignoredWithReason);
        return {
            gate_id: gateId,
            status: gate.status || "",
            required_read_plan_ids: requiredIds,
            missing_read_plan_ids: missingReadPlanIds,
            gate_mentioned: gateMentioned,
            current_source_verified: currentSourceVerified,
            ignored_with_reason: ignoredWithReason,
            session_required: sessionRequired,
            session_matched: sessionMatched,
            expected_task_agent_session_id: expectedTaskSessionId,
            receipt_task_agent_session_id: receiptTaskSessionId,
            expected_native_session_id: expectedNativeSessionId,
            receipt_native_session_id: receiptNativeSessionId,
            declaration_binding: boundShorthand
                ? "unique_gate_session_bound_shorthand"
                : boundActionEvidence
                    ? "unique_gate_session_bound_current_source_action"
                    : "explicit_ids",
            pass,
        };
    });
    const missing = rows.filter((row) => !row.pass);
    return {
        schema: "ccm-child-agent-read-plan-revalidation-gate-receipt-validation-v1",
        required: matching.length > 0,
        pass: matching.length === 0 || missing.length === 0,
        gate_ids: matching.map((gate) => gate.gate_id),
        missing_gate_ids: rows.filter((row) => !row.gate_mentioned).map((row) => row.gate_id),
        missing_read_plan_ids: (0, collaboration_1.uniqueStrings)(...rows.map((row) => row.missing_read_plan_ids || [])).slice(0, 40),
        session_required: rows.some((row) => row.session_required),
        session_matched: rows.every((row) => !row.session_required || row.session_matched),
        session_mismatch_gate_ids: rows.filter((row) => row.session_required && !row.session_matched).map((row) => row.gate_id),
        current_source_verified: rows.some((row) => row.current_source_verified),
        ignored_with_reason: rows.some((row) => row.ignored_with_reason),
        rows,
        declared: used.length > 0 || ignored.length > 0,
        structured_usage_rows: structuredUsageRows.slice(0, 24),
        used,
        ignored,
    };
}
function scoreChildAgentReceipt(task, receipt = {}, context = {}) {
    const receiptText = [
        receipt.summary,
        ...(Array.isArray(receipt.actions) ? receipt.actions : []),
        ...(Array.isArray(receipt.filesChanged || receipt.files_changed || receipt.files) ? (receipt.filesChanged || receipt.files_changed || receipt.files) : []),
    ].filter(Boolean).join("\n");
    const contractLikely = /接口|API|api|schema|DTO|类型|字段|契约|路由|endpoint|request|response/i.test(receiptText);
    const ack = receipt.ack || null;
    const contractChanges = Array.isArray(receipt.contractChanges || receipt.contract_changes) ? (receipt.contractChanges || receipt.contract_changes) : [];
    const memoryGate = (0, collaboration_1.evaluateReceiptMemoryDispatchGate)(task, receipt, context);
    const globalMemoryGate = (0, collaboration_1.evaluateReceiptGlobalMemoryUsageGate)(task, receipt, context);
    const globalMemoryHealthGate = (0, collaboration_1.evaluateReceiptGlobalMemoryHealthGate)(task, receipt, context);
    const readPlanRevalidationGate = evaluateReceiptReadPlanRevalidationGate(task, receipt, context);
    const postCompactReinjectionGate = (0, collaboration_1.evaluateReceiptPostCompactReinjectionGate)(task, receipt, context);
    const apiMicrocompactPlan = (0, collaboration_1.evaluateReceiptApiMicrocompactEditPlan)(task, receipt, context);
    const taskAgentMemorySnapshot = evaluateReceiptTaskAgentMemoryContextSnapshot(task, receipt, context);
    const snapshotMatchedGateIds = new Set(taskAgentMemorySnapshot.matched_gate_ids || []);
    const memoryGateProvenBySnapshot = memoryGate.required
        && memoryGate.declared
        && taskAgentMemorySnapshot.pass === true
        && (memoryGate.missing_gate_ids || []).every((gateId) => snapshotMatchedGateIds.has(gateId));
    const effectiveMemoryGate = memoryGateProvenBySnapshot
        ? { ...memoryGate, pass: true, missing_gate_ids: [], proven_by_memory_context_snapshot: true }
        : memoryGate;
    const globalMemoryHealthProvenBySnapshot = globalMemoryHealthGate.required
        && globalMemoryHealthGate.declared
        && taskAgentMemorySnapshot.pass === true
        && (globalMemoryHealthGate.missing_gate_ids || []).every((gateId) => snapshotMatchedGateIds.has(gateId))
        && (globalMemoryHealthGate.rows || []).every((row) => row.status === "ok" && row.blocked_global_memory_used !== true);
    const effectiveGlobalMemoryHealthGate = globalMemoryHealthProvenBySnapshot
        ? {
            ...globalMemoryHealthGate,
            pass: true,
            missing_gate_ids: [],
            proven_by_memory_context_snapshot: true,
            rows: (globalMemoryHealthGate.rows || []).map((row) => ({ ...row, pass: true, proven_by_memory_context_snapshot: true })),
        }
        : globalMemoryHealthGate;
    const handoffQuality = (0, collaboration_1.evaluateChildAgentHandoffQuality)(task, receipt);
    const checks = [
        { id: "status_done", label: "状态明确", ok: String(receipt.status || "") === "done" },
        { id: "structured_ack", label: "结构化 ACK", ok: !!ack && (!!ack.understoodGoal || !!ack.goal || (Array.isArray(ack.plannedScope) && ack.plannedScope.length > 0)) },
        { id: "summary", label: "说明完成内容", ok: String(receipt.summary || "").trim().length >= 8 },
        { id: "actions", label: "列出执行动作", ok: Array.isArray(receipt.actions) && receipt.actions.length > 0 },
        { id: "files", label: "列出文件变更", ok: !(0, collaboration_1.taskRequiresCodeChanges)(task) || (Array.isArray(receipt.filesChanged || receipt.files_changed || receipt.files) && (receipt.filesChanged || receipt.files_changed || receipt.files).length > 0) },
        { id: "verification", label: "列出已执行验证", ok: !(0, collaboration_1.taskRequiresVerification)(task) || (Array.isArray(receipt.verification || receipt.tests) && (receipt.verification || receipt.tests).length > 0) },
        { id: "not_handoff_only", label: "完成执行而非仅建议", ok: handoffQuality.pass, detail: handoffQuality.reason },
        { id: "contract_changes", label: "结构化契约变化", ok: !contractLikely || contractChanges.length > 0 },
        { id: "no_open_blockers", label: "无开放阻塞", ok: !(Array.isArray(receipt.blockers) && receipt.blockers.length) && !(Array.isArray(receipt.needs) && receipt.needs.some((item) => !(0, collaboration_1.isAdvisoryNeed)(item, task))) },
        { id: "memory_declared", label: "声明记忆使用", ok: Array.isArray(receipt.memoryUsed || receipt.memory_used) || Array.isArray(receipt.memoryIgnored || receipt.memory_ignored) },
        { id: "task_agent_memory_snapshot", label: "匹配本轮记忆快照", ok: !taskAgentMemorySnapshot.required || taskAgentMemorySnapshot.pass, detail: taskAgentMemorySnapshot.required ? `snapshot=${taskAgentMemorySnapshot.matched_snapshot_ids.join(",") || "missing"} session=${taskAgentMemorySnapshot.receipt_task_agent_session_id || "missing"}` : "not_required" },
        { id: "memory_gate", label: "引用记忆派发 gate", ok: !effectiveMemoryGate.required || effectiveMemoryGate.pass, detail: effectiveMemoryGate.required ? `gate=${effectiveMemoryGate.gate_ids.join(",") || "unknown"}` : "not_required" },
        { id: "global_memory_usage", label: "声明全局记忆使用状态", ok: !globalMemoryGate.required || globalMemoryGate.pass, detail: globalMemoryGate.required ? `global_memory=${globalMemoryGate.global_memory_ids.join(",") || "unknown"}` : "not_required" },
        { id: "global_memory_health_gate", label: "声明全局记忆健康门禁", ok: !effectiveGlobalMemoryHealthGate.required || effectiveGlobalMemoryHealthGate.pass, detail: effectiveGlobalMemoryHealthGate.required ? `gate=${effectiveGlobalMemoryHealthGate.gate_ids.join(",") || "unknown"}` : "not_required" },
        { id: "read_plan_revalidation_gate", label: "重读 stale read plan", ok: !readPlanRevalidationGate.required || readPlanRevalidationGate.pass, detail: readPlanRevalidationGate.required ? `gate=${readPlanRevalidationGate.gate_ids.join(",") || "unknown"} session=${readPlanRevalidationGate.session_matched !== false}` : "not_required" },
        { id: "post_compact_reinjection_gate", label: "引用压缩后重注入 gate", ok: !postCompactReinjectionGate.required || !(postCompactReinjectionGate.missing_gate_ids || []).length, detail: postCompactReinjectionGate.required ? `gate=${postCompactReinjectionGate.gate_ids.join(",") || "unknown"}` : "not_required" },
        { id: "post_compact_reinjection_candidate", label: "声明压缩重注入候选", ok: !postCompactReinjectionGate.candidate_reference_required || postCompactReinjectionGate.candidate_reference_passed, detail: postCompactReinjectionGate.candidate_reference_required ? `candidate=${postCompactReinjectionGate.referenced_candidate_ids?.join(",") || (postCompactReinjectionGate.all_candidates_declared ? "all" : "missing")}` : "not_required" },
        { id: "post_compact_reinjection_candidate_usage", label: "声明候选使用状态", ok: !postCompactReinjectionGate.candidate_usage_required || postCompactReinjectionGate.candidate_usage_declared_passed, detail: postCompactReinjectionGate.candidate_usage_required ? `used=${postCompactReinjectionGate.used_candidate_ids?.join(",") || "0"} ignored=${postCompactReinjectionGate.ignored_candidate_ids?.join(",") || "0"} verified=${postCompactReinjectionGate.verified_candidate_ids?.join(",") || "0"}` : "not_required" },
        { id: "api_microcompact_receipt", label: "声明 API microcompact 使用状态", ok: !apiMicrocompactPlan.required || apiMicrocompactPlan.pass, detail: apiMicrocompactPlan.required ? `plans=${apiMicrocompactPlan.plan_checksums.join(",") || "unknown"}` : "not_required" },
    ];
    const passed = checks.filter(item => item.ok).length;
    const rawScore = Math.round((passed / checks.length) * 100);
    const hardFail = (effectiveMemoryGate.required && !effectiveMemoryGate.pass)
        || (taskAgentMemorySnapshot.required && !taskAgentMemorySnapshot.pass)
        || (globalMemoryGate.required && !globalMemoryGate.pass)
        || (effectiveGlobalMemoryHealthGate.required && !effectiveGlobalMemoryHealthGate.pass)
        || (readPlanRevalidationGate.required && !readPlanRevalidationGate.pass)
        || (postCompactReinjectionGate.required && !postCompactReinjectionGate.pass)
        || (postCompactReinjectionGate.candidate_usage_required && !postCompactReinjectionGate.candidate_usage_declared_passed)
        || (apiMicrocompactPlan.required && !apiMicrocompactPlan.pass)
        || !handoffQuality.pass;
    const score = hardFail ? Math.min(rawScore, 70) : rawScore;
    return {
        score,
        grade: hardFail ? "partial" : score >= 85 ? "good" : score >= 60 ? "partial" : "weak",
        pass: !hardFail && score >= 85,
        checks,
        task_agent_memory_snapshot: taskAgentMemorySnapshot,
        memory_gate: effectiveMemoryGate,
        global_memory_gate: globalMemoryGate,
        global_memory_health_gate: effectiveGlobalMemoryHealthGate,
        read_plan_revalidation_gate: readPlanRevalidationGate,
        post_compact_reinjection_gate: postCompactReinjectionGate,
        api_microcompact: apiMicrocompactPlan,
        handoff_quality: handoffQuality,
        missing: checks.filter(item => !item.ok).map(item => item.label),
    };
}
function buildIndependentReviewGate(task, actualFileChanges = [], receipts = [], agentQa = []) {
    const highRiskFiles = (actualFileChanges || []).filter(collaboration_1.changeLooksHighRiskForIndependentReview);
    const reasons = [
        task?.requires_independent_review === true || task?.requiresIndependentReview === true ? "任务显式要求独立复核" : "",
        actualFileChanges.length >= 3 ? `涉及 ${actualFileChanges.length} 个文件` : "",
        highRiskFiles.length ? `包含 ${highRiskFiles.length} 个后端/API/配置等高风险文件` : "",
    ].filter(Boolean);
    const required = (0, collaboration_1.taskChangeNeedsIndependentReview)(task, actualFileChanges);
    const evidence = (0, collaboration_1.collectIndependentReviewEvidence)(receipts, agentQa);
    const failedEvidence = evidence.filter((item) => item.status === "failed");
    const passedEvidence = evidence.filter((item) => item.status === "passed");
    const recheckEvidence = evidence.filter((item) => item.status === "needs_recheck");
    const environmentEvidence = evidence.filter((item) => item.status === "needs_environment");
    const needsUserEvidence = evidence.filter((item) => item.status === "needs_user");
    const hasPendingEvidence = recheckEvidence.length > 0 || environmentEvidence.length > 0 || needsUserEvidence.length > 0;
    return {
        required,
        pass: !required || (passedEvidence.length > 0 && failedEvidence.length === 0 && !hasPendingEvidence),
        status: !required
            ? "not_required"
            : failedEvidence.length
                ? "failed"
                : recheckEvidence.length
                    ? "needs_recheck"
                    : environmentEvidence.length
                        ? "needs_environment"
                        : needsUserEvidence.length
                            ? "needs_user"
                            : passedEvidence.length
                                ? "passed"
                                : "missing",
        reason: reasons.join("；") || (required ? "复杂代码变更需要另一个 Agent 复核" : "本次变更不强制独立复核"),
        file_change_count: actualFileChanges.length,
        high_risk_files: highRiskFiles.map((item) => ({ project: item.project || item.agent || "", path: item.path || "" })).slice(0, 12),
        evidence_count: evidence.length,
        passed_count: passedEvidence.length,
        failed_count: failedEvidence.length,
        needs_recheck_count: recheckEvidence.length,
        needs_environment_count: environmentEvidence.length,
        needs_user_count: needsUserEvidence.length,
        evidence,
        failed_evidence: failedEvidence,
        recheck_evidence: recheckEvidence,
        environment_evidence: environmentEvidence,
        needs_user_evidence: needsUserEvidence,
    };
}
function buildAcceptanceGate(task, execution, summary, finalStatus) {
    const memoryGateSummary = (0, collaboration_1.buildMemoryGateVisibleSummary)(summary);
    const globalMemoryReceiptSummary = (0, collaboration_1.buildGlobalMemoryReceiptVisibleSummary)(summary);
    const globalMemoryHealthGateSummary = (0, collaboration_1.buildGlobalMemoryHealthGateVisibleSummary)(summary);
    const readPlanRevalidationGateSummary = (0, collaboration_1.buildReadPlanRevalidationGateVisibleSummary)(summary);
    const reinjectionGateSummary = (0, collaboration_1.buildPostCompactReinjectionGateVisibleSummary)(summary);
    const apiMicrocompactSummary = (0, collaboration_1.buildApiMicrocompactReceiptVisibleSummary)(summary);
    const taskAgentMemorySnapshotRequired = Number(summary.task_agent_memory_context_snapshot_count || summary.taskAgentMemoryContextSnapshotCount || 0) > 0;
    const checks = [
        { id: "coordinator_plan", label: "主 Agent 计划", ok: Number(summary.coordination_plan_count || 0) > 0, detail: `计划 ${summary.coordination_plan_count || 0} 条` },
        { id: "assignment", label: "子 Agent 派发", ok: Number(summary.assignment_count || 0) > 0 || task?.assign_type !== "group", detail: `派发 ${summary.assignment_count || 0} 条` },
        { id: "worker_receipt", label: "子 Agent 结果说明", ok: (summary.receipt_statuses || []).some((item) => item.status === "done") || task?.assign_type !== "group", detail: `结果说明 ${(summary.receipt_statuses || []).length} 条` },
        { id: "work_items", label: "执行队列收敛", ok: !summary.work_item_summary?.total || summary.work_item_summary?.all_completed === true, detail: summary.work_item_summary?.total ? `未完成 ${summary.team_shutdown?.unresolved_work_item_count || 0}/${summary.work_item_summary.total}` : "无独立工作项" },
        { id: "ack_gate", label: "ACK 前置审核", ok: !((0, collaboration_1.taskRequiresCodeChanges)(task) || (0, collaboration_1.taskRequiresVerification)(task)) || summary.ack_gate_passed === true, detail: summary.ack_review?.rejected?.length ? `需重写 ACK ${summary.ack_review.rejected.length} 条` : "通过" },
        { id: "receipt_quality", label: "结果说明质量", ok: !(0, collaboration_1.taskRequiresCodeChanges)(task) && !(0, collaboration_1.taskRequiresVerification)(task) || summary.receipt_quality_gate_passed === true, detail: summary.weak_receipt_quality?.length ? `待补结果说明 ${summary.weak_receipt_quality.length} 条` : "通过" },
        { id: "task_agent_memory_snapshot_receipt", label: "子 Agent 记忆快照匹配", ok: !taskAgentMemorySnapshotRequired || summary.task_agent_memory_snapshot_receipt_passed === true, detail: taskAgentMemorySnapshotRequired ? `快照 ${summary.task_agent_memory_context_snapshot_count || 0} 个` : "未触发" },
        { id: "memory_gate_receipt", label: "记忆使用声明", ok: !memoryGateSummary.required || memoryGateSummary.pass === true, detail: memoryGateSummary.summary },
        { id: "global_memory_receipt", label: "全局记忆使用声明", ok: !globalMemoryReceiptSummary.required || globalMemoryReceiptSummary.pass === true, detail: globalMemoryReceiptSummary.summary },
        { id: "global_memory_health_gate_receipt", label: "全局记忆健康门禁声明", ok: !globalMemoryHealthGateSummary.required || globalMemoryHealthGateSummary.pass === true, detail: globalMemoryHealthGateSummary.summary },
        { id: "read_plan_revalidation_gate_receipt", label: "读取计划重读声明", ok: !readPlanRevalidationGateSummary.required || readPlanRevalidationGateSummary.pass === true, detail: readPlanRevalidationGateSummary.summary },
        { id: "post_compact_reinjection_gate_receipt", label: "压缩重注入声明", ok: !reinjectionGateSummary.required || reinjectionGateSummary.pass === true, detail: reinjectionGateSummary.summary },
        { id: "api_microcompact_receipt", label: "API microcompact 使用声明", ok: !apiMicrocompactSummary.required || apiMicrocompactSummary.pass === true, detail: apiMicrocompactSummary.summary },
        { id: "contract_injection", label: "契约注入依赖 Agent", ok: summary.contract_injection_gate_passed !== false, detail: summary.contract_injection_gate?.missing?.length ? `待注入 ${summary.contract_injection_gate.missing.length} 个 Agent` : summary.contract_injection_gate?.unconsumed?.length ? `待消费结果说明 ${summary.contract_injection_gate.unconsumed.length} 个 Agent` : "通过" },
        { id: "final_review", label: "主 Agent 验收", ok: !!summary.has_final_review || finalStatus === "failed" || task?.assign_type !== "group", detail: summary.review_status || "" },
        { id: "actual_changes", label: "真实文件变更", ok: !(0, collaboration_1.taskRequiresCodeChanges)(task) || Number(summary.actual_file_change_count || 0) > 0, detail: `变更 ${summary.actual_file_change_count || 0} 个文件` },
        { id: "verification", label: "已执行验证", ok: !(0, collaboration_1.taskRequiresVerification)(task) || Number(summary.verification_executed?.length || 0) > 0, detail: `已执行 ${summary.verification_executed?.length || 0} 条` },
        { id: "required_verification", label: "项目验证命令覆盖", ok: !(0, collaboration_1.taskRequiresVerification)(task) || summary.verification_required_gate_passed !== false, detail: summary.verification_required_missing?.length ? `缺 ${summary.verification_required_missing.length} 项` : "已覆盖" },
        { id: "verification_source", label: "独立验证来源", ok: !(0, collaboration_1.taskRequiresVerification)(task) || summary.verification_source_gate_passed === true, detail: (summary.verification_sources || []).includes("test_agent_and_main_agent_spot_check") ? "TestAgent 与主 Agent 抽查已交叉验证" : `外部 Runner ${summary.external_runner_verification_count || 0} 条` },
        { id: "independent_review", label: "复杂变更独立复核", ok: summary.independent_review_required !== true || summary.independent_review_gate_passed === true, detail: summary.independent_review_required ? `${summary.independent_review_gate?.status || "missing"}；证据 ${summary.independent_review_gate?.evidence_count || 0} 条` : "未触发" },
        { id: "post_review_spot_check", label: "TestAgent 通过后抽查", ok: summary.post_review_spot_check_required !== true || summary.post_review_spot_check_gate_passed === true, detail: summary.post_review_spot_check_required ? `${summary.post_review_spot_check_gate?.status || "missing"}；抽查 ${summary.post_review_spot_check?.executed_count || 0} 项` : "未触发" },
        { id: "agent_qa", label: "Agent 协作问答", ok: !(0, collaboration_1.taskRequiresAgentQa)(task) || summary.agent_qa_gate_passed === true, detail: (0, collaboration_1.taskRequiresAgentQa)(task) ? `问答 ${summary.agent_qa_count || 0}，采纳 ${summary.agent_qa_accepted_count || 0}，续跑 ${summary.agent_qa_resumed_count || 0}` : "未要求" },
        { id: "team_shutdown", label: "团队收尾", ok: finalStatus !== "done" || summary.team_shutdown?.pass === true, detail: finalStatus === "done" ? `开放会话 ${summary.team_shutdown?.open_session_count || 0}，未完成工作项 ${summary.team_shutdown?.unresolved_work_item_count || 0}` : "最终交付前检查" },
        { id: "goal_coverage", label: "目标覆盖", ok: finalStatus === "failed" || task?.assign_type !== "group" || (!!summary.has_final_review && !(summary.blockers || []).length && !(summary.blocking_needs || []).length), detail: summary.has_final_review ? "已完成主 Agent 最终复盘" : "等待主 Agent 最终复盘确认目标覆盖" },
        { id: "no_blockers", label: "无开放阻塞", ok: !(summary.blockers || []).length && !(summary.blocking_needs || []).length && !(summary.agent_qa_has_open_items), detail: `阻塞 ${(summary.blockers || []).length}，待补 ${(summary.blocking_needs || []).length}` },
        { id: "policy", label: "项目边界", ok: summary.project_policy_gate_passed !== false, detail: summary.project_policy_violations?.length ? `违规 ${summary.project_policy_violations.length} 项` : "通过" },
    ];
    const failed = checks.filter(item => !item.ok);
    return {
        pass: failed.length === 0,
        status: failed.length === 0 ? "passed" : finalStatus === "failed" ? "failed" : "blocked",
        failed_count: failed.length,
        checks,
        failed_checks: failed,
        generated_at: new Date().toISOString(),
    };
}
function selectLatestDurableReceipts(receiptCandidates = []) {
    const receiptAgents = new Set();
    return receiptCandidates.filter(Boolean).flatMap((receipt, index) => {
        const agent = String(receipt?.agent || "").trim().toLowerCase();
        if (!agent)
            return [receipt];
        if (receiptAgents.has(agent))
            return [];
        receiptAgents.add(agent);
        if (receipt.ack)
            return [receipt];
        const taskSessionId = String(receipt.task_agent_session_id || receipt.taskAgentSessionId || "").trim();
        const nativeSessionId = String(receipt.native_session_id || receipt.nativeSessionId || "").trim();
        const priorWithBoundAck = receiptCandidates.slice(index + 1).find((candidate) => {
            if (String(candidate?.agent || "").trim().toLowerCase() !== agent || !candidate?.ack)
                return false;
            const candidateTaskSessionId = String(candidate.task_agent_session_id || candidate.taskAgentSessionId || "").trim();
            const candidateNativeSessionId = String(candidate.native_session_id || candidate.nativeSessionId || "").trim();
            return (!!taskSessionId && !!candidateTaskSessionId && taskSessionId === candidateTaskSessionId)
                || (!!nativeSessionId && !!candidateNativeSessionId && nativeSessionId === candidateNativeSessionId);
        });
        return priorWithBoundAck
            ? [{ ...receipt, ack: priorWithBoundAck.ack }]
            : [receipt];
    });
}
function buildDeliverySummary(task, execution, finalStatus) {
    const latestTask = task?.id ? (0, db_1.loadTasks)().find((item) => item.id === task.id) : null;
    task = latestTask ? { ...task, ...latestTask } : task;
    const executionText = execution?.report || execution?.result || "";
    const kernelExecutions = task?.id ? (0, execution_kernel_1.listExecutions)({ taskId: task.id }) : [];
    const receiptCandidates = [
        ...kernelExecutions.map((record) => record.receipt).filter(Boolean),
        ...(execution?.reviewReceipt ? [execution.reviewReceipt] : []),
        ...(execution?.review_receipt ? [execution.review_receipt] : []),
        ...(execution?.independentReviewReceipt ? [execution.independentReviewReceipt] : []),
        ...(execution?.independent_review_receipt ? [execution.independent_review_receipt] : []),
        ...(execution?.receipt ? [execution.receipt] : []),
        ...(0, collaboration_1.parseFormattedReceiptsFromText)(executionText),
    ].filter(Boolean);
    // Execution entities contain the newest durable receipt for each Worker.
    // Historical blocked/missing receipts must not override a later done receipt,
    // while a same-session rework receipt may reuse its already-approved ACK.
    const receipts = selectLatestDurableReceipts(receiptCandidates);
    const actualFileChanges = (0, collaboration_1.collectTaskActualFileChanges)(task, execution);
    const coordinationPlans = (0, collaboration_1.collectTaskCoordinationPlans)(task, execution);
    const latestCoordinationPlan = coordinationPlans[coordinationPlans.length - 1] || null;
    const assignmentEvidence = (0, collaboration_1.collectTaskAssignmentEvidence)(task, execution);
    const dependencyEvidence = assignmentEvidence.filter((item) => item.dependsOn);
    const continuationEvidence = assignmentEvidence.filter((item) => item.rework || item.continuationStrategy);
    const reworkEvidence = (0, collaboration_1.collectTaskReworkEvidence)(task, execution);
    const workerNotifications = (0, agent_notifications_1.parseTaskNotificationsFromText)(executionText);
    const agents = (0, collaboration_1.uniqueStrings)(receipts.map((receipt) => receipt.agent), workerNotifications.map((item) => item.task_id), assignmentEvidence.map((item) => item.project));
    const actualFilePaths = (0, collaboration_1.uniqueStrings)(actualFileChanges.map((file) => file.path));
    const filesChanged = (0, collaboration_1.uniqueStrings)(...receipts.map((receipt) => receipt.filesChanged), actualFilePaths);
    const verification = (0, collaboration_1.uniqueStrings)(...receipts.map((receipt) => receipt.verification));
    const verificationGate = (0, collaboration_1.getVerificationEvidenceGate)(receipts);
    const requiredVerificationCoverage = (0, collaboration_1.getRequiredVerificationCoverage)(receipts);
    const externalRunnerVerification = (0, collaboration_1.uniqueStrings)(...receipts.map((receipt) => (receipt.verification || []).filter((item) => /passed by external runner\s*\(exit 0\)/i.test(String(item)))));
    const projectAgentProfiles = agents
        .map((agent) => (0, collaboration_1.getProjectAgentCapabilityProfile)(agent))
        .filter((profile) => profile.configured);
    const policyEvidenceExclusions = (0, collaboration_1.uniqueStrings)(Array.isArray(task?.policy_evidence_exclusions) ? task.policy_evidence_exclusions : [], task?.workflow_meta?.smoke_test && task?.workflow_meta?.smoke_file ? [task.workflow_meta.smoke_file] : []);
    const projectPolicyViolations = (0, collaboration_1.collectProjectPolicyViolations)(actualFileChanges, policyEvidenceExclusions);
    const blockers = (0, collaboration_1.uniqueStrings)(...receipts.map((receipt) => receipt.blockers));
    if (projectPolicyViolations.length)
        blockers.push(...projectPolicyViolations.map((item) => item.message));
    const needs = (0, collaboration_1.uniqueStrings)(...receipts.map((receipt) => receipt.needs));
    const executionDetail = String(execution?.detail || "").trim();
    const executionDetailConfirmsCompletion = /(?:主\s*Agent|协调(?:者|Agent)|任务|最终)?\s*(?:复盘|验收|检查)?\s*(?:判定|确认)?\s*(?:已)?完成|(?:复盘|验收).{0,12}(?:通过|完成)/i.test(executionDetail);
    if (finalStatus !== "done" && executionDetail && !executionDetailConfirmsCompletion && !needs.length && !blockers.length) {
        needs.push(executionDetail);
    }
    const actions = (0, collaboration_1.uniqueStrings)(...receipts.map((receipt) => receipt.actions));
    const advisoryNeeds = needs.filter((item) => (0, collaboration_1.isAdvisoryNeed)(item, task));
    const blockingNeeds = needs.filter((item) => !advisoryNeeds.includes(item));
    const receiptStatuses = receipts.map((receipt) => ({
        agent: receipt.agent,
        status: receipt.status,
        summary: receipt.summary || "",
        taskAgentSessionId: receipt.taskAgentSessionId || receipt.task_agent_session_id || "",
        task_agent_session_id: receipt.task_agent_session_id || receipt.taskAgentSessionId || "",
        nativeSessionId: receipt.nativeSessionId || receipt.native_session_id || "",
        native_session_id: receipt.native_session_id || receipt.nativeSessionId || "",
        memoryContextSnapshotId: receipt.memoryContextSnapshotId || receipt.memory_context_snapshot_id || "",
        memory_context_snapshot_id: receipt.memory_context_snapshot_id || receipt.memoryContextSnapshotId || "",
        memoryContextSnapshotChecksum: receipt.memoryContextSnapshotChecksum || receipt.memory_context_snapshot_checksum || "",
        memory_context_snapshot_checksum: receipt.memory_context_snapshot_checksum || receipt.memoryContextSnapshotChecksum || "",
        workerContextPacketId: receipt.workerContextPacketId || receipt.worker_context_packet_id || "",
        worker_context_packet_id: receipt.worker_context_packet_id || receipt.workerContextPacketId || "",
        agentType: receipt.agentType || receipt.agent_type || "",
        agent_type: receipt.agent_type || receipt.agentType || "",
        executionId: receipt.executionId || receipt.execution_id || "",
        execution_id: receipt.execution_id || receipt.executionId || "",
        memoryUsed: Array.isArray(receipt.memoryUsed) ? receipt.memoryUsed.slice(0, 12) : [],
        memoryIgnored: Array.isArray(receipt.memoryIgnored) ? receipt.memoryIgnored.slice(0, 12) : [],
        typedMemoryUsage: Array.isArray(receipt.typedMemoryUsage || receipt.typed_memory_usage)
            ? (receipt.typedMemoryUsage || receipt.typed_memory_usage).slice(0, 40)
            : [],
        globalMemoryUsage: Array.isArray(receipt.globalMemoryUsage || receipt.global_memory_usage)
            ? (receipt.globalMemoryUsage || receipt.global_memory_usage).slice(0, 20)
            : [],
        apiMicrocompactUsage: Array.isArray(receipt.apiMicrocompactUsage || receipt.api_microcompact_usage || receipt.apiMicroCompactUsage)
            ? (receipt.apiMicrocompactUsage || receipt.api_microcompact_usage || receipt.apiMicroCompactUsage).slice(0, 20)
            : [],
        apiMicrocompactNativeApplyRequestTelemetry: Array.isArray(receipt.apiMicrocompactNativeApplyRequestTelemetry || receipt.api_microcompact_native_apply_request_telemetry || receipt.apiMicrocompactNativeApplyTelemetry || receipt.api_microcompact_native_apply_telemetry)
            ? (receipt.apiMicrocompactNativeApplyRequestTelemetry || receipt.api_microcompact_native_apply_request_telemetry || receipt.apiMicrocompactNativeApplyTelemetry || receipt.api_microcompact_native_apply_telemetry).slice(0, 20)
            : [],
        postCompactCandidateUsage: Array.isArray(receipt.postCompactCandidateUsage || receipt.post_compact_candidate_usage) ? (receipt.postCompactCandidateUsage || receipt.post_compact_candidate_usage).slice(0, 20) : [],
    }));
    const receiptEvidence = receipts.map((receipt) => ({
        agent: receipt.agent || "",
        status: receipt.status || "",
        summary: String(receipt.summary || "").slice(0, 800),
        taskAgentSessionId: receipt.taskAgentSessionId || receipt.task_agent_session_id || "",
        task_agent_session_id: receipt.task_agent_session_id || receipt.taskAgentSessionId || "",
        nativeSessionId: receipt.nativeSessionId || receipt.native_session_id || "",
        native_session_id: receipt.native_session_id || receipt.nativeSessionId || "",
        memoryContextSnapshotId: receipt.memoryContextSnapshotId || receipt.memory_context_snapshot_id || "",
        memory_context_snapshot_id: receipt.memory_context_snapshot_id || receipt.memoryContextSnapshotId || "",
        memoryContextSnapshotChecksum: receipt.memoryContextSnapshotChecksum || receipt.memory_context_snapshot_checksum || "",
        memory_context_snapshot_checksum: receipt.memory_context_snapshot_checksum || receipt.memoryContextSnapshotChecksum || "",
        workerContextPacketId: receipt.workerContextPacketId || receipt.worker_context_packet_id || "",
        worker_context_packet_id: receipt.worker_context_packet_id || receipt.workerContextPacketId || "",
        agentType: receipt.agentType || receipt.agent_type || "",
        agent_type: receipt.agent_type || receipt.agentType || "",
        executionId: receipt.executionId || receipt.execution_id || "",
        execution_id: receipt.execution_id || receipt.executionId || "",
        traceId: receipt.traceId || receipt.trace_id || "",
        trace_id: receipt.trace_id || receipt.traceId || "",
        actions: Array.isArray(receipt.actions) ? receipt.actions.slice(0, 20) : [],
        filesChanged: Array.isArray(receipt.filesChanged) ? receipt.filesChanged.slice(0, 50) : [],
        verification: Array.isArray(receipt.verification) ? receipt.verification.slice(0, 30) : [],
        ack: receipt.ack || null,
        contractChanges: Array.isArray(receipt.contractChanges || receipt.contract_changes) ? (receipt.contractChanges || receipt.contract_changes).slice(0, 12) : [],
        independentReview: Array.isArray(receipt.independentReview || receipt.independent_review || receipt.codeReview || receipt.code_review)
            ? (receipt.independentReview || receipt.independent_review || receipt.codeReview || receipt.code_review).slice(0, 8)
            : [],
        reviewer: receipt.reviewer || "",
        role: receipt.role || "",
        consumedInjectionIds: (0, collaboration_1.normalizeStringArray)(receipt.consumedInjectionIds || receipt.consumed_injection_ids || receipt.contractInjectionConsumed || receipt.contract_injection_consumed).slice(0, 20),
        contractConsumption: Array.isArray(receipt.contractConsumption || receipt.contract_consumption) ? (receipt.contractConsumption || receipt.contract_consumption).slice(0, 20) : [],
        invokedSkills: Array.isArray(receipt.invokedSkills || receipt.invoked_skills) ? (receipt.invokedSkills || receipt.invoked_skills).slice(0, 20) : [],
        runtimeToolSnapshot: receipt.runtimeToolSnapshot || receipt.runtime_tool_snapshot || null,
        memoryUsed: Array.isArray(receipt.memoryUsed || receipt.memory_used) ? (receipt.memoryUsed || receipt.memory_used).slice(0, 20) : [],
        memoryIgnored: Array.isArray(receipt.memoryIgnored || receipt.memory_ignored) ? (receipt.memoryIgnored || receipt.memory_ignored).slice(0, 20) : [],
        typedMemoryUsage: Array.isArray(receipt.typedMemoryUsage || receipt.typed_memory_usage)
            ? (receipt.typedMemoryUsage || receipt.typed_memory_usage).slice(0, 80)
            : [],
        memoryContextUsage: receipt.agentMemoryContextUsage || receipt.agent_memory_context_usage || receipt.memoryContextUsage || receipt.memory_context_usage || null,
        agentMemoryContextUsage: receipt.agentMemoryContextUsage || receipt.agent_memory_context_usage || receipt.memoryContextUsage || receipt.memory_context_usage || null,
        memoryFactCitations: Array.isArray(receipt.memoryFactCitations || receipt.memory_fact_citations)
            ? (receipt.memoryFactCitations || receipt.memory_fact_citations).slice(0, 20)
            : [],
        globalMemoryUsage: Array.isArray(receipt.globalMemoryUsage || receipt.global_memory_usage)
            ? (receipt.globalMemoryUsage || receipt.global_memory_usage).slice(0, 40)
            : [],
        apiMicrocompactUsage: Array.isArray(receipt.apiMicrocompactUsage || receipt.api_microcompact_usage || receipt.apiMicroCompactUsage)
            ? (receipt.apiMicrocompactUsage || receipt.api_microcompact_usage || receipt.apiMicroCompactUsage).slice(0, 40)
            : [],
        apiMicrocompactNativeApplyRequestTelemetry: Array.isArray(receipt.apiMicrocompactNativeApplyRequestTelemetry || receipt.api_microcompact_native_apply_request_telemetry || receipt.apiMicrocompactNativeApplyTelemetry || receipt.api_microcompact_native_apply_telemetry)
            ? (receipt.apiMicrocompactNativeApplyRequestTelemetry || receipt.api_microcompact_native_apply_request_telemetry || receipt.apiMicrocompactNativeApplyTelemetry || receipt.api_microcompact_native_apply_telemetry).slice(0, 40)
            : [],
        postCompactCandidateUsage: Array.isArray(receipt.postCompactCandidateUsage || receipt.post_compact_candidate_usage) ? (receipt.postCompactCandidateUsage || receipt.post_compact_candidate_usage).slice(0, 40) : [],
        postReviewSpotCheck: receipt.postReviewSpotCheck || receipt.post_review_spot_check || null,
        post_review_spot_check: receipt.post_review_spot_check || receipt.postReviewSpotCheck || null,
        postReviewSpotCheckSummary: receipt.postReviewSpotCheckSummary || receipt.post_review_spot_check_summary || null,
        post_review_spot_check_summary: receipt.post_review_spot_check_summary || receipt.postReviewSpotCheckSummary || null,
        testAgentReport: receipt.testAgentReport || receipt.test_agent_report || null,
        test_agent_report: receipt.test_agent_report || receipt.testAgentReport || null,
        blockers: Array.isArray(receipt.blockers) ? receipt.blockers.slice(0, 20) : [],
        needs: Array.isArray(receipt.needs) ? receipt.needs.slice(0, 20) : [],
    }));
    const implementationReceiptEvidence = receiptEvidence.filter((receipt) => !(0, collaboration_1.isCoordinatorTestAgentName)(receipt.agent)
        && String(receipt.role || "").toLowerCase() !== "independent_verifier");
    const memoryUsageEvidence = receiptEvidence
        .filter((receipt) => receipt.memoryUsed?.length || receipt.memoryIgnored?.length)
        .map((receipt) => ({
        agent: receipt.agent,
        used: receipt.memoryUsed || [],
        ignored: receipt.memoryIgnored || [],
    }));
    const taskSessions = task?.id ? (0, agent_sessions_1.listTaskAgentSessions)({ taskId: task.id }) : [];
    const taskAgentMemoryContextSnapshots = task?.id ? (0, agent_sessions_1.listTaskAgentMemoryContextSnapshots)({ taskId: task.id }) : [];
    const taskAgentMemoryContextSnapshotRows = taskAgentMemoryContextSnapshots.map(collaboration_1.summarizeTaskAgentMemoryContextSnapshot);
    const providerToolAccessEvidence = task?.group_id && task?.id
        ? (0, storage_1.getGroupMessages)(task.group_id, task.group_session_id || task.groupSessionId || "default")
            .filter((message) => message?.task_id === task.id)
            .map((message) => message.providerToolAccessEvidence || message.provider_tool_access_evidence)
            .filter(Boolean)
        : [];
    const memoryGateCollectionContext = {
        assignmentEvidence,
        execution,
        assignments: execution?.assignments || [],
        taskAgentMemoryContextSnapshots,
        task_agent_memory_context_snapshots: taskAgentMemoryContextSnapshots,
        providerToolAccessEvidence,
        provider_tool_access_evidence: providerToolAccessEvidence,
    };
    const belongsToImplementationAgent = (item) => !(0, collaboration_1.isCoordinatorTestAgentName)(item?.target_project || item?.targetProject || item?.project || "");
    const memoryDispatchGates = (0, collaboration_1.collectTaskMemoryDispatchFreshnessGates)(task, memoryGateCollectionContext).filter(belongsToImplementationAgent);
    const globalMemoryReceiptGates = (0, collaboration_1.collectTaskGlobalMemoryReceiptGates)(task, memoryGateCollectionContext).filter(belongsToImplementationAgent);
    const globalMemoryHealthGates = (0, collaboration_1.collectTaskGlobalMemoryHealthGates)(task, memoryGateCollectionContext).filter(belongsToImplementationAgent);
    const readPlanRevalidationGates = (0, collaboration_1.collectTaskReadPlanRevalidationGates)(task, memoryGateCollectionContext).filter(belongsToImplementationAgent);
    const postCompactReinjectionGates = (0, collaboration_1.collectTaskPostCompactReinjectionGates)(task, memoryGateCollectionContext).filter(belongsToImplementationAgent);
    const apiMicrocompactEditPlans = (0, collaboration_1.collectTaskApiMicrocompactEditPlans)(task, memoryGateCollectionContext).filter(belongsToImplementationAgent);
    const postCompactDispatchMarkers = (0, collaboration_1.collectTaskPostCompactDispatchMarkers)(task, memoryGateCollectionContext);
    const receiptQuality = implementationReceiptEvidence.map((receipt) => ({
        agent: receipt.agent || "",
        status: receipt.status || "",
        ...(() => {
            const quality = scoreChildAgentReceipt(task, receipt, { memoryDispatchGates, globalMemoryReceiptGates, globalMemoryHealthGates, readPlanRevalidationGates, postCompactReinjectionGates, apiMicrocompactEditPlans, taskAgentMemoryContextSnapshots, assignmentEvidence, execution });
            return {
                score: quality.score,
                grade: quality.grade,
                pass: quality.pass,
                missing: quality.missing,
                checks: quality.checks,
                task_agent_memory_snapshot: quality.task_agent_memory_snapshot,
                memory_gate: quality.memory_gate,
                global_memory_gate: quality.global_memory_gate,
                global_memory_health_gate: quality.global_memory_health_gate,
                read_plan_revalidation_gate: quality.read_plan_revalidation_gate,
                post_compact_reinjection_gate: quality.post_compact_reinjection_gate,
                api_microcompact: quality.api_microcompact,
            };
        })(),
    }));
    const doneReceiptQuality = receiptQuality.filter((item) => item.status === "done");
    const receiptQualityGatePassed = !(0, collaboration_1.taskRequiresCodeChanges)(task) && !(0, collaboration_1.taskRequiresVerification)(task)
        ? true
        : doneReceiptQuality.length > 0 && doneReceiptQuality.every((item) => item.grade === "good");
    const taskAgentMemorySnapshotReceiptRows = receiptQuality.filter((item) => item.task_agent_memory_snapshot?.required);
    const taskAgentMemorySnapshotReceiptPassed = taskAgentMemoryContextSnapshots.length === 0 || (taskAgentMemorySnapshotReceiptRows.length > 0 && taskAgentMemorySnapshotReceiptRows.every((item) => item.task_agent_memory_snapshot?.pass === true));
    const memoryGateReceiptRows = receiptQuality.filter((item) => item.memory_gate?.required);
    const memoryGateReceiptPassed = memoryDispatchGates.length === 0 || (memoryGateReceiptRows.length > 0 && memoryGateReceiptRows.every((item) => item.memory_gate?.pass === true));
    const globalMemoryReceiptRows = receiptQuality.filter((item) => item.global_memory_gate?.required);
    const globalMemoryReceiptPassed = globalMemoryReceiptGates.length === 0 || (globalMemoryReceiptRows.length > 0 && globalMemoryReceiptRows.every((item) => item.global_memory_gate?.pass === true));
    const globalMemoryHealthGateReceiptRows = receiptQuality.filter((item) => item.global_memory_health_gate?.required);
    const globalMemoryHealthGateReceiptPassed = globalMemoryHealthGates.length === 0 || (globalMemoryHealthGateReceiptRows.length > 0 && globalMemoryHealthGateReceiptRows.every((item) => item.global_memory_health_gate?.pass === true));
    const readPlanRevalidationGateReceiptRows = receiptQuality.filter((item) => item.read_plan_revalidation_gate?.required);
    const requiredReadPlanRevalidationGates = readPlanRevalidationGates.filter((gate) => gate.status === "required"
        || Number(gate.required_count || 0) > 0
        || (gate.required_read_plan_ids || []).length > 0);
    const readPlanRevalidationGateReceiptPassed = requiredReadPlanRevalidationGates.length === 0
        || (readPlanRevalidationGateReceiptRows.length > 0 && readPlanRevalidationGateReceiptRows.every((item) => item.read_plan_revalidation_gate?.pass === true));
    const postCompactReinjectionGateReceiptRows = receiptQuality.filter((item) => item.post_compact_reinjection_gate?.required);
    const postCompactReinjectionGateReceiptPassed = postCompactReinjectionGates.length === 0 || (postCompactReinjectionGateReceiptRows.length > 0 && postCompactReinjectionGateReceiptRows.every((item) => item.post_compact_reinjection_gate?.pass === true));
    const apiMicrocompactReceiptRows = receiptQuality.filter((item) => item.api_microcompact?.required);
    const requiredApiMicrocompactEditPlans = apiMicrocompactEditPlans.filter((plan) => Number(plan.edit_count || 0) > 0 || plan.recommended === true);
    const apiMicrocompactReceiptPassed = requiredApiMicrocompactEditPlans.length === 0
        || (apiMicrocompactReceiptRows.length > 0 && apiMicrocompactReceiptRows.every((item) => item.api_microcompact?.pass === true));
    const memoryGateSummary = (0, collaboration_1.buildMemoryGateVisibleSummary)({
        memory_dispatch_gates: memoryDispatchGates,
        memory_dispatch_gate_count: memoryDispatchGates.length,
        memory_gate_receipt_passed: memoryGateReceiptPassed,
        memory_gate_receipt_rows: memoryGateReceiptRows,
    });
    const globalMemoryReceiptSummary = (0, collaboration_1.buildGlobalMemoryReceiptVisibleSummary)({
        global_memory_receipt_gates: globalMemoryReceiptGates,
        global_memory_receipt_gate_count: globalMemoryReceiptGates.length,
        global_memory_receipt_passed: globalMemoryReceiptPassed,
        global_memory_receipt_rows: globalMemoryReceiptRows,
    });
    const globalMemoryHealthGateSummary = (0, collaboration_1.buildGlobalMemoryHealthGateVisibleSummary)({
        global_memory_health_gates: globalMemoryHealthGates,
        global_memory_health_gate_count: globalMemoryHealthGates.length,
        global_memory_health_gate_receipt_passed: globalMemoryHealthGateReceiptPassed,
        global_memory_health_gate_receipt_rows: globalMemoryHealthGateReceiptRows,
    });
    const readPlanRevalidationGateSummary = (0, collaboration_1.buildReadPlanRevalidationGateVisibleSummary)({
        read_plan_revalidation_gates: readPlanRevalidationGates,
        read_plan_revalidation_gate_count: readPlanRevalidationGates.length,
        read_plan_revalidation_gate_receipt_passed: readPlanRevalidationGateReceiptPassed,
        read_plan_revalidation_gate_receipt_rows: readPlanRevalidationGateReceiptRows,
    });
    const postCompactReinjectionGateSummary = (0, collaboration_1.buildPostCompactReinjectionGateVisibleSummary)({
        post_compact_reinjection_gates: postCompactReinjectionGates,
        post_compact_reinjection_gate_count: postCompactReinjectionGates.length,
        post_compact_reinjection_gate_receipt_passed: postCompactReinjectionGateReceiptPassed,
        post_compact_reinjection_gate_receipt_rows: postCompactReinjectionGateReceiptRows,
    });
    const apiMicrocompactReceiptSummary = (0, collaboration_1.buildApiMicrocompactReceiptVisibleSummary)({
        api_microcompact_edit_plans: apiMicrocompactEditPlans,
        api_microcompact_edit_plan_count: apiMicrocompactEditPlans.length,
        api_microcompact_receipt_passed: apiMicrocompactReceiptPassed,
        api_microcompact_receipt_rows: apiMicrocompactReceiptRows,
    });
    const apiMicrocompactNativeApplyRequestTelemetryLedger = (0, memory_1.recordGroupApiMicrocompactNativeApplyRequestTelemetryLedger)(task?.group_id || task?.groupId || "", {
        groupSessionId: task?.group_session_id || task?.groupSessionId || "default",
        targetProject: task?.target_project || task?.targetProject || "",
        taskId: task?.id || "",
        executionId: execution?.id || execution?.execution_id || "",
        receipts: receiptEvidence,
        generatedAt: new Date().toISOString(),
    });
    const apiMicrocompactNativeApplyProofLedger = (0, memory_1.recordGroupApiMicrocompactNativeApplyProofLedger)(task?.group_id || task?.groupId || "", {
        groupSessionId: task?.group_session_id || task?.groupSessionId || "default",
        targetProject: task?.target_project || task?.targetProject || "",
        taskId: task?.id || "",
        executionId: execution?.id || execution?.execution_id || "",
        finalStatus,
        receiptRows: apiMicrocompactReceiptRows,
        generatedAt: new Date().toISOString(),
    });
    const postCompactCandidateUsageLedger = (0, memory_1.recordGroupPostCompactCandidateUsageLedger)(task?.group_id || task?.groupId || "", {
        groupSessionId: task?.group_session_id || task?.groupSessionId || "default",
        targetProject: task?.target_project || task?.targetProject || "",
        taskId: task?.id || "",
        executionId: execution?.id || execution?.execution_id || "",
        receiptRows: postCompactReinjectionGateReceiptRows,
        generatedAt: new Date().toISOString(),
    });
    const typedMemoryConsumptionRows = (0, collaboration_1.collectTaskTypedMemoryConsumptionRows)(task, receiptEvidence, memoryGateCollectionContext);
    const typedMemoryConsumptionLedger = (0, group_memory_index_1.recordGroupTypedMemoryConsumptionLedger)((0, memory_1.getGroupSessionMemoryScopeId)(task?.group_id || task?.groupId || "", task?.group_session_id || task?.groupSessionId || "default"), {
        targetProject: task?.target_project || task?.targetProject || "",
        taskId: task?.id || "",
        executionId: execution?.id || execution?.execution_id || "",
        rows: typedMemoryConsumptionRows,
        generatedAt: new Date().toISOString(),
    });
    const typedMemorySelectorConsumption = (0, group_memory_index_1.recordGroupTypedMemoryManifestSelectorConsumptionOutcomes)((0, memory_1.getGroupSessionMemoryScopeId)(task?.group_id || task?.groupId || "", task?.group_session_id || task?.groupSessionId || ""), {
        targetProject: task?.target_project || task?.targetProject || "",
        taskId: task?.id || "",
        executionId: execution?.id || execution?.execution_id || "",
        rows: typedMemoryConsumptionRows,
        receipts: receiptEvidence,
        generatedAt: new Date().toISOString(),
    });
    const typedMemoryStaleCandidateLedger = (0, group_memory_index_1.recordGroupTypedMemoryStaleCandidates)((0, memory_1.getGroupSessionMemoryScopeId)(task?.group_id || task?.groupId || "", task?.group_session_id || task?.groupSessionId || "default"), {
        targetProject: task?.target_project || task?.targetProject || "",
        taskId: task?.id || "",
        executionId: execution?.id || execution?.execution_id || "",
        rows: typedMemoryConsumptionRows,
        generatedAt: new Date().toISOString(),
    });
    const typedMemoryPressureRecallUsageRows = (0, collaboration_1.collectTaskTypedMemoryPressureRecallUsageRows)(task, receiptEvidence, memoryGateCollectionContext);
    const typedMemoryPressureRecallUsageLedger = (0, group_memory_index_1.recordGroupTypedMemoryPressureRecallUsageLedger)((0, memory_1.getGroupSessionMemoryScopeId)(task?.group_id || task?.groupId || "", task?.group_session_id || task?.groupSessionId || "default"), {
        targetProject: task?.target_project || task?.targetProject || "",
        taskId: task?.id || "",
        executionId: execution?.id || execution?.execution_id || "",
        rows: typedMemoryPressureRecallUsageRows,
        generatedAt: new Date().toISOString(),
    });
    const postCompactDispatchMarkerSummary = (0, collaboration_1.buildPostCompactDispatchMarkerVisibleSummary)({
        post_compact_dispatch_markers: postCompactDispatchMarkers,
        post_compact_dispatch_marker_count: postCompactDispatchMarkers.length,
    });
    const ackReviewForGate = (0, protocol_gates_1.buildAckPreflightReview)(task, implementationReceiptEvidence, assignmentEvidence
        .filter((item) => !(0, collaboration_1.isCoordinatorTestAgentName)(item.project))
        .map((item) => ({ project: item.project, objective: item.task })));
    const ackGatePassed = !((0, collaboration_1.taskRequiresCodeChanges)(task) || (0, collaboration_1.taskRequiresVerification)(task))
        || (ackReviewForGate.status === "approved" && !ackReviewForGate.rejected?.length);
    const contractSyncForGate = (0, protocol_gates_1.extractContractSyncHints)(task, {
        receipts: receiptEvidence,
        assignment_evidence: assignmentEvidence,
    });
    const contractTransferForGate = (0, protocol_gates_1.buildContractTransferPlan)(contractSyncForGate, assignmentEvidence.map((item) => ({ project: item.project, objective: item.task })));
    const contractInjectionGate = (0, protocol_gates_1.evaluateContractInjectionGate)(contractTransferForGate.rows || [], assignmentEvidence, receiptEvidence);
    const review = execution?.review || null;
    const reviewStatus = review?.status || "";
    const taskAgentQa = (0, agent_qa_service_1.getAgentQaItemsForGroup)(String(task?.group_id || task?.groupId || ""), 120)
        .filter((item) => !task?.id || !item.task_id || item.task_id === task.id)
        .map((item) => ({
        id: item.id,
        from_agent: item.from_agent,
        to_agent: item.to_agent,
        type: item.type,
        status: item.status,
        question: item.question,
        answer: item.answer,
        blocking: item.blocking !== false,
        execution_id: item.execution_id || "",
        deadline_at: item.deadline_at || item.timeout_at || "",
        evidence: item.evidence || [],
        answer_evidence: item.answer_evidence || [],
        routing: item.routing || null,
        admission: item.admission || null,
        acceptance: item.acceptance || null,
        permission_contract: item.permission_contract || null,
        permission_boundary: item.permission_boundary || null,
        arbitration: item.arbitration || null,
        timeout_at: item.timeout_at || "",
        injected_at: item.injected_at || "",
        resumed_at: item.resumed_at || "",
        retry_count: Number(item.retry_count || 0),
        manual_takeover: !!item.manual_takeover,
    }));
    const openAgentQa = taskAgentQa.filter((item) => ["waiting", "asking", "queued", "needs_user", "timeout", "manual", "rejected"].includes(String(item.status || "")));
    const resolvedAgentQa = taskAgentQa.filter((item) => ["answered", "injected", "resumed"].includes(String(item.status || "")));
    const acceptedAgentQa = taskAgentQa.filter((item) => item.acceptance?.accepted === true);
    const resumedAgentQa = taskAgentQa.filter((item) => item.status === "resumed" || item.resumed_at);
    const agentQaRequired = (0, collaboration_1.taskRequiresAgentQa)(task);
    const independentReviewGate = buildIndependentReviewGate(task, actualFileChanges, receiptEvidence, taskAgentQa);
    const postReviewSpotCheckGate = (0, post_review_spot_check_1.buildPostReviewSpotCheckGate)({
        required: independentReviewGate.required && independentReviewGate.pass,
        receipts: receiptEvidence,
    });
    const independentVerificationSourcePassed = independentReviewGate.pass === true
        && postReviewSpotCheckGate.pass === true;
    const headline = finalStatus === "done"
        ? "已完成最终验收"
        : finalStatus === "failed"
            ? "任务执行失败"
            : "任务仍需继续推进";
    const sessionContinuity = taskSessions.map((session) => ({
        id: session.id,
        project: session.project,
        executor: session.agentType,
        native_session_id: session.nativeSessionId || "",
        resume_mode: session.resumeMode,
        status: session.status,
        turn_count: Number(session.turnCount || 0),
        last_turn_succeeded: session.lastTurnSucceeded,
        degraded: session.resumeMode === "scratchpad" && (0, agent_sessions_1.getTaskAgentSessionContinuity)(session).degraded,
        reason: session.lastError || session.closeReason || "",
        memory_context_snapshot_id: session.memoryContextSnapshotId || "",
        memory_context_snapshot_checksum: session.memoryContextSnapshotChecksum || "",
        memory_context_packet_id: session.memoryContextPacketId || "",
    }));
    const workItemTask = {
        ...task,
        status: finalStatus === "done" ? "done" : task?.status,
        delivery_summary: {
            ...(task?.delivery_summary || {}),
            assignment_evidence: assignmentEvidence,
            receipts: receiptEvidence,
            receipt_statuses: receiptStatuses,
        },
    };
    const deliveryWorkItems = (0, work_items_1.buildMainAgentWorkItems)(workItemTask, { executions: kernelExecutions });
    const deliveryWorkItemSummary = (0, work_items_1.buildMainAgentWorkItemSummary)(deliveryWorkItems);
    const teamShutdown = (0, collaboration_1.buildTeamShutdownGate)(finalStatus, sessionContinuity, deliveryWorkItems, deliveryWorkItemSummary);
    const lifecycleState = task?.status === "cancelled" ? "cancelled"
        : finalStatus === "done" ? "completed"
            : finalStatus === "failed" ? "failed"
                : openAgentQa.length ? "waiting_dependency"
                    : reworkEvidence.length ? "rework"
                        : task?.status === "pending" || task?.status === "queued" ? "queued"
                            : review ? "reviewing" : "executing";
    const summary = {
        headline,
        status: finalStatus,
        detail: execution?.detail || "",
        workflow_type: task?.workflow_type || "general",
        business_goal: task?.business_goal || task?.title || "",
        coordination_plans: coordinationPlans,
        latest_coordination_plan: latestCoordinationPlan,
        coordination_plan_count: coordinationPlans.length,
        assignment_evidence: assignmentEvidence,
        assignment_count: assignmentEvidence.length,
        dependency_evidence: dependencyEvidence,
        dependency_count: dependencyEvidence.length,
        continuation_evidence: continuationEvidence,
        continuation_count: continuationEvidence.length,
        rework_evidence: reworkEvidence,
        rework_count: reworkEvidence.length,
        has_rework_evidence: reworkEvidence.length > 0,
        requires_code_changes: (0, collaboration_1.taskRequiresCodeChanges)(task),
        requires_verification: (0, collaboration_1.taskRequiresVerification)(task),
        agents,
        project_agent_profiles: projectAgentProfiles,
        policy_evidence_exclusions: policyEvidenceExclusions,
        project_policy_violations: projectPolicyViolations,
        project_policy_gate_passed: projectPolicyViolations.length === 0,
        worker_notifications: workerNotifications,
        worker_notification_count: workerNotifications.length,
        worker_notification_statuses: workerNotifications.map((item) => ({
            task_id: item.task_id,
            status: item.status,
            receipt_status: item.receipt_status,
            summary: item.summary,
        })),
        agent_qa: taskAgentQa,
        agent_qa_count: taskAgentQa.length,
        agent_qa_open_count: openAgentQa.length,
        agent_qa_resolved_count: resolvedAgentQa.length,
        agent_qa_has_open_items: openAgentQa.length > 0,
        agent_qa_required: agentQaRequired,
        agent_qa_accepted_count: acceptedAgentQa.length,
        agent_qa_resumed_count: resumedAgentQa.length,
        agent_qa_gate_passed: !agentQaRequired || (acceptedAgentQa.length > 0 && resumedAgentQa.length > 0),
        sandbox_rehearsal: task?.workflow_meta?.sandbox_rehearsal || task?.sandbox_rehearsal || execution?.sandbox_rehearsal || null,
        timeline: (0, logs_1.getTaskTimeline)(task, execution),
        receipt_statuses: receiptStatuses,
        receipts: receiptEvidence,
        receipt_quality: receiptQuality,
        receipt_quality_gate_passed: receiptQualityGatePassed,
        weak_receipt_quality: receiptQuality.filter((item) => item.grade !== "good"),
        ack_review: ackReviewForGate,
        ack_gate_passed: ackGatePassed,
        contract_sync: contractSyncForGate,
        contract_transfer: contractTransferForGate,
        contract_injection_required: contractTransferForGate.required === true,
        contract_injection_status: contractInjectionGate.status,
        contract_injection_rows: contractInjectionGate.rows,
        contract_injection_gate: contractInjectionGate,
        contract_injection_gate_passed: contractInjectionGate.pass,
        memory_usage: memoryUsageEvidence,
        memory_usage_count: memoryUsageEvidence.length,
        memory_usage_declared: memoryUsageEvidence.some((item) => item.used?.length),
        task_agent_memory_context_snapshots: taskAgentMemoryContextSnapshotRows,
        task_agent_memory_context_snapshot_count: taskAgentMemoryContextSnapshotRows.length,
        task_agent_memory_snapshot_receipt_passed: taskAgentMemorySnapshotReceiptPassed,
        task_agent_memory_snapshot_receipt_rows: taskAgentMemorySnapshotReceiptRows,
        memory_dispatch_gates: memoryDispatchGates,
        memory_dispatch_gate_count: memoryDispatchGates.length,
        memory_gate_receipt_passed: memoryGateReceiptPassed,
        memory_gate_receipt_rows: memoryGateReceiptRows,
        memory_gate_summary: memoryGateSummary,
        global_memory_receipt_gates: globalMemoryReceiptGates,
        global_memory_receipt_gate_count: globalMemoryReceiptGates.length,
        global_memory_receipt_passed: globalMemoryReceiptPassed,
        global_memory_receipt_rows: globalMemoryReceiptRows,
        global_memory_receipt_summary: globalMemoryReceiptSummary,
        global_memory_health_gates: globalMemoryHealthGates,
        global_memory_health_gate_count: globalMemoryHealthGates.length,
        global_memory_health_gate_receipt_passed: globalMemoryHealthGateReceiptPassed,
        global_memory_health_gate_receipt_rows: globalMemoryHealthGateReceiptRows,
        global_memory_health_gate_summary: globalMemoryHealthGateSummary,
        read_plan_revalidation_gates: readPlanRevalidationGates,
        read_plan_revalidation_gate_count: readPlanRevalidationGates.length,
        read_plan_revalidation_gate_receipt_passed: readPlanRevalidationGateReceiptPassed,
        read_plan_revalidation_gate_receipt_rows: readPlanRevalidationGateReceiptRows,
        read_plan_revalidation_gate_summary: readPlanRevalidationGateSummary,
        post_compact_reinjection_gates: postCompactReinjectionGates,
        post_compact_reinjection_gate_count: postCompactReinjectionGates.length,
        post_compact_reinjection_gate_receipt_passed: postCompactReinjectionGateReceiptPassed,
        post_compact_reinjection_gate_receipt_rows: postCompactReinjectionGateReceiptRows,
        post_compact_reinjection_gate_summary: postCompactReinjectionGateSummary,
        api_microcompact_edit_plans: apiMicrocompactEditPlans,
        api_microcompact_edit_plan_count: apiMicrocompactEditPlans.length,
        api_microcompact_receipt_passed: apiMicrocompactReceiptPassed,
        api_microcompact_receipt_rows: apiMicrocompactReceiptRows,
        api_microcompact_receipt_summary: apiMicrocompactReceiptSummary,
        api_microcompact_native_apply_request_telemetry_ledger: apiMicrocompactNativeApplyRequestTelemetryLedger,
        api_microcompact_native_apply_request_telemetry_ledger_file: apiMicrocompactNativeApplyRequestTelemetryLedger?.file || "",
        api_microcompact_native_apply_proof_ledger: apiMicrocompactNativeApplyProofLedger,
        api_microcompact_native_apply_proof_ledger_file: apiMicrocompactNativeApplyProofLedger?.file || "",
        post_compact_candidate_usage_ledger: postCompactCandidateUsageLedger,
        post_compact_candidate_usage_ledger_file: postCompactCandidateUsageLedger?.file || "",
        typed_memory_pressure_recall_usage_rows: typedMemoryPressureRecallUsageRows,
        typed_memory_pressure_recall_usage_count: typedMemoryPressureRecallUsageRows.length,
        typed_memory_pressure_recall_usage_ledger: typedMemoryPressureRecallUsageLedger,
        typed_memory_pressure_recall_usage_ledger_file: typedMemoryPressureRecallUsageLedger?.file || "",
        typed_memory_consumption_rows: typedMemoryConsumptionRows,
        typed_memory_consumption_count: typedMemoryConsumptionRows.length,
        typed_memory_consumption_ledger: typedMemoryConsumptionLedger,
        typed_memory_consumption_ledger_file: typedMemoryConsumptionLedger?.file || "",
        typed_memory_selector_consumption: typedMemorySelectorConsumption,
        typed_memory_selector_consumption_recorded_count: Number(typedMemorySelectorConsumption?.recordedCount || 0),
        typed_memory_selector_consumption_idempotent_count: Number(typedMemorySelectorConsumption?.idempotentCount || 0),
        typed_memory_selector_consumption_skipped_count: Number(typedMemorySelectorConsumption?.skippedCount || 0),
        typed_memory_stale_candidate_ledger: typedMemoryStaleCandidateLedger,
        typed_memory_stale_candidate_ledger_file: typedMemoryStaleCandidateLedger?.file || "",
        post_compact_dispatch_markers: postCompactDispatchMarkers,
        post_compact_dispatch_marker_count: postCompactDispatchMarkers.length,
        post_compact_dispatch_marker_summary: postCompactDispatchMarkerSummary,
        actions,
        files_changed: filesChanged,
        actual_file_changes: actualFileChanges,
        actual_file_change_count: actualFileChanges.length,
        has_actual_file_changes: actualFileChanges.length > 0,
        verification,
        verification_executed: verificationGate.executed,
        verification_suggested: verificationGate.suggested,
        verification_failed: verificationGate.failed,
        verification_required: requiredVerificationCoverage.required,
        verification_required_missing: requiredVerificationCoverage.missing,
        verification_required_covered: requiredVerificationCoverage.covered,
        external_runner_verification: externalRunnerVerification,
        external_runner_verification_count: externalRunnerVerification.length,
        verification_sources: [
            ...(externalRunnerVerification.length ? ["external_runner"] : []),
            ...(independentVerificationSourcePassed ? ["test_agent_and_main_agent_spot_check"] : []),
            ...(verificationGate.executed.length > externalRunnerVerification.length ? ["agent_receipt"] : []),
        ],
        verification_source_gate_passed: !(0, collaboration_1.taskRequiresVerification)(task)
            || externalRunnerVerification.length > 0
            || independentVerificationSourcePassed,
        has_executed_verification: verificationGate.executed.length > 0,
        verification_required_gate_passed: requiredVerificationCoverage.pass,
        verification_gate_passed: verificationGate.pass && requiredVerificationCoverage.pass,
        independent_review_required: independentReviewGate.required,
        independent_review_gate: independentReviewGate,
        independent_review_gate_passed: independentReviewGate.pass,
        independent_review_evidence: independentReviewGate.evidence,
        post_review_spot_check_required: postReviewSpotCheckGate.required,
        post_review_spot_check_gate: postReviewSpotCheckGate,
        post_review_spot_check_gate_passed: postReviewSpotCheckGate.pass,
        post_review_spot_check: postReviewSpotCheckGate.latest,
        post_review_spot_check_summary: postReviewSpotCheckGate.summary,
        blockers,
        needs,
        blocking_needs: blockingNeeds,
        advisory_needs: advisoryNeeds,
        review_status: reviewStatus,
        has_final_review: !!review,
        lifecycle: {
            state: lifecycleState,
            terminal: ["completed", "cancelled"].includes(lifecycleState),
            final_acceptance_required: true,
            session_close_rule: "only_after_final_acceptance_or_explicit_cancel",
        },
        session_continuity: sessionContinuity,
        session_count: sessionContinuity.length,
        native_session_count: sessionContinuity.filter((item) => item.resume_mode === "native" && item.native_session_id).length,
        degraded_session_count: sessionContinuity.filter((item) => item.degraded).length,
        work_items: deliveryWorkItems,
        work_item_summary: deliveryWorkItemSummary,
        team_shutdown: teamShutdown,
        team_shutdown_gate_passed: teamShutdown.pass,
        runtime_tooling: (0, collaboration_1.collectRuntimeToolingFromSources)(task, execution, [], receiptEvidence),
        generated_at: new Date().toISOString(),
    };
    summary.runtime_kernel = (0, collaboration_1.buildRuntimeKernelSnapshot)(task, summary);
    summary.acceptance_gate = buildAcceptanceGate(task, execution, summary, finalStatus);
    summary.acceptance_gate_passed = summary.acceptance_gate.pass;
    summary.reasoning_loop = (0, reasoning_loop_1.buildTaskReasoningState)(task, summary);
    summary.plan_version = summary.reasoning_loop.plan_version;
    summary.reasoning_deviation_count = summary.reasoning_loop.deviations.length;
    summary.reasoning_open_assertions = summary.reasoning_loop.assertions.filter((item) => item.status !== "passed").length;
    summary.timeline_count = Array.isArray(summary.timeline) ? summary.timeline.length : 0;
    summary.delivery_report = (0, task_delivery_report_1.buildTaskDeliveryReport)(task, summary, finalStatus, execution?.report || execution?.result || execution?.detail || "");
    summary.user_report = summary.delivery_report.markdown || (0, task_delivery_report_1.buildUserDeliveryReport)(task, summary, finalStatus, execution?.report || execution?.result || execution?.detail || "");
    return summary;
}
function getTaskExecutionFromReceipt(response, receipt, details = {}) {
    if (!receipt) {
        if ((0, agent_receipts_1.checkTaskFailure)(response)) {
            return (0, collaboration_1.buildTaskExecutionResult)("failed", response, { ...details, detail: details.detail || "Agent 输出包含失败标记" });
        }
        if ((0, agent_receipts_1.checkTaskCompletion)(response)) {
            return (0, collaboration_1.buildTaskExecutionResult)("done", response, { ...details, detail: details.detail || "兼容旧 Agent：检测到完成标记但缺少结构化结果说明" });
        }
        return (0, collaboration_1.buildTaskExecutionResult)("waiting", response, { ...details, detail: details.detail || "缺少结构化结果说明，无法可靠验收" });
    }
    if (receipt.status === "done") {
        return (0, collaboration_1.buildTaskExecutionResult)("done", response, { ...details, receipt, detail: receipt.summary || details.detail || "子 Agent 结果说明确认完成" });
    }
    if (receipt.status === "failed") {
        return (0, collaboration_1.buildTaskExecutionResult)("failed", response, { ...details, receipt, detail: receipt.summary || receipt.blockers?.join("；") || details.detail || "子 Agent 结果说明失败" });
    }
    return (0, collaboration_1.buildTaskExecutionResult)("waiting", response, { ...details, receipt, detail: receipt.summary || receipt.blockers?.join("；") || details.detail || `子 Agent 结果说明状态为 ${receipt.status}` });
}
function buildEvidenceGateFollowUps(group, outputs) {
    const routable = new Set((0, group_orchestrator_1.getRoutableMembers)(group).map((m) => m.project));
    const seen = new Set();
    const followUps = [];
    const followUpSummary = (value, fallback = "补齐结果说明和验证证据") => (0, display_1.sanitizeMainAgentUserText)((0, memory_1.compactMemoryText)(value || fallback, 56), fallback, 56);
    for (const output of [...(outputs || [])].reverse()) {
        const text = String(output || "");
        const agent = (0, agent_notifications_1.getCollectedOutputAgent)(text);
        if (!agent || !routable.has(agent) || seen.has(agent))
            continue;
        const notificationStatus = (0, agent_notifications_1.extractTaskNotificationTag)(text, "status");
        const status = (0, agent_notifications_1.getCollectedOutputReceiptStatus)(text);
        const receipt = (0, collaboration_1.parseFormattedReceiptsFromText)(text)[0];
        const structuredTestAgentReview = (0, collaboration_1.isCoordinatorTestAgentName)(agent)
            && !!(receipt?.testAgentReport
                || receipt?.test_agent_report
                || receipt?.testAgentHandoff
                || receipt?.test_agent_handoff
                || receipt?.independentReview
                || receipt?.independent_review);
        if (structuredTestAgentReview) {
            seen.add(agent);
            continue;
        }
        if (notificationStatus === "missing_receipt" || text.includes("结构化回执：缺失")) {
            seen.add(agent);
            followUps.push({
                mention: `@${agent}`,
                targetName: agent,
                project: agent,
                summary: "补齐可验收结果说明",
                message: "主 Agent 验收未收到你的 CCM_AGENT_RECEIPT。请补充结构化回执，并明确：实际完成事项、是否修改文件、验证方式、阻塞点；不能把建议当作已完成。",
                reason: "缺少结构化结果说明，主 Agent 无法验收完成状态",
            });
            continue;
        }
        if (status && status !== "done") {
            seen.add(agent);
            followUps.push({
                mention: `@${agent}`,
                targetName: agent,
                project: agent,
                summary: followUpSummary(`处理结果说明状态 ${status}`),
                message: `主 Agent 验收发现你的回执状态为 ${status}。请继续处理到可验收状态，或明确说明仍需用户/其他 Agent 提供什么；完成后必须再次提交 CCM_AGENT_RECEIPT，status 只能在确有证据时写 done。`,
                reason: `结构化结果说明状态不是 done：${status}`,
            });
            continue;
        }
        const verificationGate = (0, collaboration_1.getVerificationEvidenceGate)(receipt ? [receipt] : []);
        if (status === "done" && !verificationGate.pass) {
            seen.add(agent);
            const reason = verificationGate.failed.length
                ? `验证未通过：${verificationGate.failed.join("；")}`
                : verificationGate.suggested.length
                    ? `验证记录只是建议或未执行：${verificationGate.suggested.join("；")}`
                    : "缺少已执行验证记录";
            followUps.push({
                mention: `@${agent}`,
                targetName: agent,
                project: agent,
                summary: "补齐已执行验证证据",
                message: `主 Agent 验收发现你的 done 回执缺少可采信的已执行验证证据。请实际运行必要检查或说明人工核验结果；如果验证失败，先修复后再提交 CCM_AGENT_RECEIPT。当前缺口：${reason}`,
                reason,
            });
            continue;
        }
        const requiredVerificationCoverage = (0, collaboration_1.getRequiredVerificationCoverage)(receipt ? [receipt] : []);
        if (status === "done" && !requiredVerificationCoverage.pass) {
            seen.add(agent);
            const missing = requiredVerificationCoverage.missing
                .map((item) => item.required.join(" / "))
                .join("；");
            const reason = `缺少项目配置验证命令执行证据：${missing}`;
            followUps.push({
                mention: `@${agent}`,
                targetName: agent,
                project: agent,
                summary: "补跑项目验证命令",
                message: `主 Agent 验收发现你的 done 回执没有覆盖项目配置的验证命令。请实际运行以下命令之一并把命令与结果写入 CCM_AGENT_RECEIPT.verification；如果无法运行，请写明人工核验结果和原因。需要覆盖：${missing}`,
                reason,
            });
        }
    }
    return followUps;
}
function buildIndependentReviewGateFollowUps(input) {
    const task = input.task || (0, collaboration_1.getTaskById)(input.taskId || "");
    if (!task || task.assign_type !== "group")
        return [];
    const outputText = (input.outputs || []).filter(Boolean).join("\n\n---\n\n");
    const receipts = [
        ...(Array.isArray(input.execution?.receipt) ? input.execution.receipt : input.execution?.receipt ? [input.execution.receipt] : []),
        ...(0, collaboration_1.parseFormattedReceiptsFromText)(outputText),
    ].filter(Boolean);
    const actualFileChanges = (0, collaboration_1.collectTaskActualFileChanges)(task, input.execution || {});
    const agentQa = task.group_id ? (0, agent_qa_service_1.getAgentQaItemsForGroup)(task.group_id).filter((item) => !task.id || item.task_id === task.id) : [];
    const gate = buildIndependentReviewGate(task, actualFileChanges, receipts, agentQa);
    if (!gate.required || gate.pass || gate.status === "failed")
        return [];
    const existingText = (input.existingFollowUps || [])
        .map((item) => [item?.summary, item?.reason, item?.message, item?.task, item?.rework_kind, item?.kind].filter(Boolean).join("\n"))
        .join("\n");
    const assignmentEvidence = (0, collaboration_1.collectTaskAssignmentEvidence)(task, input.execution || {});
    const subject = (0, collaboration_1.inferIndependentReviewSubject)({ task, actualFileChanges, receipts, assignmentEvidence });
    if (!subject)
        return [];
    if (gate.status === "needs_recheck") {
        if (/test_agent_review_recheck|重新运行\s*TestAgent|重新复验/i.test(existingText))
            return [];
        const sourceReceipt = (0, collaboration_1.findLatestTestAgentReviewReceipt)(receipts, "needs_recheck");
        const recheck = (0, collaboration_1.buildTestAgentReviewRecheckFollowUp)({
            subject: (0, collaboration_1.getReceiptIndependentReviewSubject)(sourceReceipt, subject),
            reason: gate.recheck_evidence?.[0]?.summary || gate.reason || "TestAgent 复核证据尚未闭环",
            handoff: (0, collaboration_1.getReceiptTestAgentHandoff)(sourceReceipt),
            source: "independent_review_needs_recheck",
        });
        return recheck ? [recheck] : [];
    }
    if (gate.status === "needs_environment") {
        if (/test_agent_environment_prepare|补齐.{0,12}(?:环境|登录|运行条件)/i.test(existingText))
            return [];
        const sourceReceipt = (0, collaboration_1.findLatestTestAgentReviewReceipt)(receipts, "needs_environment");
        const carriedHandoff = (0, collaboration_1.getReceiptTestAgentHandoff)(sourceReceipt);
        const reviewSubject = (0, collaboration_1.getReceiptIndependentReviewSubject)(sourceReceipt, subject);
        return [{
                mention: `@${reviewSubject}`,
                targetName: reviewSubject,
                project: reviewSubject,
                summary: "补齐 TestAgent 复核条件",
                message: [
                    `TestAgent 暂时无法完成 ${reviewSubject} 的独立复核，当前缺少环境、登录或运行条件。`,
                    "请只补齐复核所需条件并确认服务可运行、测试账号可用或必要配置已生效；不要把环境准备误写成业务代码已经通过。",
                    "完成后提交 CCM_AGENT_RECEIPT，明确补齐了什么条件、如何确认可用、是否仍需用户提供信息。",
                    "主 Agent 收到可用结果后会自动沿用原复核工作单重新运行 TestAgent。",
                ].join("\n"),
                reason: gate.environment_evidence?.[0]?.summary || gate.reason || "TestAgent 复核受环境、登录或运行条件阻塞",
                rework_kind: "test_agent_environment_prepare",
                testAgentEnvironmentPreparation: true,
                test_agent_environment_preparation: true,
                rerunTestAgentAfterCompletion: true,
                rerun_test_agent_after_completion: true,
                reviewSubject,
                originalTarget: reviewSubject,
                testAgentRecheckHandoff: carriedHandoff,
                test_agent_recheck_handoff: carriedHandoff,
                userTaskPreview: `补齐 ${reviewSubject} 的复核环境，完成后自动重新运行 TestAgent`,
            }];
    }
    if (/独立.{0,12}(?:验证|复核|检查)|(?:非|不是)原实现者|request_review|fresh\s+verifier|independent\s+(?:verification|review)|code\s+review/i.test(existingText)) {
        return [];
    }
    const highRiskFiles = (gate.high_risk_files || []).map((item) => item.path || "").filter(Boolean).slice(0, 5);
    const reason = gate.reason || "复杂代码变更需要另一个 Agent 复核";
    return [{
            mention: `@${subject}`,
            targetName: subject,
            project: subject,
            summary: "补齐复杂变更独立复核证据",
            message: [
                `主 Agent 验收发现 ${subject} 的交付需要独立复核。请让非原实现者只读检查本次目标覆盖、关键风险、文件变化和已执行验证证据。`,
                highRiskFiles.length ? `重点复核文件：${highRiskFiles.join("、")}` : "",
                "请给出明确结论：通过、需要返工或仍需用户确认；不要只复述原实现者的结论。",
            ].filter(Boolean).join("\n"),
            reason,
            rework_kind: "independent_review_gate",
            independentReviewGate: gate,
            userTaskPreview: `补齐独立复核：复核 ${subject} 的交付证据`,
        }];
}
function buildFailedIndependentReviewReworkFollowUps(input) {
    const task = input.task || (0, collaboration_1.getTaskById)(input.taskId || "");
    if (!task || task.assign_type !== "group")
        return [];
    const outputText = (input.outputs || []).filter(Boolean).join("\n\n---\n\n");
    const receipts = [
        ...(Array.isArray(input.execution?.receipt) ? input.execution.receipt : input.execution?.receipt ? [input.execution.receipt] : []),
        ...(0, collaboration_1.parseFormattedReceiptsFromText)(outputText),
    ].filter(Boolean);
    const actualFileChanges = (0, collaboration_1.collectTaskActualFileChanges)(task, input.execution || {});
    const agentQa = task.group_id ? (0, agent_qa_service_1.getAgentQaItemsForGroup)(task.group_id).filter((item) => !task.id || item.task_id === task.id) : [];
    const gate = buildIndependentReviewGate(task, actualFileChanges, receipts, agentQa);
    if (!gate.required || gate.status !== "failed" || !Array.isArray(gate.failed_evidence) || gate.failed_evidence.length === 0)
        return [];
    const assignmentEvidence = (0, collaboration_1.collectTaskAssignmentEvidence)(task, input.execution || {});
    const fallbackSubject = (0, collaboration_1.inferIndependentReviewSubject)({ task, actualFileChanges, receipts, assignmentEvidence });
    const sourceReviewReceipt = (0, collaboration_1.findLatestTestAgentReviewReceipt)(receipts, "failed");
    const sourceTestAgentHandoff = (0, collaboration_1.getReceiptTestAgentHandoff)(sourceReviewReceipt);
    const routable = new Set((0, group_orchestrator_1.getRoutableMembers)(input.group).map((member) => String(member?.project || "").trim()).filter(Boolean));
    const existingFollowUps = Array.isArray(input.existingFollowUps) ? input.existingFollowUps : [];
    const targetFromEvidence = (item) => {
        const candidates = (0, collaboration_1.uniqueStrings)(item?.reviewSubject, item?.review_subject, item?.subject, item?.requester, fallbackSubject, task?.target_project, task?.targetProject).filter((value) => value && !(0, collaboration_1.isReviewLikeAgentName)(value));
        return candidates.find((value) => routable.size === 0 || routable.has(value)) || "";
    };
    const grouped = new Map();
    for (const failed of gate.failed_evidence || []) {
        const target = targetFromEvidence(failed);
        if (!target)
            continue;
        const current = grouped.get(target) || [];
        current.push(failed);
        grouped.set(target, current);
    }
    const followUps = [];
    for (const [target, failures] of grouped.entries()) {
        const existingSameTargetText = existingFollowUps
            .filter((item) => String(item?.targetName || item?.project || item?.agent || "").trim() === target)
            .map((item) => [item?.summary, item?.reason, item?.message, item?.task, item?.rework_kind, item?.kind].filter(Boolean).join("\n"))
            .join("\n");
        if (/(?:TestAgent|复核|验证).{0,30}(?:未通过|不通过|返工|失败)|failed_review|test_agent_failed/i.test(existingSameTargetText)) {
            continue;
        }
        const reviewers = (0, collaboration_1.uniqueStrings)(failures.map((item) => item?.reviewer).filter(Boolean)).slice(0, 3);
        const findingLines = (0, collaboration_1.uniqueStrings)(failures.map((item) => item?.summary).filter(Boolean), failures.flatMap((item) => Array.isArray(item?.evidence) ? item.evidence : [])).map((item) => (0, memory_1.compactMemoryText)(item, 260)).filter(Boolean).slice(0, 8);
        const reviewerLabel = reviewers.length ? reviewers.join("、") : "TestAgent";
        const reason = `${reviewerLabel} 复核未通过，需要原实现成员修复后重新复核`;
        followUps.push({
            mention: `@${target}`,
            targetName: target,
            project: target,
            summary: "复核未通过，交回原实现成员返工",
            message: [
                `${reviewerLabel} 已判定 ${target} 的交付还不能验收。请回到原实现上下文修复失败点，修复后重新提交 CCM_AGENT_RECEIPT；主 Agent 会再次运行 TestAgent 复核。`,
                findingLines.length ? "复核发现：" : "",
                ...findingLines.map((line) => `- ${line}`),
                "返工要求：修复根因，不只改表面现象；补跑与失败点相关的最小必要验证；在结果说明里写清楚修复内容、验证结果和剩余风险。",
                "下一步：返工完成后，主 Agent 会自动沿用原工作单重新运行 TestAgent 复核；只有复核通过后才能给用户做完成总结。",
            ].filter(Boolean).join("\n"),
            reason,
            rework_kind: "test_agent_failed_review_rework",
            reviewFailed: true,
            reviewSubject: target,
            originalTarget: target,
            rerunTestAgentAfterCompletion: true,
            rerun_test_agent_after_completion: true,
            testAgentRecheckHandoff: sourceTestAgentHandoff,
            test_agent_recheck_handoff: sourceTestAgentHandoff,
            failedReviewGate: gate,
            failedReviewEvidence: failures,
            userTaskPreview: `返工 ${target}：复核未通过，修复后重新复核`,
        });
    }
    return (0, memory_1.uniqueByKey)(followUps, (item) => `${String(item?.targetName || item?.project || "").trim()}|test_agent_failed_review_rework`, 12);
}
function testAgentDecisionReceiptStatus(report, verdict) {
    if (verdict?.canAccept === true)
        return "done";
    if (verdict?.needsRework === true)
        return "failed";
    if (verdict?.needsRecheck === true || verdict?.needsEnvironment === true)
        return "blocked";
    if (verdict?.needsHuman === true)
        return "blocked";
    return (0, collaboration_1.testAgentStatusToReceiptStatus)(verdict?.status || report.status);
}
function buildNativeTestAgentReceipt(targetName, report, handoff = null, workOrder = null, invocationResult = null) {
    return require("./collaboration-test-agent-runtime").buildNativeTestAgentReceipt(targetName, report, handoff, workOrder, invocationResult);
}
function buildNativeTestAgentPlanBlockedReceipt(targetName, plan, dispatch = null, handoff = null) {
    return require("./collaboration-test-agent-runtime").buildNativeTestAgentPlanBlockedReceipt(targetName, plan, dispatch, handoff);
}
function runtimeToolDispatchBlockedReceipt(projectName, runtimeToolContext = {}) {
    const message = (0, collaboration_1.runtimeToolDispatchBlockedMessage)(projectName, runtimeToolContext);
    return {
        agent: projectName,
        status: "blocked",
        summary: message,
        actions: [],
        filesChanged: [],
        verification: [],
        blockers: [message],
        needs: ["在 CCM 工具配置中修复缺失 MCP/Skill，或从项目/群聊授权中移除不可用项后重新派发"],
        runtimeToolDispatchGate: runtimeToolContext.dispatchGate || runtimeToolContext.audit?.dispatch_gate || null,
    };
}
function canCompleteDailyDevFromDeliverySummary(task, execution, summary) {
    if (task?.workflow_type !== "daily_dev")
        return false;
    if (!summary || execution?.status === "failed")
        return false;
    const receiptStatuses = Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses : [];
    const hasDoneReceipt = receiptStatuses.some((item) => item?.status === "done")
        || execution?.receipt?.status === "done"
        || task?.receipt?.status === "done";
    const hasBlockingReceipt = receiptStatuses.some((item) => ["failed", "blocked", "needs_info", "partial"].includes(String(item?.status || "")));
    const actualChangeCount = Number(summary.actual_file_change_count || task?.file_changes?.count || execution?.fileChanges?.count || 0);
    const executedVerificationCount = Number(summary.verification_executed?.length || 0);
    const coordinationPlanCount = Number(summary.coordination_plan_count || 0);
    const assignmentCount = Number(summary.assignment_count || 0);
    const workerNotificationCount = Number(summary.worker_notification_count || 0);
    const openSummaryItems = [
        ...(Array.isArray(summary.blockers) ? summary.blockers : []),
        ...(Array.isArray(summary.blocking_needs)
            ? summary.blocking_needs
            : (Array.isArray(summary.needs) ? summary.needs.filter((item) => !(0, collaboration_1.isAdvisoryNeed)(item, task)) : [])),
        ...(Array.isArray(summary.verification_failed) ? summary.verification_failed : []),
        ...(Array.isArray(summary.verification_suggested) ? summary.verification_suggested : []),
    ].filter(Boolean);
    if (hasBlockingReceipt || openSummaryItems.length > 0)
        return false;
    if (coordinationPlanCount <= 0 || assignmentCount <= 0 || workerNotificationCount <= 0)
        return false;
    if (!hasDoneReceipt || !summary.has_final_review)
        return false;
    if ((0, collaboration_1.taskRequiresCodeChanges)(task) && actualChangeCount <= 0)
        return false;
    if ((0, collaboration_1.taskRequiresVerification)(task) && executedVerificationCount <= 0)
        return false;
    if ((0, collaboration_1.taskRequiresVerification)(task) && summary.verification_required_gate_passed === false)
        return false;
    if ((0, collaboration_1.taskRequiresVerification)(task) && summary.verification_source_gate_passed !== true)
        return false;
    if (summary.independent_review_required === true && summary.independent_review_gate_passed !== true)
        return false;
    if (summary.post_review_spot_check_required === true && summary.post_review_spot_check_gate_passed !== true)
        return false;
    if (((0, collaboration_1.taskRequiresCodeChanges)(task) || (0, collaboration_1.taskRequiresVerification)(task)) && summary.ack_gate_passed !== true)
        return false;
    if (((0, collaboration_1.taskRequiresCodeChanges)(task) || (0, collaboration_1.taskRequiresVerification)(task)) && summary.receipt_quality_gate_passed !== true)
        return false;
    if (summary.contract_injection_gate_passed === false)
        return false;
    if (summary.work_item_summary?.total && summary.work_item_summary.all_completed !== true)
        return false;
    if (summary.acceptance_gate && summary.acceptance_gate.pass !== true)
        return false;
    return true;
}
function buildTaskGapContinuationDraft(task) {
    const summary = task?.delivery_summary || {};
    const workerNotifications = Array.isArray(summary.worker_notifications) ? summary.worker_notifications : [];
    const assignmentEvidence = Array.isArray(summary.assignment_evidence) ? summary.assignment_evidence : [];
    const coordinationPlanCount = Number(summary.coordination_plan_count || 0);
    const assignmentCount = Number(summary.assignment_count || assignmentEvidence.length || 0);
    const workerNotificationCount = Number(summary.worker_notification_count || workerNotifications.length || 0);
    const relatedWorkers = (0, collaboration_1.uniqueStrings)([
        ...workerNotifications.map((item) => item.task_id),
        ...assignmentEvidence.map((item) => item.project),
        ...((Array.isArray(summary.receipts) ? summary.receipts : []).map((item) => item.agent)),
        ...((Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses : []).map((item) => item.agent)),
        ...((Array.isArray(summary.verification_required_missing) ? summary.verification_required_missing : []).map((item) => item.agent)),
    ].filter(Boolean)).slice(0, 8);
    const lines = [
        `请继续推进任务：${task?.title || ""}`,
        "",
    ];
    if (relatedWorkers.length) {
        lines.push("同一子 Agent 续跑目标：");
        relatedWorkers.forEach(worker => lines.push(`- ${worker}：continuationStrategy=same_worker_scratchpad，优先承接上一轮执行结果和结果说明继续处理。`));
        lines.push("");
    }
    if (workerNotifications.length) {
        lines.push("上一轮子 Agent 执行结果：");
        workerNotifications.slice(0, 10).forEach((item) => {
            lines.push(`- ${item.task_id || "未知子 Agent"}：执行状态 ${item.status || "unknown"} / 结果说明 ${item.receipt_status || "missing"}；${String(item.summary || item.result || "无摘要").slice(0, 500)}`);
        });
        lines.push("");
    }
    const blockers = [
        ...(Array.isArray(summary.blockers) ? summary.blockers : []),
        ...(Array.isArray(summary.needs) ? summary.needs : []),
    ].filter(Boolean);
    if (blockers.length) {
        lines.push("需要处理的阻塞/待补充：");
        blockers.slice(0, 10).forEach((item) => lines.push(`- ${String(item).slice(0, 500)}`));
        lines.push("");
    }
    const coordinationGaps = [
        coordinationPlanCount > 0 ? "" : "缺少主 Agent 协调计划证据：请先重新理解业务文档，输出可验收的协调计划，再派发 Worker。",
        assignmentCount > 0 ? "" : "缺少主 Agent 派发证据：请生成 self-contained assignment，并明确派发给目标项目子 Agent。",
        workerNotificationCount > 0 ? "" : "缺少子 Agent 执行结果：请让目标子 Agent 实际执行，并提交可验收的结构化结果说明。",
    ].filter(Boolean);
    if (coordinationGaps.length) {
        lines.push("需要补齐的主 Agent 协作证据：");
        coordinationGaps.forEach(item => lines.push(`- ${item}`));
        lines.push("");
    }
    if (summary.agent_qa_required && summary.agent_qa_gate_passed !== true) {
        lines.push("需要补齐的 Agent 协作问答证据：");
        lines.push(`- 当前问答 ${Number(summary.agent_qa_count || 0)} 条、采纳 ${Number(summary.agent_qa_accepted_count || 0)} 条、回答后续跑 ${Number(summary.agent_qa_resumed_count || 0)} 条。`);
        lines.push("- 让实际被阻塞的子 Agent 输出 ask_agent/request_review，目标 Agent 提供文件、合同或验证证据；主 Agent 采纳后必须自动恢复原任务会话。不得用普通 @消息冒充 Agent QA。");
        lines.push("");
    }
    const ackRewriteRows = (0, protocol_gates_1.getTaskAckRewriteRows)(task);
    if (ackRewriteRows.length) {
        lines.push("需要先返工的 ACK 前置审核：");
        ackRewriteRows.slice(0, 10).forEach((row) => {
            lines.push(`- ${row.agent}：${row.reason || "ACK 不合格"}。请只重写接单 ACK，必须包含 understoodGoal、plannedScope、forbiddenScope、verificationPlan、unclear。`);
            if (row.unclear?.length)
                lines.push(`  - 未澄清项：${row.unclear.join("；")}`);
        });
        lines.push("- ACK 未通过前不得宣布 daily_dev 完成；ACK 合格后再继续实现、验证或验收。");
        lines.push("");
    }
    const contractInjection = (0, protocol_gates_1.getTaskContractInjectionRows)(task);
    const contractGate = (0, protocol_gates_1.evaluateContractInjectionGate)(contractInjection.rows, Array.isArray(summary.assignment_evidence) ? summary.assignment_evidence : [], Array.isArray(summary.receipts) ? summary.receipts : []);
    if (contractGate.required && !contractGate.pass) {
        lines.push("需要注入依赖 Agent 的 contractChanges：");
        contractGate.missing.slice(0, 12).forEach((row) => {
            const endpoint = row.endpoint || row.type || "contract";
            const injection = (0, runtime_kernel_1.buildContractInjectionEvent)({
                traceId: task?.trace_id || task?.traceId || "",
                taskId: task?.id || "",
                sourceAgent: row.source || row.source_agent || row.producer || "",
                targetAgent: row.target || row.consumer || "",
                contract: row,
            });
            lines.push(`- ${row.target}：续跑同一任务和同 Agent 会话，注入 ${endpoint}；injection_id=${injection.injection_id}。${row.summary || "结构化契约变化需要同步给消费者 Agent"}`);
        });
        contractGate.unconsumed.slice(0, 12).forEach((row) => {
            const endpoint = row.endpoint || row.type || "contract";
            lines.push(`- ${row.target}：已收到 ${endpoint} 注入但回执未完成消费；请复用原任务和同 Agent 会话续跑，回执 consumedInjectionIds 必须包含 ${row.injection_id}，contractConsumption 必须写 status=adapted/no_change/not_required 之一，并附适配/无需适配/验证证据。${row.consumption_reason ? `当前问题：${row.consumption_reason}` : ""}`);
        });
        lines.push("- 主 Agent 必须优先复用原任务、原 Trace、原 native session/scratchpad，通过同一任务卡继续派发，不要新建无关任务。");
        lines.push("- 依赖 Agent 收到注入后必须说明是否需要适配代码、是否已完成适配和验证；回执里保留 contractChanges 消费结论，并引用对应 injection_id。");
        lines.push("");
    }
    if (Array.isArray(summary.verification_required_missing) && summary.verification_required_missing.length) {
        lines.push("需要补齐的项目验证命令证据：");
        summary.verification_required_missing.slice(0, 10).forEach((item) => {
            const required = Array.isArray(item?.required) ? item.required.join(" / ") : "项目配置验证命令";
            lines.push(`- ${item?.agent || "未知 Agent"}：请实际运行并回执 ${required}`);
        });
        lines.push("");
    }
    if (Array.isArray(summary.verification_suggested) && summary.verification_suggested.length) {
        lines.push("以下验证只是建议或未执行，需要改为实际执行结果：");
        summary.verification_suggested.slice(0, 10).forEach((item) => lines.push(`- ${String(item).slice(0, 500)}`));
        lines.push("");
    }
    if (Array.isArray(summary.verification_failed) && summary.verification_failed.length) {
        lines.push("以下验证失败，需要修复后重新验证：");
        summary.verification_failed.slice(0, 10).forEach((item) => lines.push(`- ${String(item).slice(0, 500)}`));
        lines.push("");
    }
    if (summary.independent_review_required === true && summary.independent_review_gate_passed !== true) {
        const independentGate = summary.independent_review_gate || {};
        const failedEvidence = Array.isArray(independentGate.failed_evidence) ? independentGate.failed_evidence : [];
        if (independentGate.status === "failed" || failedEvidence.length) {
            lines.push("复杂变更复核未通过，需要原实现成员返工：");
            lines.push(`- 触发原因：${independentGate.reason || "复杂代码变更复核未通过"}`);
            failedEvidence.slice(0, 6).forEach((item) => {
                const subject = item.reviewSubject || item.review_subject || item.requester || "";
                const reviewer = item.reviewer || "TestAgent";
                const summaryLine = (0, memory_1.compactMemoryText)(item.summary || (Array.isArray(item.evidence) ? item.evidence.join("；") : "") || "复核未通过", 420);
                lines.push(`- ${subject ? `${subject}：` : ""}${reviewer} 复核未通过；${summaryLine}`);
            });
            lines.push("- 让原实现成员复用同一任务和同一子 Agent 上下文修复失败点；修复后重新提交结果说明，并重新运行 TestAgent/独立复核。");
            lines.push("- 主 Agent 不能把失败复核当作已完成；只有修复后复核通过，才能进入最终总结。");
        }
        else {
            lines.push("需要补齐的复杂变更独立复核：");
            lines.push(`- 触发原因：${independentGate.reason || "复杂代码变更需要另一个 Agent 复核"}`);
            const highRiskFiles = Array.isArray(independentGate.high_risk_files) ? independentGate.high_risk_files : [];
            highRiskFiles.slice(0, 8).forEach((item) => {
                lines.push(`- 高风险文件：${[item.project, item.path].filter(Boolean).join(": ")}`);
            });
            lines.push("- 让非原实现者的 Agent 使用 request_review 做只读复核，检查目标覆盖、关键风险和验证证据；主 Agent 采纳回答后必须回到原任务继续收敛。");
            lines.push("- 或让第三方写代码 Agent 在 CCM_AGENT_RECEIPT.independentReview / codeReview 中返回 reviewer、verdict=passed、summary 和 evidence。");
        }
        lines.push("");
    }
    if (summary.post_review_spot_check_required === true && summary.post_review_spot_check_gate_passed !== true) {
        const spotCheckGate = summary.post_review_spot_check_gate || {};
        const spotCheckSummary = summary.post_review_spot_check_summary || spotCheckGate.summary || {};
        lines.push("TestAgent 通过后的完成前抽查尚未通过：");
        lines.push(`- ${spotCheckSummary.headline || spotCheckGate.reason || "主 Agent 还没有完成关键验证抽查。"}`);
        lines.push("- 优先沿用原 TestAgent 工作单重新复验，并根据最新真实输出重新判断。");
        lines.push("- 抽查与 TestAgent 结论一致前，不能进入最终完成总结。");
        lines.push("");
    }
    const receipts = [
        ...(Array.isArray(summary.receipts) ? summary.receipts : []),
        ...(Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses : []),
    ].filter((item) => item && item.status && item.status !== "done");
    if (receipts.length) {
        lines.push("需要跟进的子 Agent 结果说明：");
        receipts.slice(0, 8).forEach((item) => {
            lines.push(`- ${item.agent || "未知 Agent"}：${item.status || "unknown"}；${String(item.summary || item.message || "无摘要").slice(0, 500)}`);
            const needs = [
                ...(Array.isArray(item.blockers) ? item.blockers : []),
                ...(Array.isArray(item.needs) ? item.needs : []),
            ].filter(Boolean);
            needs.slice(0, 5).forEach((need) => lines.push(`  - ${String(need).slice(0, 500)}`));
        });
        lines.push("");
    }
    if (task?.review?.content || task?.review?.summary) {
        lines.push("主 Agent 复盘提示：");
        lines.push(String(task.review.content || task.review.summary).slice(0, 1200));
        lines.push("");
    }
    lines.push("继续执行要求：");
    lines.push("- 主 Agent 先判断这些阻塞是否已被本次补充消解。");
    lines.push("- 如可继续，优先派发给相关子 Agent 返工，并保持同一子 Agent 上下文续跑；不要重新派给无关 Agent。");
    lines.push("- 子 Agent 返工工作单必须写清上一轮执行结果/结果说明缺口、补齐动作、实际文件变更和验证命令。");
    lines.push("- 完成后仍需主 Agent 协调计划、派发证据、子 Agent 执行结果、结构化结果说明、主 Agent 复盘、实际变更证据和已执行验证记录。");
    return lines.filter((line, index, arr) => line || arr[index - 1]).join("\n").trim();
}
function getTaskGapItems(task) {
    const summary = task?.delivery_summary || {};
    const items = [];
    if (summary.acceptance_gate_passed === true && !(0, collaboration_1.hasStrongTaskAcceptanceEvidence)(task, [], summary))
        items.push("acceptance_evidence");
    if (Number(summary.coordination_plan_count || 0) <= 0)
        items.push("coordination_plan");
    if (Number(summary.assignment_count || 0) <= 0)
        items.push("assignment_evidence");
    if (Number(summary.worker_notification_count || 0) <= 0)
        items.push("worker_notification");
    for (const value of Array.isArray(summary.blockers) ? summary.blockers : [])
        items.push(`blocker:${(0, memory_1.compactMemoryText)(value, 240)}`);
    const blockingNeeds = Array.isArray(summary.blocking_needs)
        ? summary.blocking_needs
        : Array.isArray(summary.needs)
            ? summary.needs
            : [];
    for (const value of blockingNeeds)
        items.push(`need:${(0, memory_1.compactMemoryText)(value, 240)}`);
    for (const value of Array.isArray(summary.verification_failed) ? summary.verification_failed : [])
        items.push(`verification_failed:${(0, memory_1.compactMemoryText)(value, 240)}`);
    for (const value of Array.isArray(summary.verification_suggested) ? summary.verification_suggested : [])
        items.push(`verification_unexecuted:${(0, memory_1.compactMemoryText)(value, 240)}`);
    for (const value of Array.isArray(summary.verification_required_missing) ? summary.verification_required_missing : []) {
        const required = (Array.isArray(value?.required) ? value.required : []).map((item) => (0, memory_1.compactMemoryText)(item, 160)).sort().join("|");
        items.push(`verification_required:${(0, memory_1.compactMemoryText)(value?.agent || "agent", 80)}:${required}`);
    }
    const receipts = [
        ...(Array.isArray(summary.receipts) ? summary.receipts : []),
        ...(Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses : []),
    ];
    for (const receipt of receipts) {
        const status = String(receipt?.status || "").trim();
        if (status && status !== "done")
            items.push(`receipt:${(0, memory_1.compactMemoryText)(receipt?.agent || "agent", 80)}:${status}`);
    }
    for (const row of (0, protocol_gates_1.getTaskAckRewriteRows)(task)) {
        items.push(`ack_rewrite:${(0, memory_1.compactMemoryText)(row.agent, 80)}:${row.status}:${(0, memory_1.compactMemoryText)(row.reason, 180)}`);
    }
    const contractInjection = (0, protocol_gates_1.getTaskContractInjectionRows)(task);
    const contractGate = (0, protocol_gates_1.evaluateContractInjectionGate)(contractInjection.rows, Array.isArray(summary.assignment_evidence) ? summary.assignment_evidence : [], Array.isArray(summary.receipts) ? summary.receipts : []);
    for (const row of contractGate.missing || []) {
        items.push(`contract_inject:${(0, memory_1.compactMemoryText)(row.target, 80)}:${(0, memory_1.compactMemoryText)(row.endpoint || row.type || "contract", 180)}`);
    }
    for (const row of contractGate.unconsumed || []) {
        items.push(`contract_consume:${(0, memory_1.compactMemoryText)(row.target, 80)}:${(0, memory_1.compactMemoryText)(row.injection_id || row.endpoint || row.type || "contract", 180)}`);
    }
    const latestWorkerNotifications = new Map();
    for (const notification of Array.isArray(summary.worker_notifications) ? summary.worker_notifications : []) {
        const worker = (0, memory_1.compactMemoryText)(notification?.task_id || notification?.agent || "worker", 80);
        latestWorkerNotifications.set(worker.toLowerCase(), notification);
    }
    for (const notification of latestWorkerNotifications.values()) {
        const status = String(notification?.status || "").trim();
        const receiptStatus = String(notification?.receipt_status || "").trim();
        if (["failed", "blocked", "partial", "missing_receipt", "needs_info"].includes(status) || (receiptStatus && receiptStatus !== "done")) {
            items.push(`notification:${(0, memory_1.compactMemoryText)(notification?.task_id || notification?.agent || "worker", 80)}:${status}:${receiptStatus}`);
        }
    }
    if (summary.agent_qa_required === true && summary.agent_qa_gate_passed !== true)
        items.push("agent_qa_evidence");
    if (summary.independent_review_required === true && summary.independent_review_gate_passed !== true)
        items.push(`independent_review:${(0, memory_1.compactMemoryText)(summary.independent_review_gate?.reason || "required", 220)}`);
    return (0, collaboration_1.uniqueStrings)(items.filter(Boolean)).sort();
}
function getTaskGapFingerprint(task) {
    const items = getTaskGapItems(task);
    if (!items.length)
        return "";
    return crypto.createHash("sha256").update(JSON.stringify(items)).digest("hex").slice(0, 24);
}
function canAutoContinueTaskGaps(task) {
    if (!(0, collaboration_1.hasDailyDevContinuationGaps)(task))
        return false;
    const fingerprint = getTaskGapFingerprint(task);
    const previous = task?.collaboration_state?.gap || {};
    return !(fingerprint && previous.fingerprint === fingerprint && Number(previous.auto_attempts || 0) >= 1);
}
//# sourceMappingURL=collaboration-acceptance.js.map