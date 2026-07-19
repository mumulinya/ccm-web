"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildUserReceiptReworkSummary = buildUserReceiptReworkSummary;
exports.buildUserCoordinationAcknowledgement = buildUserCoordinationAcknowledgement;
exports.sanitizeDispatchLaunchText = sanitizeDispatchLaunchText;
exports.normalizeGroupDispatchLaunchRowStatus = normalizeGroupDispatchLaunchRowStatus;
exports.taskAgentInvocationMemoryOptions = taskAgentInvocationMemoryOptions;
exports.taskAgentSessionLifecycleRunnerOptions = taskAgentSessionLifecycleRunnerOptions;
exports.buildWorkerContinuationHandoff = buildWorkerContinuationHandoff;
exports.extractMemoryDispatchFreshnessGate = extractMemoryDispatchFreshnessGate;
exports.renderMemoryDispatchFreshnessGateForContract = renderMemoryDispatchFreshnessGateForContract;
exports.buildChildAgentDevelopmentContract = buildChildAgentDevelopmentContract;
exports.isSuggestedOnlyVerification = isSuggestedOnlyVerification;
exports.isFailedVerification = isFailedVerification;
exports.splitEvidenceList = splitEvidenceList;
exports.buildProjectAgentProfileContractLines = buildProjectAgentProfileContractLines;
// Behavior-freeze split from collaboration-coordination-ux.ts (part 2/2).
/** Coordination protocol UX, runtime kernel display, and dispatch helpers. Behavior-preserving extraction from the collaboration facade. */
const collaboration_1 = require("./collaboration");
const collaboration_task_card_1 = require("./collaboration-task-card");
const collaboration_memory_gates_1 = require("./collaboration-memory-gates");
const memory_1 = require("./memory");
const worker_handoff_1 = require("../../agents/worker-handoff");
const collaboration_coordination_ux_part_01_1 = require("./collaboration-coordination-ux-part-01");
function buildUserReceiptReworkSummary(task, summary = {}, agentCoordination = null) {
    const assignments = Array.isArray(summary.assignment_evidence) ? summary.assignment_evidence : [];
    const receipts = [
        ...(Array.isArray(summary.receipts) ? summary.receipts : []),
        ...(Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses : []),
    ].filter(Boolean);
    const memoryDispatchGates = Array.isArray(summary.memory_dispatch_gates || summary.memoryDispatchGates)
        ? (summary.memory_dispatch_gates || summary.memoryDispatchGates)
        : (0, collaboration_memory_gates_1.collectTaskMemoryDispatchFreshnessGates)(task, { assignmentEvidence: assignments, execution: summary.execution || null });
    const globalMemoryReceiptGates = Array.isArray(summary.global_memory_receipt_gates || summary.globalMemoryReceiptGates)
        ? (summary.global_memory_receipt_gates || summary.globalMemoryReceiptGates)
        : (0, collaboration_memory_gates_1.collectTaskGlobalMemoryReceiptGates)(task, { assignmentEvidence: assignments, execution: summary.execution || null });
    const globalMemoryHealthGates = Array.isArray(summary.global_memory_health_gates || summary.globalMemoryHealthGates)
        ? (summary.global_memory_health_gates || summary.globalMemoryHealthGates)
        : (0, collaboration_memory_gates_1.collectTaskGlobalMemoryHealthGates)(task, { assignmentEvidence: assignments, execution: summary.execution || null });
    const readPlanRevalidationGates = Array.isArray(summary.read_plan_revalidation_gates || summary.readPlanRevalidationGates)
        ? (summary.read_plan_revalidation_gates || summary.readPlanRevalidationGates)
        : (0, collaboration_memory_gates_1.collectTaskReadPlanRevalidationGates)(task, { assignmentEvidence: assignments, execution: summary.execution || null });
    const postCompactReinjectionGates = Array.isArray(summary.post_compact_reinjection_gates || summary.postCompactReinjectionGates)
        ? (summary.post_compact_reinjection_gates || summary.postCompactReinjectionGates)
        : (0, collaboration_memory_gates_1.collectTaskPostCompactReinjectionGates)(task, { assignmentEvidence: assignments, execution: summary.execution || null });
    const apiMicrocompactEditPlans = Array.isArray(summary.api_microcompact_edit_plans || summary.apiMicrocompactEditPlans)
        ? (summary.api_microcompact_edit_plans || summary.apiMicrocompactEditPlans)
        : (0, collaboration_memory_gates_1.collectTaskApiMicrocompactEditPlans)(task, { assignmentEvidence: assignments, execution: summary.execution || null });
    const receiptTarget = (receipt) => String(receipt?.agent || receipt?.project || receipt?.target_project || receipt?.target || "").trim().toLowerCase();
    const strongReceiptTargets = new Set(receipts
        .filter((receipt) => {
        const status = String(receipt.status || receipt.receipt_status || "").trim();
        return (!status || status === "done") && (0, collaboration_coordination_ux_part_01_1.scoreChildAgentReceipt)(task, receipt, { memoryDispatchGates, globalMemoryReceiptGates, globalMemoryHealthGates, readPlanRevalidationGates, postCompactReinjectionGates, apiMicrocompactEditPlans, assignmentEvidence: assignments }).grade === "good";
    })
        .map(receiptTarget)
        .filter(Boolean));
    const notifications = Array.isArray(summary.worker_notifications) ? summary.worker_notifications : [];
    const continuationEvents = [
        ...(Array.isArray(task?.collaboration_state?.continuation_events) ? task.collaboration_state.continuation_events : []),
        task?.collaboration_state?.last_continuation || null,
    ].filter((item) => item && /receipt|ack|verification|missing_receipt|weak_receipt|memory_gate|read_plan|revalidation|post_compact|reinject|重注入|重读|当前源|记忆/i.test(`${item.rework_kind || item.reworkKind || item.kind || ""} ${item.source || ""} ${item.title || ""} ${item.reason || ""}`));
    const receiptRows = Array.isArray(agentCoordination?.receipt_quality) ? agentCoordination.receipt_quality : receipts.map((receipt) => ({
        agent: receipt.agent || receipt.project || "",
        status: receipt.status || receipt.receipt_status || "",
        summary: (0, memory_1.compactMemoryText)(receipt.summary || "", 160),
        quality: (0, collaboration_coordination_ux_part_01_1.scoreChildAgentReceipt)(task, receipt, { memoryDispatchGates, globalMemoryReceiptGates, globalMemoryHealthGates, readPlanRevalidationGates, postCompactReinjectionGates, apiMicrocompactEditPlans, assignmentEvidence: assignments }),
    }));
    const memoryGateSummary = agentCoordination?.memory_gate_summary || (0, collaboration_memory_gates_1.buildMemoryGateVisibleSummary)({
        ...summary,
        memory_dispatch_gates: memoryDispatchGates,
        memory_gate_receipt_rows: receiptRows
            .filter((row) => row.quality?.memory_gate?.required)
            .map((row) => ({ ...row, memory_gate: row.quality.memory_gate })),
    });
    const globalMemoryHealthGateSummary = agentCoordination?.global_memory_health_gate_summary || (0, collaboration_memory_gates_1.buildGlobalMemoryHealthGateVisibleSummary)({
        ...summary,
        global_memory_health_gates: globalMemoryHealthGates,
        global_memory_health_gate_receipt_rows: receiptRows
            .filter((row) => row.quality?.global_memory_health_gate?.required)
            .map((row) => ({ ...row, global_memory_health_gate: row.quality.global_memory_health_gate })),
    });
    const readPlanRevalidationGateSummary = agentCoordination?.read_plan_revalidation_gate_summary || (0, collaboration_memory_gates_1.buildReadPlanRevalidationGateVisibleSummary)({
        ...summary,
        read_plan_revalidation_gates: readPlanRevalidationGates,
        read_plan_revalidation_gate_receipt_rows: receiptRows
            .filter((row) => row.quality?.read_plan_revalidation_gate?.required)
            .map((row) => ({ ...row, read_plan_revalidation_gate: row.quality.read_plan_revalidation_gate })),
    });
    const reinjectionGateSummary = agentCoordination?.post_compact_reinjection_gate_summary || (0, collaboration_memory_gates_1.buildPostCompactReinjectionGateVisibleSummary)({
        ...summary,
        post_compact_reinjection_gates: postCompactReinjectionGates,
        post_compact_reinjection_gate_receipt_rows: receiptRows
            .filter((row) => row.quality?.post_compact_reinjection_gate?.required)
            .map((row) => ({ ...row, post_compact_reinjection_gate: row.quality.post_compact_reinjection_gate })),
    });
    const apiMicrocompactSummary = agentCoordination?.api_microcompact_receipt_summary || (0, collaboration_memory_gates_1.buildApiMicrocompactReceiptVisibleSummary)({
        ...summary,
        api_microcompact_edit_plans: apiMicrocompactEditPlans,
        api_microcompact_receipt_rows: receiptRows
            .filter((row) => row.quality?.api_microcompact?.required)
            .map((row) => ({ ...row, api_microcompact: row.quality.api_microcompact })),
    });
    const rows = [];
    const add = (input = {}) => {
        const target = (0, memory_1.compactMemoryText)(input.target || input.agent || input.project || "", 100);
        const reason = (0, memory_1.compactMemoryText)(input.reason || input.detail || "", 220);
        const key = `${input.id || input.rework_kind || "receipt"}|${target}|${reason}`;
        if (!target && !reason)
            return;
        if (rows.some(item => item.key === key))
            return;
        rows.push({
            key,
            id: input.id || input.rework_kind || "receipt_rework",
            target,
            title: input.title || "要求补充结果说明",
            reason,
            missing: Array.isArray(input.missing) ? input.missing.slice(0, 6) : [],
            status: input.status || "needs_rework",
            tone: input.tone || "warning",
            action: {
                kind: "targeted_rework",
                id: input.rework_kind || input.id || "weak_receipt",
                title: input.title || "要求补充结果说明",
                target,
                reason,
                tone: input.tone || "warning",
                label: input.title || "要求补充结果说明",
            },
        });
    };
    for (const receipt of receipts) {
        const agent = receipt.agent || receipt.project || receipt.target_project || "";
        if (strongReceiptTargets.has(receiptTarget(receipt)))
            continue;
        const quality = (0, collaboration_coordination_ux_part_01_1.scoreChildAgentReceipt)(task, receipt, { memoryDispatchGates, globalMemoryReceiptGates, globalMemoryHealthGates, readPlanRevalidationGates, postCompactReinjectionGates, apiMicrocompactEditPlans, assignmentEvidence: assignments });
        if (String(receipt.status || receipt.receipt_status || "") && String(receipt.status || receipt.receipt_status || "") !== "done") {
            add({
                id: "receipt_status",
                rework_kind: "missing_receipt",
                target: agent,
                title: "要求子 Agent 补结果说明",
                reason: `结果说明状态为 ${receipt.status || receipt.receipt_status}，还不能验收。${receipt.summary || ""}`,
                missing: ["完成状态", ...(Array.isArray(receipt.blockers) ? receipt.blockers : []), ...(Array.isArray(receipt.needs) ? receipt.needs : [])],
            });
            continue;
        }
        if (quality.grade !== "good") {
            add({
                id: "weak_receipt",
                rework_kind: "weak_receipt",
                target: agent,
                title: "要求补充高质量结果说明",
                reason: `结果说明评分 ${quality.score}，缺少：${quality.missing.join("、") || "关键证据"}`,
                missing: quality.missing,
            });
        }
    }
    for (const row of Array.isArray(memoryGateSummary?.rows) ? memoryGateSummary.rows : []) {
        if (row.status !== "missing_receipt_reference")
            continue;
        add({
            id: "memory_gate_receipt",
            rework_kind: "memory_gate_receipt",
            target: row.agent || "",
            title: "补充记忆使用声明",
            reason: row.reason || "结果说明缺少本轮群聊记忆 gate 引用。",
            missing: ["记忆 gate 引用", ...(row.missing_gate_ids || [])],
        });
    }
    for (const row of Array.isArray(globalMemoryHealthGateSummary?.rows) ? globalMemoryHealthGateSummary.rows : []) {
        if (["not_required", "passed"].includes(String(row.status || "")))
            continue;
        add({
            id: "global_memory_health_gate_receipt",
            rework_kind: "global_memory_health_gate_receipt",
            target: row.agent || "",
            title: "补充全局记忆健康门禁声明",
            reason: row.reason || "结果说明缺少 Global Agent memory health gate 使用/忽略声明。",
            missing: (0, collaboration_1.uniqueStrings)(["全局记忆健康门禁声明"], row.missing_gate_ids || [], row.missing_ignore_gate_ids || [], row.blocked_global_memory_used_gate_ids || []),
        });
    }
    for (const row of Array.isArray(readPlanRevalidationGateSummary?.rows) ? readPlanRevalidationGateSummary.rows : []) {
        if (!["missing_receipt_reference", "missing_read_plan_reference", "missing_current_source_verification", "session_mismatch"].includes(row.status))
            continue;
        const missing = row.status === "session_mismatch"
            ? ["绑定子 Agent 会话", ...(row.session_mismatch_gate_ids || [])]
            : row.status === "missing_read_plan_reference"
                ? ["stale read_plan_id", ...(row.missing_read_plan_ids || [])]
                : row.status === "missing_current_source_verification"
                    ? ["current source verified / memoryIgnored", ...(row.gate_ids || [])]
                    : ["读取计划重读 gate 引用", ...(row.missing_gate_ids || [])];
        add({
            id: "read_plan_revalidation_gate_receipt",
            rework_kind: "read_plan_revalidation_gate_receipt",
            target: row.agent || "",
            title: "补充读取计划重读声明",
            reason: row.reason || "结果说明缺少 stale read plan 当前源重读声明。",
            missing,
        });
    }
    for (const row of Array.isArray(reinjectionGateSummary?.rows) ? reinjectionGateSummary.rows : []) {
        if (!["missing_receipt_reference", "missing_candidate_reference", "missing_candidate_usage"].includes(row.status))
            continue;
        const missing = row.status === "missing_candidate_usage"
            ? ["压缩重注入候选使用状态", ...(row.missing_candidate_usage_gate_ids || [])]
            : row.status === "missing_candidate_reference"
                ? ["压缩重注入候选声明", ...(row.missing_candidate_reference_gate_ids || [])]
                : ["压缩后重注入 gate 引用", ...(row.missing_gate_ids || [])];
        add({
            id: "post_compact_reinjection_gate_receipt",
            rework_kind: "post_compact_reinjection_gate_receipt",
            target: row.agent || "",
            title: "补充压缩记忆使用声明",
            reason: row.reason || "结果说明缺少压缩后重注入 gate 引用。",
            missing,
        });
    }
    for (const row of Array.isArray(apiMicrocompactSummary?.rows) ? apiMicrocompactSummary.rows : []) {
        if (!["missing_usage_declaration", "unsafe_native_applied", "session_mismatch"].includes(row.status))
            continue;
        const missing = row.status === "unsafe_native_applied"
            ? ["API microcompact native apply 误声明", ...(row.unsafe_native_applied_plan_checksums || [])]
            : row.status === "session_mismatch"
                ? ["API microcompact 会话/快照绑定", ...(row.session_mismatch_plan_checksums || [])]
                : ["API microcompact 使用状态", ...(row.missing_plan_checksums || [])];
        add({
            id: "api_microcompact_receipt",
            rework_kind: "api_microcompact_receipt",
            target: row.agent || "",
            title: "补充 API microcompact 使用声明",
            reason: row.reason || "结果说明缺少 API microcompact edit plan 使用状态声明。",
            missing,
        });
    }
    for (const assignment of assignments) {
        const agent = assignment.project || assignment.agent || assignment.target_project || assignment.target || "";
        if (!agent)
            continue;
        const hasReceipt = receipts.some((receipt) => String(receipt.agent || receipt.project || receipt.target_project || "").toLowerCase() === String(agent).toLowerCase());
        if (!hasReceipt) {
            add({
                id: "missing_receipt",
                rework_kind: "missing_receipt",
                target: agent,
                title: "要求子 Agent 补结果说明",
                reason: "已派发工作单，但还没有可验收的结构化结果说明。",
                missing: ["结构化结果说明", "完成内容", "文件变更", "验证结果"],
            });
        }
    }
    for (const notification of notifications) {
        const status = String(notification.status || "").trim();
        const receiptStatus = String(notification.receipt_status || "").trim();
        if (!["failed", "blocked", "partial", "missing_receipt", "needs_info"].includes(status) && (!receiptStatus || receiptStatus === "done"))
            continue;
        const target = notification.task_id || notification.agent || notification.project || "";
        if (strongReceiptTargets.has(String(target).trim().toLowerCase()))
            continue;
        add({
            id: receiptStatus === "missing" || status === "missing_receipt" ? "missing_receipt" : "receipt_status",
            rework_kind: receiptStatus === "missing" || status === "missing_receipt" ? "missing_receipt" : "weak_receipt",
            target,
            title: receiptStatus === "missing" || status === "missing_receipt" ? "要求子 Agent 补结果说明" : "要求补充高质量结果说明",
            reason: `通知 ${status || "unknown"} / 结果说明 ${receiptStatus || "unknown"}；${notification.summary || ""}`,
            missing: [receiptStatus === "missing" || status === "missing_receipt" ? "结构化结果说明" : "完成证据"],
        });
    }
    for (const item of Array.isArray(agentCoordination?.targeted_rework) ? agentCoordination.targeted_rework : []) {
        if (!/receipt|ack|verification|memory|记忆|reinject|重注入|压缩/i.test(`${item.id || ""} ${item.title || ""}`))
            continue;
        if (strongReceiptTargets.has(String(item.target || "").trim().toLowerCase()))
            continue;
        add({
            id: item.id || "targeted_rework",
            rework_kind: item.id || "weak_receipt",
            target: item.target || "",
            title: item.title || "要求补充结果说明",
            reason: item.reason || "",
            missing: [],
            tone: item.tone || "warning",
        });
    }
    const isReceiptGap = (item) => /receipt|回执|ACK|验证|verification|ack|memory|记忆|read[_ -]?plan|revalidation|重读|当前源|reinject|重注入|压缩/i.test(`${item.id || ""} ${item.title || ""} ${item.reason || ""}`);
    const gaps = rows
        .filter((item) => {
        const target = String(item.target || "").trim().toLowerCase();
        if (target && strongReceiptTargets.has(target))
            return false;
        if (!target && strongReceiptTargets.size > 0 && isReceiptGap(item))
            return false;
        return true;
    })
        .slice(0, 8)
        .map(({ key, ...item }) => item);
    const activeRework = continuationEvents.slice(-5).map((item) => ({
        target: (0, memory_1.compactMemoryText)(item.target || item.agent || item.project || "", 100),
        title: item.title || (/missing_receipt/i.test(`${item.rework_kind || ""}`) ? "已发起补结果说明" : "已发起结果说明补充"),
        reason: (0, collaboration_task_card_1.sanitizeUserAgentProgressText)(item.reason || item.detail || "等待执行成员补齐证据后重新验收", "等待执行成员补齐证据后重新验收", 220),
        at: item.at || "",
        status: item.status || "accepted",
    })).filter((item) => item.target || item.reason);
    const gapKeys = new Set(gaps.map(item => String(item.target || "").toLowerCase()).filter(Boolean));
    const resolved = activeRework
        .filter((item) => item.target && !gapKeys.has(String(item.target || "").toLowerCase()))
        .map((item) => {
        const receipt = receipts.find((row) => String(row.agent || row.project || row.target_project || "").toLowerCase() === String(item.target || "").toLowerCase());
        const quality = receipt ? (0, collaboration_coordination_ux_part_01_1.scoreChildAgentReceipt)(task, receipt, { memoryDispatchGates, globalMemoryReceiptGates, globalMemoryHealthGates, readPlanRevalidationGates, postCompactReinjectionGates, apiMicrocompactEditPlans, assignmentEvidence: assignments }) : null;
        return {
            target: item.target,
            title: "结果说明已补齐",
            reason: quality?.grade === "good"
                ? `结果说明评分 ${quality.score}，我已重新验收。`
                : "返工后暂未发现新的结果说明缺口，我会继续跟踪验收。",
            at: receipt?.updated_at || receipt?.time || item.at || "",
            status: quality?.grade === "good" ? "passed" : "rechecking",
        };
    }).slice(0, 5);
    if (!gaps.length && !activeRework.length && !resolved.length)
        return null;
    const targets = (0, collaboration_1.uniqueStrings)([
        ...gaps.map(item => item.target),
        ...activeRework.map((item) => item.target),
        ...resolved.map((item) => item.target),
    ].filter(Boolean)).slice(0, 4);
    const status = gaps.length ? (activeRework.length ? "reworking" : "needs_rework") : resolved.some((item) => item.status === "passed") ? "passed" : "rechecking";
    return {
        schema: "ccm-main-agent-receipt-rework-summary-v1",
        title: "结果复检",
        status,
        status_label: gaps.length ? `${gaps.length} 个缺口` : status === "passed" ? "已通过" : "复检中",
        headline: gaps.length
            ? targets.length
                ? `${targets.join("、")} 的结果说明还需要补齐，我不会把这轮直接判定完成。`
                : "执行成员结果说明还需要补齐，我不会把这轮直接判定完成。"
            : targets.length
                ? `${targets.join("、")} 的结果说明补充已完成复检，我会继续收敛最终交付。`
                : "结果说明补充已完成复检，我会继续收敛最终交付。",
        gaps,
        active_rework: activeRework.filter((item) => item.target && gapKeys.has(String(item.target || "").toLowerCase())).slice(0, 5),
        resolved,
        next_action: gaps.length
            ? "可以按单个缺口精准返工；补齐后我会重新验收并汇总。"
            : "继续执行剩余验收；如果全部验收通过，我会输出最终总结。",
        display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true },
    };
}
function buildUserCoordinationAcknowledgement(task, assignments = []) {
    const projects = (0, collaboration_1.uniqueStrings)((assignments || []).map((item) => item.project).filter(Boolean));
    const scope = projects.length ? `预计由 ${projects.join("、")} 处理` : "我正在确认涉及的项目";
    const goal = (0, memory_1.compactMemoryText)(task?.business_goal || task?.title || "这项需求", 180).replace(/[。！？!?；;，,]+$/u, "");
    return `我明白了：${goal}。${scope}，后续进度会持续更新在这张任务卡中。`;
}
function sanitizeDispatchLaunchText(value, fallback = "", max = 220) {
    let text = (0, memory_1.compactMemoryText)(value || "", max);
    if (!text)
        return fallback;
    text = text
        .replace(/CCM_AGENT_RECEIPT/g, "结构化结果说明")
        .replace(/CCM_AGENT_REQUESTS/g, "协作请求")
        .replace(/<\/?(?:task-notification|task-id|status|summary|result|usage|duration_ms|total_tokens|tool_uses)>/gi, " ")
        .replace(/\breceipt[-_\s]*status\b/gi, "结果状态")
        .replace(/\braw\s+payload\b/gi, "底层执行记录")
        .replace(/\braw\s+receipt\b/gi, "底层执行记录")
        .replace(/\s+/g, " ")
        .trim();
    return (0, collaboration_task_card_1.sanitizeUserAgentProgressText)(text, fallback, max) || fallback;
}
function normalizeGroupDispatchLaunchRowStatus(rawValue = "dispatched") {
    const raw = String(rawValue || "dispatched").trim().toLowerCase();
    if (["done", "completed", "complete", "success", "succeeded", "ok"].includes(raw)) {
        return { status: "reviewing", label: "已回传结果，待验收" };
    }
    if (["running", "in_progress", "executing"].includes(raw))
        return { status: "running", label: "执行中" };
    if (["blocked", "failed", "error"].includes(raw))
        return { status: "failed", label: "待排查" };
    if (["queued", "pending"].includes(raw))
        return { status: raw, label: "已入队" };
    return { status: raw || "dispatched", label: "已派发" };
}
function taskAgentInvocationMemoryOptions(edge) {
    if (!edge?.invocation_edge_id)
        return {};
    return {
        invocationEdgeId: edge.invocation_edge_id,
        parentInvocationEdgeId: edge.parent_invocation_edge_id || "",
        rootInvocationEdgeId: edge.root_invocation_edge_id || edge.invocation_edge_id,
        branchId: edge.branch_id || "",
        parentBranchId: edge.parent_branch_id || "",
        branchKind: edge.branch_kind || "main",
        expectedLineageHeadChecksum: edge.expected_lineage_head_checksum || "",
    };
}
function taskAgentSessionLifecycleRunnerOptions(snapshot) {
    const resolved = snapshot?.snapshot || snapshot || {};
    const binding = resolved?.context?.group_session_memory_binding || resolved?.context?.groupSessionMemoryBinding || null;
    const groupSessionId = String(binding?.groupSessionId || binding?.group_session_id || "").trim();
    if (!groupSessionId.startsWith("gcs_"))
        return {};
    return {
        groupSessionId,
        sessionLifecycleFence: {
            schema: "ccm-group-session-lifecycle-runtime-fence-v1",
            required: true,
            groupId: String(binding?.groupId || binding?.group_id || ""),
            groupSessionId,
            lifecycleGeneration: Number(binding?.sessionLifecycleGeneration || binding?.session_lifecycle_generation || 0),
            lifecycleStatus: String(binding?.sessionLifecycleStatus || binding?.session_lifecycle_status || ""),
            lifecycleHeadId: String(binding?.sessionLifecycleHeadId || binding?.session_lifecycle_head_id || ""),
            lifecycleHeadChecksum: String(binding?.sessionLifecycleHeadChecksum || binding?.session_lifecycle_head_checksum || ""),
            memoryContextSnapshotId: String(resolved?.snapshot_id || ""),
            memoryContextSnapshotChecksum: String(resolved?.checksum || ""),
        },
    };
}
function buildWorkerContinuationHandoff(task, targetProject = "", options = {}) {
    const state = task?.collaboration_state || {};
    const last = state.last_continuation || task?.last_continuation || null;
    const pending = Array.isArray(task?.pending_followups) ? task.pending_followups : [];
    const latestFollowup = [...pending].reverse().find((item) => item?.message || item?.kind) || {};
    const kind = (0, collaboration_task_card_1.normalizeContinuationKind)(last?.kind || latestFollowup.kind || "");
    const replanRequired = kind === "revise_goal" || last?.replan_required === true || latestFollowup?.continuation?.replan_required === true || task?.plan_revision_required === true;
    const interruption = state.goal_revision_interruption || {};
    if (!last?.at && !latestFollowup?.message && !replanRequired && interruption.requested !== true)
        return options.fallback || null;
    const latestUserChange = (0, memory_1.compactMemoryText)(latestFollowup.message || last?.reason || last?.title || interruption.reason || "", 900);
    const currentGoal = (0, memory_1.compactMemoryText)(task?.business_goal || task?.businessGoal || task?.title || "", 1000);
    const previousGoal = (0, memory_1.compactMemoryText)(options.previous_goal || options.previousGoal || task?.title || "", 700);
    const routeLabel = last?.route_label || latestFollowup?.continuation?.route_label || (interruption.requested ? "先停止当前轮再重核计划" : replanRequired ? "先重核计划再继续" : "继续同一任务");
    const instructions = (0, collaboration_1.uniqueStrings)([
        replanRequired ? "先按最新用户要求重新核对目标、范围、禁止范围和验收标准，再决定是否修改文件。" : "",
        interruption.requested ? "不要继续已停止执行轮中的旧方向；如果看到旧实现残留，先判断是否符合新目标。" : "",
        latestUserChange ? `以最新用户要求为准：${latestUserChange}` : "",
        "复用当前任务已有的文件、验证和结果说明作为证据，但不得把旧证据直接当成本轮完成结论。",
        "完成后在结果说明中明确写出本轮是否覆盖了最新目标调整。",
    ]);
    const preserved = (0, collaboration_1.uniqueStrings)([
        task?.delivery_summary?.headline ? `上一轮交付摘要：${(0, memory_1.compactMemoryText)(task.delivery_summary.headline, 220)}` : "",
        ...(Array.isArray(task?.delivery_summary?.actual_file_changes) ? task.delivery_summary.actual_file_changes.map((item) => item.path || item.file || item.name).filter(Boolean).slice(0, 5).map((path) => `已有文件证据：${path}`) : []),
        ...(Array.isArray(task?.delivery_summary?.verification_executed) ? task.delivery_summary.verification_executed.slice(0, 4).map((item) => `已有验证证据：${(0, memory_1.compactMemoryText)(item, 180)}`) : []),
    ]);
    const avoid = (0, collaboration_1.uniqueStrings)([
        interruption.requested ? "继续当前轮被停止前的旧实现方向" : "",
        replanRequired ? "在未确认新目标影响范围前扩大修改" : "",
        "把未运行的验证写成已通过",
    ]);
    return {
        schema: "ccm-worker-continuation-handoff-v1",
        kind,
        kind_label: kind === "revise_goal" ? "目标调整" : kind === "new_task" ? "独立新任务" : "补充要求",
        route_label: routeLabel,
        target: targetProject || last?.target || "",
        latest_user_change: latestUserChange,
        current_goal: currentGoal,
        previous_goal: previousGoal && previousGoal !== currentGoal ? previousGoal : "",
        replan_required: replanRequired,
        interrupt_current_run: interruption.requested === true || last?.interrupt_current_run === true,
        interruption_status: interruption.resolved_at ? "stopped_and_ready_to_replan" : interruption.requested ? "stopping_current_run" : "",
        instructions,
        preserved_context: preserved,
        avoid,
        technical: {
            followup_revision: Number(task?.followup_revision || 0),
            consumed_followup_revision: Number(task?.consumed_followup_revision || 0),
            interruption_requested_at: interruption.requested_at || "",
            interruption_resolved_at: interruption.resolved_at || "",
        },
    };
}
function extractMemoryDispatchFreshnessGate(memory) {
    if (!memory || typeof memory !== "object")
        return null;
    if (memory.dispatch_freshness_gate?.schema === "ccm-child-agent-memory-dispatch-freshness-gate-v1")
        return memory.dispatch_freshness_gate;
    if (memory.group_memory)
        return extractMemoryDispatchFreshnessGate(memory.group_memory);
    if (memory.memory)
        return extractMemoryDispatchFreshnessGate(memory.memory);
    return null;
}
function renderMemoryDispatchFreshnessGateForContract(memory, handoff = null) {
    const gate = handoff?.references?.memory_freshness_gate || extractMemoryDispatchFreshnessGate(memory);
    if (!gate?.schema)
        return "";
    return `- 记忆派发门禁：dispatch_gate_id=${gate.dispatch_gate_id || ""}；status=${gate.status || "unknown"}；action=${gate.action || "unknown"}；reload=${gate.reload_audit?.reason || "unknown"}；回执 memoryUsed/memoryIgnored 必须引用该 gate，说明是否实际使用平台记忆。`;
}
function buildChildAgentDevelopmentContract(targetProject, taskText = "", options = {}) {
    const requiresCodeChanges = options.requires_code_changes !== false && options.requiresCodeChanges !== false;
    const source = options.source ? `- 来源：${options.source}` : "";
    const acceptance = options.acceptance || options.acceptance_criteria || options.acceptanceCriteria || "";
    const verificationHints = Array.isArray(options.verification_hints || options.verificationHints)
        ? (options.verification_hints || options.verificationHints).map((item) => String(item || "").trim()).filter(Boolean)
        : [];
    const capabilityProfile = options.capability_profile || options.capabilityProfile || (0, collaboration_1.getProjectAgentCapabilityProfile)(targetProject, options.work_dir || options.workDir || "");
    const capabilityLines = buildProjectAgentProfileContractLines(capabilityProfile);
    const handoff = options.handoff || (0, collaboration_1.buildChildAgentWorkerHandoff)(targetProject, taskText, options);
    const handoffText = (0, worker_handoff_1.renderSelfContainedWorkerHandoff)(handoff);
    const memoryFreshnessGateLine = renderMemoryDispatchFreshnessGateForContract(options.memory || options.memory_packet || options.memoryPacket || null, handoff);
    return [
        handoffText,
        "",
        "子 Agent 开发契约（必须遵守）：",
        `- 你的身份：${targetProject} 项目子 Agent。只在自己的项目职责和工作目录内处理。`,
        source,
        ...capabilityLines,
        taskText ? `- 本次工作单：${(0, memory_1.compactMemoryText)(taskText, 900)}` : "",
        acceptance ? `- 验收标准：${(0, memory_1.compactMemoryText)(acceptance, 900)}` : "",
        requiresCodeChanges
            ? "- 完成条件：必须产生可捕获的实际文件变更；没有实际变更时不得把 status 写为 done。"
            : "- 完成条件：如不需要代码变更，必须说明原因、产出和验证依据。",
        "- 实施要求：先理解上下文，再做最小必要改动；不要改无关模块，不要删除用户已有改动。",
        "- 接单确认：开始执行前先用 1-3 句话确认你理解的目标、准备查看/修改的范围；如果范围不清楚，先写 blocked/needs_info，不要盲改。",
        "- 进度心跳：长任务中请在关键阶段说明当前状态，例如正在读文件、正在修改、正在运行验证、等待依赖或遇到阻塞；不要长时间无状态输出。",
        "- 契约同步：如果你改动接口、字段、schema、路由、类型、配置或前后端契约，必须在回执 actions/summary 中写清契约变化，方便主 Agent 通知依赖 Agent。",
        "- 验证要求：只记录实际运行过的命令或人工核验；未运行的验证必须明确写成建议，不能伪造。",
        verificationHints.length ? `- 推荐优先执行的项目验证：${verificationHints.slice(0, 6).join("；")}` : "",
        verificationHints.length ? "- 项目验证命令会通过 Claude Code allowed-tools 按项目配置预授权；必须先真实尝试运行，只有看到本轮命令输出确实失败/阻塞时，才能写 blocked 或建议人工补跑。" : "",
        "- 阻塞处理：缺字段、缺权限、接口不明确、环境失败时，status 写 blocked/needs_info，并列出需要谁补什么。",
        "- 复核交接不算阻塞：实现与验证完成后 status 写 done；等待 TestAgent、主 Agent 抽查或最终总结属于主 Agent 后续流程，不得写入 blockers/needs。",
        memoryFreshnessGateLine,
        "- 记忆使用要求：如果本轮使用了平台注入的群聊摘要、项目记忆、历史结论、共享文档或知识库，请在回执 memoryUsed 写明使用项；如果没有使用或无法判断，请在 memoryIgnored 写明原因。",
        "- 类型化记忆逐项回执：如果 WorkerContextPacket 下发了 surfaced MEMORY.md 文档，回执必须在 typedMemoryUsage 中覆盖每个 relPath，并逐项填写 usageState（used/verified/ignored）和 reason；不得声明未下发的 relPath；verified 还必须提供可由平台复算的 currentSourceEvidence。",
        "- 全局记忆要求：如果上下文包含 global_memory_id、semantic_risk 或 cross_group_suppression，回执必须在 globalMemoryUsage 中逐条声明 globalMemoryId、usageState（used/ignored/verified/background/advisory）、currentSourceVerified、semanticRiskAcknowledged、crossGroupSuppression 和 reason。",
        "- 全局记忆健康门禁要求：如果上下文包含 global_memory_health_gate，回执 memoryUsed/memoryIgnored 必须引用 gate_id；status=fail 或 action=block_global_agent_memory_recall 时必须在 memoryIgnored 说明未使用全局记忆，且不得在 globalMemoryUsage 声明 used。",
        "- API microcompact 要求：如果上下文包含 API microcompact edit plan，回执 apiMicrocompactUsage 或 memoryUsed/memoryIgnored 必须引用 planChecksum，并声明 native_applied/advisory/ignored/not_supported；第三方 CLI 未实际调用 native API context-management 时不得声明 native_applied；声明 native_applied 时还必须填写 apiMicrocompactNativeApplyRequestTelemetry；强证明必须来自 fresh native_request_adapter telemetry，agent_receipt 来源只能算弱证据。",
        "- 压缩候选要求：如果上下文包含压缩后重注入 gate / candidate_id，回执必须在 postCompactCandidateUsage 中逐条声明每个 candidate_id 的 usageState，只能是 used、ignored 或 verified。",
        "- Provider switch 要求：如果上下文包含 approved Provider switch decision receipt，回执 providerSwitchExecution 必须引用 decisionReceiptId，并填写 expectedProvider、executedProvider、taskAgentSessionId、nativeSessionId、executionId；平台会用实际 runner/session 覆盖并验证该执行证明。",
        "- 回执质量要求：status=done 只有在目标覆盖、文件/产出和验证证据都齐全时才能写；缺文件、缺验证、仍有依赖或不确定时写 blocked/needs_info/partial。",
        "- ACK 结构要求：CCM_AGENT_RECEIPT 中必须包含 ack 对象，字段包括 understoodGoal、plannedScope、forbiddenScope、verificationPlan、unclear；如果不清楚，unclear 必须列出问题且 status 不得写 done。",
        "- contractChanges 结构要求：如果涉及接口、字段、schema、路由、类型、配置或前后端契约变化，CCM_AGENT_RECEIPT 中必须包含 contractChanges 数组，写明 type、endpoint/path、request、response、fields、consumers、note。",
        "- 项目长期记忆要求：CCM_AGENT_RECEIPT.projectMemory 只填写跨会话仍有价值且可由本轮证据支持的内容，分类为 constraints、decisions、facts、lessons、risks、openItems、contracts；普通完成总结、文件清单、测试输出、临时状态和可直接从源码读取的信息不要写入，确实没有长期内容时各分类留空。",
        "- contract injection 消费要求：如果工作单包含 injection_id，回执必须写 consumedInjectionIds，并说明是否已适配、无需适配或仍阻塞。",
        "- 回执要求：回复末尾必须包含 JSON 格式 CCM_AGENT_RECEIPT，写明 status、summary、actions、filesChanged、verification、blockers、needs、ack、contractChanges、projectMemory、consumedInjectionIds、memoryUsed、memoryIgnored、typedMemoryUsage、globalMemoryUsage、apiMicrocompactUsage、apiMicrocompactNativeApplyRequestTelemetry、postCompactCandidateUsage、providerSwitchExecution。",
    ].filter(Boolean).join("\n");
}
function isSuggestedOnlyVerification(value) {
    const text = String(value || "").trim();
    if (!text)
        return true;
    return /建议|可运行|可以运行|待运行|未运行|未执行|未验证|没有运行|无法运行|未提供|todo|not\s+run|not\s+executed|suggest/i.test(text);
}
function isFailedVerification(value) {
    const text = String(value || "").trim();
    if (!text)
        return false;
    const normalized = text
        .replace(/\b0\s+(?:failed|failures?|errors?)\b/gi, "")
        .replace(/\b(?:no|zero)\s+(?:failed|failures?|errors?)\b/gi, "")
        .replace(/(?:零|0)\s*(?:个|项|条)?\s*(?:失败|错误)/g, "")
        .replace(/(?:无失败|没有失败|全部通过|全数通过)/g, "");
    return /失败|未通过|报错|错误|超时|中断|无法执行|无法自动执行|无法运行|被.*拦截|拦截|阻塞|审批|failed|failure|error|timeout|denied|blocked|not\s+allowed|requires\s+approval|permission/i.test(normalized);
}
function splitEvidenceList(value) {
    if (Array.isArray(value))
        return (0, collaboration_1.normalizeStringArray)(value);
    const text = String(value || "").trim();
    if (!text || text === "无" || text === "未提供" || text === "未填写")
        return [];
    return text.split(/[；;,\n]/).map(item => item.trim()).filter(Boolean);
}
function buildProjectAgentProfileContractLines(profile) {
    if (!profile?.configured)
        return [];
    return [
        profile.responsibility ? `- 项目 Agent 职责范围：${(0, memory_1.compactMemoryText)(profile.responsibility, 500)}` : "",
        profile.capabilities?.length ? `- 项目 Agent 能力标签：${profile.capabilities.slice(0, 12).join("；")}` : "",
        profile.writable_paths?.length ? `- 允许写入范围：${profile.writable_paths.slice(0, 12).join("；")}` : "",
        profile.forbidden_paths?.length ? `- 禁止触碰范围：${profile.forbidden_paths.slice(0, 12).join("；")}` : "",
        profile.delivery_contract ? `- 项目交付规范：${(0, memory_1.compactMemoryText)(profile.delivery_contract, 700)}` : "",
        profile.work_dir ? `- 当前工作目录：${profile.work_dir}` : "",
        profile.writable_paths?.length || profile.forbidden_paths?.length
            ? "- 路径门禁：若确需越过上述范围，不能直接修改；必须在 blockers/needs 中说明并等待主 Agent 或用户确认。"
            : "",
    ].filter(Boolean);
}
//# sourceMappingURL=collaboration-coordination-ux-part-02.js.map