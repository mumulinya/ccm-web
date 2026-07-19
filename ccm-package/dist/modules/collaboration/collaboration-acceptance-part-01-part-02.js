"use strict";
// Behavior-freeze split from collaboration-acceptance-part-01.ts (part 2/2).
// Behavior-freeze split from collaboration-acceptance.ts (part 1/2).
// Extracted functional module. The original entry remains a compatibility facade.
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDeliverySummary = buildDeliverySummary;
const db_1 = require("../../core/db");
const memory_1 = require("./memory");
const group_memory_index_1 = require("./group-memory-index");
const agent_qa_service_1 = require("./agent-qa-service");
const task_delivery_report_1 = require("./task-delivery-report");
const post_review_spot_check_1 = require("../../agents/post-review-spot-check");
const agent_notifications_1 = require("./agent-notifications");
const logs_1 = require("./logs");
const storage_1 = require("./storage");
const execution_kernel_1 = require("../../agents/execution-kernel");
const agent_sessions_1 = require("../../tasks/agent-sessions");
const reasoning_loop_1 = require("../../agents/reasoning-loop");
const protocol_gates_1 = require("./protocol-gates");
const work_items_1 = require("../../agents/work-items");
const collaboration_1 = require("./collaboration");
const collaboration_acceptance_part_01_part_01_1 = require("./collaboration-acceptance-part-01-part-01");
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
    const receipts = (0, collaboration_acceptance_part_01_part_01_1.selectLatestDurableReceipts)(receiptCandidates);
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
            const quality = (0, collaboration_acceptance_part_01_part_01_1.scoreChildAgentReceipt)(task, receipt, { memoryDispatchGates, globalMemoryReceiptGates, globalMemoryHealthGates, readPlanRevalidationGates, postCompactReinjectionGates, apiMicrocompactEditPlans, taskAgentMemoryContextSnapshots, assignmentEvidence, execution });
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
    const independentReviewGate = (0, collaboration_acceptance_part_01_part_01_1.buildIndependentReviewGate)(task, actualFileChanges, receiptEvidence, taskAgentQa);
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
    summary.acceptance_gate = (0, collaboration_acceptance_part_01_part_01_1.buildAcceptanceGate)(task, execution, summary, finalStatus);
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
//# sourceMappingURL=collaboration-acceptance-part-01-part-02.js.map