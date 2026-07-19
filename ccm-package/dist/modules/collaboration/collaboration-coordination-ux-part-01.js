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
exports.receiptEvidenceStrings = receiptEvidenceStrings;
exports.isConcreteReceiptFileEvidence = isConcreteReceiptFileEvidence;
exports.isConcreteReceiptActionEvidence = isConcreteReceiptActionEvidence;
exports.evaluateChildAgentHandoffQuality = evaluateChildAgentHandoffQuality;
exports.scoreChildAgentReceipt = scoreChildAgentReceipt;
exports.buildCoordinationEventStream = buildCoordinationEventStream;
exports.compactRuntimeToolAudit = compactRuntimeToolAudit;
exports.runtimeToolSnapshotFromAudit = runtimeToolSnapshotFromAudit;
exports.attachInvokedSkillsToReceipt = attachInvokedSkillsToReceipt;
exports.collectRuntimeToolingFromSources = collectRuntimeToolingFromSources;
exports.buildRuntimeKernelSnapshot = buildRuntimeKernelSnapshot;
exports.buildTargetedReworkSuggestions = buildTargetedReworkSuggestions;
exports.buildChildAgentPlanReviewSummary = buildChildAgentPlanReviewSummary;
exports.buildUserAgentCoordinationProtocol = buildUserAgentCoordinationProtocol;
// Behavior-freeze split from collaboration-coordination-ux.ts (part 1/2).
/** Coordination protocol UX, runtime kernel display, and dispatch helpers. Behavior-preserving extraction from the collaboration facade. */
const collaboration_1 = require("./collaboration");
const collaboration_task_card_1 = require("./collaboration-task-card");
const collaboration_memory_gates_1 = require("./collaboration-memory-gates");
const crypto = __importStar(require("crypto"));
const memory_1 = require("./memory");
const storage_1 = require("./storage");
const runtime_tool_sync_1 = require("../../tools/runtime-tool-sync");
const execution_kernel_1 = require("../../agents/execution-kernel");
const reliability_ledger_1 = require("../../system/reliability-ledger");
const protocol_gates_1 = require("./protocol-gates");
const collaboration_coordination_ux_part_02_1 = require("./collaboration-coordination-ux-part-02");
function receiptEvidenceStrings(...values) {
    const items = [];
    const add = (value) => {
        if (Array.isArray(value)) {
            value.forEach(add);
            return;
        }
        if (!value)
            return;
        if (typeof value === "object") {
            add(value.path || value.file || value.name || value.command || value.summary || value.detail || value.value || value.result || value.label || "");
            return;
        }
        items.push(...(0, collaboration_coordination_ux_part_02_1.splitEvidenceList)(value));
    };
    values.forEach(add);
    return (0, collaboration_1.uniqueStrings)(items);
}
function isConcreteReceiptFileEvidence(value) {
    const text = String(value || "").trim();
    if (!text)
        return false;
    if (/^(?:无|暂无|未提供|未填写|none|n\/a|na|-)$/.test(text))
        return false;
    if (/(?:未|没有|无)(?:实际)?(?:修改|变更|改动|落地)|no\s+(?:file\s+)?changes?|not\s+(?:modified|changed|implemented)/i.test(text))
        return false;
    if (/(?:建议|应该|可以|待|交给|由).{0,30}(?:修改|实现|处理)/i.test(text))
        return false;
    return /[\\/]|\.([a-z0-9]{1,12})(?:$|[#?:\s),，）])/i.test(text);
}
function isConcreteReceiptActionEvidence(value) {
    const text = String(value || "").trim();
    if (!text)
        return false;
    if (/(?:建议|应该|可以|可由|交给|交由|转交|移交|待).{0,30}(?:主\s*Agent|coordinator|用户|后续|你|parent|main agent)/i.test(text))
        return false;
    if (/(?:未|没有|无)(?:实际)?(?:修改|实现|执行|落地|运行|验证)|只(?:提供|整理|输出|完成)(?:了)?(?:方案|建议|分析|思路|说明)|仅(?:提供|整理|输出|分析|建议)|no\s+changes?\s+made|not\s+implemented|only\s+(?:provided|suggested|analy[sz]ed)|handoff/i.test(text))
        return false;
    return /(?:已|完成|修改|新增|删除|调整|实现|修复|同步|运行|验证|updated?|changed?|implemented?|fixed?|ran|verified)/i.test(text);
}
function evaluateChildAgentHandoffQuality(task, receipt = {}) {
    const status = String(receipt.status || receipt.receipt_status || "").toLowerCase();
    const requiresCode = (0, collaboration_1.taskRequiresCodeChanges)(task);
    const requiresVerification = (0, collaboration_1.taskRequiresVerification)(task);
    const requiresExecutionEvidence = requiresCode || requiresVerification;
    const files = receiptEvidenceStrings(receipt.filesChanged, receipt.files_changed, receipt.files);
    const actions = receiptEvidenceStrings(receipt.actions);
    const verification = receiptEvidenceStrings(receipt.verification, receipt.tests);
    const needs = receiptEvidenceStrings(receipt.needs, receipt.blockers);
    const text = receiptEvidenceStrings(receipt.summary, actions, files, verification, needs).join("\n");
    const handoffPattern = /(?:建议|应该|可以|可由|交给|交由|转交|移交|待).{0,36}(?:主\s*Agent|coordinator|用户|后续|你|父\s*Agent|parent|main agent)|(?:主\s*Agent|coordinator|父\s*Agent|parent|main agent).{0,36}(?:需要|应当|可以|继续|补充|修改|执行|处理|实现|确认)|\b(?:recommend(?:ed|ation)?|should|handoff|handing\s+back)\b/i;
    const noExecutionPattern = /(?:未|没有|无)(?:实际)?(?:修改|变更|改动|实现|执行|落地|跑验证|运行验证|验证)|只(?:提供|整理|输出|完成)(?:了)?(?:方案|建议|分析|思路|说明)|仅(?:提供|整理|输出|分析|建议)|no\s+changes?\s+made|not\s+(?:implemented|modified|changed|executed|verified)|only\s+(?:provided|suggested|analy[sz]ed)/i;
    const hasHandoffHint = handoffPattern.test(text);
    const hasNoExecutionHint = noExecutionPattern.test(text);
    const hasConcreteFiles = files.some(isConcreteReceiptFileEvidence);
    const hasConcreteActions = actions.some(isConcreteReceiptActionEvidence);
    const hasExecutedVerification = verification.some((item) => !(0, collaboration_coordination_ux_part_02_1.isSuggestedOnlyVerification)(item) && !(0, collaboration_coordination_ux_part_02_1.isFailedVerification)(item));
    const missingRequiredFiles = requiresCode && !hasConcreteFiles;
    const missingRequiredVerification = requiresVerification && !hasExecutedVerification;
    const onlyHandoffOrAdvice = status === "done"
        && requiresExecutionEvidence
        && (hasNoExecutionHint
            || (hasHandoffHint && (missingRequiredFiles || missingRequiredVerification || !hasConcreteActions)));
    const hints = [
        hasNoExecutionHint ? "结果说明提到未实际修改、未执行或只是方案" : "",
        hasHandoffHint ? "结果说明把后续处理交回主 Agent、用户或后续步骤" : "",
        missingRequiredFiles ? "缺少真实文件修改证据" : "",
        missingRequiredVerification ? "缺少已执行验证证据" : "",
    ].filter(Boolean);
    return {
        schema: "ccm-child-agent-handoff-quality-v1",
        pass: !onlyHandoffOrAdvice,
        status: !requiresExecutionEvidence
            ? "not_required"
            : status !== "done"
                ? "not_final"
                : onlyHandoffOrAdvice
                    ? "handoff_or_advice_only"
                    : "execution_evidence_ready",
        status_label: !requiresExecutionEvidence
            ? "无需执行证据"
            : status !== "done"
                ? "尚未最终提交"
                : onlyHandoffOrAdvice
                    ? "只是建议或交接"
                    : "执行证据可采信",
        reason: !requiresExecutionEvidence
            ? "该任务不强制代码修改或验证证据。"
            : status !== "done"
                ? "只在子 Agent 声称已完成时判断是否只是建议或交接。"
                : onlyHandoffOrAdvice
                    ? "子 Agent 的结果更像建议或交接，缺少可验收的真实修改/验证证据。"
                    : "子 Agent 提供了可用于验收的执行证据。",
        evidence: {
            has_handoff_hint: hasHandoffHint,
            has_no_execution_hint: hasNoExecutionHint,
            has_concrete_files: hasConcreteFiles,
            has_concrete_actions: hasConcreteActions,
            has_executed_verification: hasExecutedVerification,
            missing_required_files: missingRequiredFiles,
            missing_required_verification: missingRequiredVerification,
            hints: hints.slice(0, 6),
        },
    };
}
function scoreChildAgentReceipt(task, receipt = {}, context = {}) {
    return require("./collaboration-acceptance").scoreChildAgentReceipt(task, receipt, context);
}
function buildCoordinationEventStream(task, summary = {}, executions = [], ackReview = null, contractTransfer = null, receiptRows = [], targetedRework = []) {
    const timeline = Array.isArray(summary.timeline) ? summary.timeline : [];
    const events = [];
    const add = (type, label, status = "info", detail = "", data = null) => {
        events.push({ id: `${type}_${events.length + 1}`, type, label, status, detail: (0, memory_1.compactMemoryText)(detail, 220), data });
    };
    if (Array.isArray(summary.assignment_evidence) && summary.assignment_evidence.length)
        add("work_order_sent", "工作单已派发", "ok", `已派发 ${summary.assignment_evidence.length} 条`);
    const memoryGateSummary = (0, collaboration_memory_gates_1.buildMemoryGateVisibleSummary)(summary);
    const globalMemorySummary = (0, collaboration_memory_gates_1.buildGlobalMemoryReceiptVisibleSummary)(summary);
    if (memoryGateSummary.required) {
        add("memory_gate_receipt", "记忆派发校验", memoryGateSummary.pass ? "ok" : "warn", memoryGateSummary.summary, { missing_gate_ids: memoryGateSummary.missing_gate_ids, rows: memoryGateSummary.rows });
    }
    if (globalMemorySummary.required) {
        add("global_memory_receipt", "全局记忆使用校验", globalMemorySummary.pass ? "ok" : "warn", globalMemorySummary.summary, {
            missing_global_memory_ids: globalMemorySummary.missing_global_memory_ids,
            unsafe_used_global_memory_ids: globalMemorySummary.unsafe_used_global_memory_ids,
            rows: globalMemorySummary.rows,
        });
    }
    const globalMemoryHealthSummary = (0, collaboration_memory_gates_1.buildGlobalMemoryHealthGateVisibleSummary)(summary);
    if (globalMemoryHealthSummary.required) {
        add("global_memory_health_gate_receipt", "全局记忆健康门禁校验", globalMemoryHealthSummary.pass ? "ok" : "warn", globalMemoryHealthSummary.summary, {
            missing_gate_ids: globalMemoryHealthSummary.missing_gate_ids,
            blocked_global_memory_used_gate_ids: globalMemoryHealthSummary.blocked_global_memory_used_gate_ids,
            rows: globalMemoryHealthSummary.rows,
        });
    }
    const readPlanRevalidationGateSummary = (0, collaboration_memory_gates_1.buildReadPlanRevalidationGateVisibleSummary)(summary);
    if (readPlanRevalidationGateSummary.required) {
        add("read_plan_revalidation_gate_receipt", "读取计划重读校验", readPlanRevalidationGateSummary.pass ? "ok" : "warn", readPlanRevalidationGateSummary.summary, {
            missing_gate_ids: readPlanRevalidationGateSummary.missing_gate_ids,
            missing_read_plan_ids: readPlanRevalidationGateSummary.missing_read_plan_ids,
            session_mismatch_gate_ids: readPlanRevalidationGateSummary.session_mismatch_gate_ids,
            rows: readPlanRevalidationGateSummary.rows,
        });
    }
    const reinjectionGateSummary = (0, collaboration_memory_gates_1.buildPostCompactReinjectionGateVisibleSummary)(summary);
    if (reinjectionGateSummary.required) {
        add("post_compact_reinjection_gate_receipt", "压缩重注入校验", reinjectionGateSummary.pass ? "ok" : "warn", reinjectionGateSummary.summary, {
            missing_gate_ids: reinjectionGateSummary.missing_gate_ids,
            missing_candidate_reference_gate_ids: reinjectionGateSummary.missing_candidate_reference_gate_ids,
            missing_candidate_usage_gate_ids: reinjectionGateSummary.missing_candidate_usage_gate_ids,
            missing_candidate_usage_candidate_ids: reinjectionGateSummary.missing_candidate_usage_candidate_ids,
            candidate_usage_counts: reinjectionGateSummary.candidate_usage_counts,
            rows: reinjectionGateSummary.rows,
        });
    }
    const apiMicrocompactSummary = (0, collaboration_memory_gates_1.buildApiMicrocompactReceiptVisibleSummary)(summary);
    if (apiMicrocompactSummary.required) {
        add("api_microcompact_receipt", "API microcompact 校验", apiMicrocompactSummary.pass ? "ok" : "warn", apiMicrocompactSummary.summary, {
            plan_checksums: apiMicrocompactSummary.plan_checksums,
            missing_plan_checksums: apiMicrocompactSummary.missing_plan_checksums,
            unsafe_native_applied_plan_checksums: apiMicrocompactSummary.unsafe_native_applied_plan_checksums,
            rows: apiMicrocompactSummary.rows,
        });
    }
    const postCompactDispatchMarkerSummary = (0, collaboration_memory_gates_1.buildPostCompactDispatchMarkerVisibleSummary)(summary);
    if (postCompactDispatchMarkerSummary.required) {
        add("post_compact_dispatch_marker", "压缩后派发标记", "info", postCompactDispatchMarkerSummary.summary, { marker_ids: postCompactDispatchMarkerSummary.marker_ids, rows: postCompactDispatchMarkerSummary.rows });
    }
    const ackStatusLabel = (status) => ({
        approved: "已确认",
        weak: "需补充",
        conflict: "需仲裁",
        waiting: "等待中",
        missing: "未收到",
    }[String(status || "")] || String(status || "待确认"));
    for (const row of Array.isArray(ackReview?.rows) ? ackReview.rows : [])
        add("ack_received", `${row.agent || "子 Agent"} 接单确认${ackStatusLabel(row.status)}`, row.status === "approved" ? "ok" : "warn", row.reason, row);
    for (const item of executions || [])
        add("heartbeat_received", `${item.project || "Agent"} ${item.state || "pending"}`, ["failed", "cancelled"].includes(String(item.state || "")) ? "warn" : "info", item.id || "", { execution_id: item.id, state: item.state });
    if (contractTransfer?.required)
        add("contract_changed", "检测到结构化契约变化", contractTransfer.status === "ready" ? "ok" : "warn", contractTransfer.next_action, contractTransfer);
    for (const row of receiptRows || [])
        add("receipt_scored", `${row.agent || "Agent"} 结果说明评分 ${row.quality?.score || 0}`, row.quality?.grade === "good" ? "ok" : "warn", (row.quality?.missing || []).join("、"), row);
    for (const item of targetedRework || [])
        add("targeted_rework_created", item.title || "精准返工建议", "warn", item.reason || "", item);
    for (const item of timeline.filter((entry) => /agent_qa|rework|dispatch|acceptance/i.test(String(entry.type || ""))).slice(-6)) {
        add(String(item.type || "timeline"), item.title || "协作事件", (0, collaboration_task_card_1.timelineStatusForUser)(item) === "failed" ? "warn" : "info", item.detail || "", { timeline_id: item.id || "" });
    }
    return events.slice(-18);
}
function compactRuntimeToolAudit(audit = {}) {
    return {
        runtime: audit.runtime || "",
        mode: audit.mode || "",
        isolation: audit.isolation || "",
        snapshotId: audit.snapshotId || "",
        snapshotPath: audit.snapshotPath || "",
        mcpConfigPath: audit.mcpConfigPath || "",
        skillRoot: audit.skillRoot || "",
        requested: audit.requested || { mcp: [], skill: [] },
        synced: audit.synced || { mcp: [], skill: [] },
        missing: audit.missing || { mcp: [], skill: [] },
        mcp_statuses: Array.isArray(audit.mcp_statuses) ? audit.mcp_statuses.slice(0, 30) : [],
        skill_statuses: Array.isArray(audit.skill_statuses) ? audit.skill_statuses.slice(0, 30) : [],
        permission_rules: Array.isArray(audit.permission_rules) ? audit.permission_rules.slice(0, 50) : [],
        invoked_skills: Array.isArray(audit.invoked_skills) ? audit.invoked_skills.slice(0, 30) : [],
        authorization_readiness: audit.authorization_readiness || null,
        dispatch_gate: audit.dispatch_gate || null,
        catalogRevision: audit.catalogRevision || "",
        warnings: Array.isArray(audit.warnings) ? audit.warnings.slice(0, 12) : [],
        errors: Array.isArray(audit.errors) ? audit.errors.slice(0, 12) : [],
        reusedSnapshot: !!audit.reusedSnapshot,
        timestamp: audit.timestamp || "",
    };
}
function runtimeToolSnapshotFromAudit(audit = {}, allowedTools = {}) {
    return {
        snapshotId: audit.snapshotId || "",
        snapshotPath: audit.snapshotPath || "",
        mcpConfigPath: audit.mcpConfigPath || "",
        allowedTools: allowedTools || audit.requested || { mcp: [], skill: [] },
        permissionRules: Array.isArray(audit.permission_rules) ? audit.permission_rules : [],
        authorizationReadiness: audit.authorization_readiness || null,
        dispatchGate: audit.dispatch_gate || null,
        catalogRevision: audit.catalogRevision || "",
    };
}
function attachInvokedSkillsToReceipt(receipt, text, allowedTools = {}, audit = null) {
    const sourceText = [
        text,
        ...(Array.isArray(receipt?.memoryUsed) ? receipt.memoryUsed : []),
        ...(Array.isArray(receipt?.memory_used) ? receipt.memory_used : []),
    ].join("\n");
    const invoked = (0, runtime_tool_sync_1.detectInvokedSkillsFromText)(sourceText, allowedTools);
    if (audit && invoked.length)
        audit.invoked_skills = (0, memory_1.uniqueByKey)([...(audit.invoked_skills || []), ...invoked], (item) => item.name, 30);
    if (!receipt || !invoked.length)
        return { receipt, invoked };
    return {
        receipt: {
            ...receipt,
            invokedSkills: (0, memory_1.uniqueByKey)([...(Array.isArray(receipt.invokedSkills) ? receipt.invokedSkills : []), ...invoked], (item) => item.name, 30),
            runtimeToolSnapshot: runtimeToolSnapshotFromAudit(audit || {}, allowedTools),
        },
        invoked,
    };
}
function collectRuntimeToolingFromSources(task = {}, execution = {}, lifecycle = [], receipts = []) {
    const audits = [];
    const addAudit = (audit) => {
        if (!audit || typeof audit !== "object")
            return;
        audits.push(compactRuntimeToolAudit(audit));
    };
    for (const event of lifecycle || [])
        addAudit(event?.data?.runtime_tool_sync || event?.data?.runtimeToolSync || (event.action === "runtime_tool_sync" ? event.data : null));
    for (const record of task?.id ? (0, execution_kernel_1.listExecutions)({ taskId: task.id }) : []) {
        for (const item of Array.isArray(record.events) ? record.events : [])
            addAudit(item?.data?.runtime_tool_sync || item?.data?.runtimeToolSync);
    }
    addAudit(execution?.runtimeToolSync || execution?.runtime_tool_sync);
    for (const message of task?.group_id && task?.id ? (0, storage_1.getGroupMessages)(task.group_id, (0, collaboration_task_card_1.groupSessionIdForTask)(task)).filter((item) => item?.task_id === task.id) : []) {
        for (const event of Array.isArray(message.workEvents) ? message.workEvents : [])
            addAudit(event.runtimeToolSync || event.runtime_tool_sync);
    }
    const latestBySnapshot = new Map();
    for (const audit of audits) {
        const fallbackKey = crypto.createHash("sha256").update(JSON.stringify(audit || {})).digest("hex").slice(0, 12);
        const key = `${audit.runtime}|${audit.snapshotId || audit.mcpConfigPath || audit.timestamp || fallbackKey}`;
        latestBySnapshot.set(key, audit);
    }
    const uniqueAudits = Array.from(latestBySnapshot.values()).sort((a, b) => String(a.timestamp || "").localeCompare(String(b.timestamp || "")));
    const invokedSkills = (0, memory_1.uniqueByKey)([
        ...uniqueAudits.flatMap((audit) => audit.invoked_skills || []),
        ...receipts.flatMap((receipt) => Array.isArray(receipt.invokedSkills) ? receipt.invokedSkills : []),
    ], (item) => item.name || JSON.stringify(item), 50);
    const missingMcp = (0, collaboration_1.uniqueStrings)(...uniqueAudits.map((audit) => audit.missing?.mcp || []));
    const missingSkill = (0, collaboration_1.uniqueStrings)(...uniqueAudits.map((audit) => audit.missing?.skill || []));
    const errors = (0, collaboration_1.uniqueStrings)(...uniqueAudits.map((audit) => audit.errors || []));
    const warnings = (0, collaboration_1.uniqueStrings)(...uniqueAudits.map((audit) => audit.warnings || []));
    const dispatchGateBlockers = uniqueAudits
        .filter((audit) => audit.dispatch_gate?.dispatchReady === false)
        .flatMap((audit) => audit.dispatch_gate?.blockers || []);
    const blocked = errors.length > 0
        || missingMcp.length > 0
        || missingSkill.length > 0
        || dispatchGateBlockers.length > 0
        || uniqueAudits.some((audit) => audit.mode === "failed");
    return {
        status: blocked ? "needs_attention" : uniqueAudits.length ? "ready" : "not_recorded",
        audits: uniqueAudits.slice(-12),
        audit_count: uniqueAudits.length,
        latest: uniqueAudits.at(-1) || null,
        snapshots: (0, collaboration_1.uniqueStrings)(uniqueAudits.map((audit) => audit.snapshotId).filter(Boolean)).slice(0, 20),
        reused_snapshot_count: uniqueAudits.filter((audit) => audit.reusedSnapshot).length,
        mcp_statuses: uniqueAudits.flatMap((audit) => audit.mcp_statuses || []).slice(-40),
        skill_statuses: uniqueAudits.flatMap((audit) => audit.skill_statuses || []).slice(-40),
        permission_rules: uniqueAudits.flatMap((audit) => audit.permission_rules || []).slice(-80),
        invoked_skills: invokedSkills,
        dispatch_gate_blockers: dispatchGateBlockers.slice(-20),
        missing: { mcp: missingMcp, skill: missingSkill },
        errors,
        warnings,
    };
}
function buildRuntimeKernelSnapshot(task = {}, summary = {}) {
    const trace = task?.trace_id ? (0, reliability_ledger_1.getTrace)(task.trace_id) : null;
    const events = Array.isArray(trace?.events) ? trace.events : [];
    const lifecycle = events
        .filter((event) => event.type === "agent_runtime.lifecycle")
        .map((event) => ({ ...(event.data || {}), at: event.at, task_id: event.task_id || "", group_id: event.group_id || "", trace_event_id: event.id }))
        .filter((event) => !task?.id || !event.task_id || event.task_id === task.id);
    const contractInjections = events
        .filter((event) => event.type === "agent_runtime.contract_injection")
        .map((event) => ({ ...(event.data || {}), at: event.at, task_id: event.task_id || "", group_id: event.group_id || "", trace_event_id: event.id }))
        .filter((event) => !task?.id || !event.task_id || event.task_id === task.id);
    const latestLifecycle = lifecycle.slice(-8);
    const ackOnlyEvents = lifecycle.filter((event) => event.action === "ack_preflight_dispatch" || event.data?.ack_only === true);
    const dispatches = lifecycle.filter((event) => event.action === "dispatch_worker");
    const contextPressures = lifecycle
        .map((event) => Number(event.context_budget?.pressure || 0))
        .filter((value) => Number.isFinite(value) && value > 0);
    const packetIds = (0, collaboration_1.uniqueStrings)(dispatches.map((event) => event.data?.worker_context_packet?.packet_id), (Array.isArray(summary.assignment_evidence) ? summary.assignment_evidence : []).map((item) => item.worker_context_packet?.packet_id));
    const runtimeTooling = summary.runtime_tooling?.audit_count
        ? summary.runtime_tooling
        : collectRuntimeToolingFromSources(task, {}, lifecycle, Array.isArray(summary.receipts) ? summary.receipts : []);
    const postCompactDispatchMarkers = Array.isArray(summary.post_compact_dispatch_markers || summary.postCompactDispatchMarkers)
        ? (summary.post_compact_dispatch_markers || summary.postCompactDispatchMarkers)
        : (0, collaboration_memory_gates_1.collectTaskPostCompactDispatchMarkers)(task, { assignmentEvidence: summary.assignment_evidence || [], execution: summary.execution || null });
    return {
        trace_id: task?.trace_id || "",
        lifecycle_count: lifecycle.length,
        latest_lifecycle: latestLifecycle,
        blocked_count: lifecycle.filter((event) => ["blocked", "error"].includes(String(event.status || ""))).length,
        ack_only: {
            active: ackOnlyEvents.length > 0 && summary.ack_gate_passed !== true,
            count: ackOnlyEvents.length,
            latest: ackOnlyEvents.at(-1) || null,
        },
        dispatch_worker_count: dispatches.length,
        worker_context_packet_ids: packetIds.slice(0, 12),
        contract_injections: contractInjections.slice(-12),
        injection_ids: (0, collaboration_1.uniqueStrings)(contractInjections.map((item) => item.injection_id), Array.isArray(summary.contract_injection_gate?.rows) ? summary.contract_injection_gate.rows.map((row) => row.injection_id) : []).slice(0, 20),
        context_budget: {
            max_pressure: contextPressures.length ? Math.max(...contextPressures) : 0,
            compact_recommended: lifecycle.some((event) => event.context_budget?.compact_recommended),
        },
        task_agent_memory_context_snapshot: {
            required: Number(summary.task_agent_memory_context_snapshot_count || 0) > 0,
            pass: Number(summary.task_agent_memory_context_snapshot_count || 0) === 0 || summary.task_agent_memory_snapshot_receipt_passed === true,
            status: Number(summary.task_agent_memory_context_snapshot_count || 0) === 0
                ? "not_required"
                : summary.task_agent_memory_snapshot_receipt_passed === true ? "passed" : "session_snapshot_mismatch",
            snapshot_count: Number(summary.task_agent_memory_context_snapshot_count || 0),
            snapshot_ids: (0, collaboration_1.uniqueStrings)((summary.task_agent_memory_context_snapshots || []).map((item) => item.snapshot_id)).slice(0, 20),
            session_ids: (0, collaboration_1.uniqueStrings)((summary.task_agent_memory_context_snapshots || []).map((item) => item.task_agent_session_id)).slice(0, 20),
            worker_context_packet_ids: (0, collaboration_1.uniqueStrings)((summary.task_agent_memory_context_snapshots || []).map((item) => item.worker_context_packet_id)).slice(0, 20),
        },
        memory_gate: (0, collaboration_memory_gates_1.buildMemoryGateVisibleSummary)(summary),
        global_memory_receipt_gate: (0, collaboration_memory_gates_1.buildGlobalMemoryReceiptVisibleSummary)(summary),
        global_memory_health_gate: (0, collaboration_memory_gates_1.buildGlobalMemoryHealthGateVisibleSummary)(summary),
        read_plan_revalidation_gate: (0, collaboration_memory_gates_1.buildReadPlanRevalidationGateVisibleSummary)(summary),
        post_compact_reinjection_gate: (0, collaboration_memory_gates_1.buildPostCompactReinjectionGateVisibleSummary)(summary),
        api_microcompact_receipt: (0, collaboration_memory_gates_1.buildApiMicrocompactReceiptVisibleSummary)(summary),
        post_compact_dispatch_marker: (0, collaboration_memory_gates_1.buildPostCompactDispatchMarkerVisibleSummary)({
            ...summary,
            post_compact_dispatch_markers: postCompactDispatchMarkers,
            post_compact_dispatch_marker_count: postCompactDispatchMarkers.length || Number(summary.post_compact_dispatch_marker_count || 0),
        }),
        runtime_tooling: runtimeTooling,
    };
}
function buildTargetedReworkSuggestions(task, summary = {}, acceptanceReview = null, receiptQualityRows = []) {
    const missing = new Set(Array.isArray(acceptanceReview?.missing) ? acceptanceReview.missing : []);
    const globalMemorySummary = (0, collaboration_memory_gates_1.buildGlobalMemoryReceiptVisibleSummary)(summary);
    const globalMemoryHealthSummary = (0, collaboration_memory_gates_1.buildGlobalMemoryHealthGateVisibleSummary)(summary);
    const apiMicrocompactSummary = (0, collaboration_memory_gates_1.buildApiMicrocompactReceiptVisibleSummary)(summary);
    const suggestions = [];
    const add = (id, title, target = "", reason = "", action = "gap_continue") => {
        if (suggestions.some(item => item.id === id && item.target === target))
            return;
        suggestions.push({ id, title, target, reason: (0, memory_1.compactMemoryText)(reason, 220), action, kind: "targeted_rework", tone: action === "replan" ? "outline" : "warning", label: title });
    };
    const hasMissingAny = (...labels) => labels.some(label => missing.has(label));
    if (hasMissingAny("真实文件 Diff", "真实文件改动"))
        add("missing_diff", "只派实现返工", task?.target_project || "", "任务要求代码变更，但系统没有捕获真实文件改动。");
    if (missing.has("已执行验证"))
        add("missing_verification", "只派验证返工", task?.target_project || "", "任务要求验证，但结果说明里没有可采信的已执行验证。");
    if (hasMissingAny("子 Agent 回执", "子 Agent 结果说明"))
        add("missing_receipt", "要求子 Agent 补结果说明", task?.target_project || "", "缺少可验收的结构化结果说明。");
    if (missing.has("目标覆盖"))
        add("missing_goal_review", "主 Agent 重新复盘目标覆盖", "coordinator", "缺少最终复盘或仍有未解决阻塞。", "replan");
    if (hasMissingAny("子 Agent 记忆快照匹配", "记忆快照匹配"))
        add("task_agent_memory_snapshot_receipt", "补充本轮记忆快照回执", task?.target_project || "", "结果说明没有匹配本轮 task Agent session 的记忆上下文快照。", "gap_continue");
    if (hasMissingAny("记忆 gate 回执", "记忆使用声明"))
        add("memory_gate_receipt", "补充记忆使用声明", task?.target_project || "", "结果说明没有说明本轮群聊记忆使用情况。", "gap_continue");
    if (hasMissingAny("全局记忆回执", "全局记忆使用声明"))
        add("global_memory_receipt", "补充全局记忆使用声明", task?.target_project || "", "结果说明没有按 global_memory_id 声明全局记忆使用、忽略或当前源核验。", "gap_continue");
    if (hasMissingAny("全局记忆健康门禁回执", "全局记忆健康门禁声明", "全局记忆使用说明"))
        add("global_memory_health_gate_receipt", "补充全局记忆使用说明", task?.target_project || "", "结果说明没有说明全局记忆风险和处理情况。", "gap_continue");
    if (hasMissingAny("读取计划重读回执", "读取计划重读声明"))
        add("read_plan_revalidation_gate_receipt", "补充读取计划重读声明", task?.target_project || "", "结果说明没有在绑定子 Agent 会话中声明 stale read plan 已重读当前源。", "gap_continue");
    if (hasMissingAny("压缩重注入回执", "压缩重注入声明", "压缩后上下文恢复声明"))
        add("post_compact_reinjection_gate_receipt", "补充压缩后上下文恢复声明", task?.target_project || "", "结果说明没有说明压缩后上下文如何恢复和使用。", "gap_continue");
    if (hasMissingAny("API microcompact 回执", "API microcompact 使用声明", "上下文压缩计划使用说明"))
        add("api_microcompact_receipt", "补充上下文压缩计划使用说明", task?.target_project || "", "结果说明没有说明上下文压缩计划的使用状态。", "gap_continue");
    if (hasMissingAny("回执质量", "结果说明质量", "结果说明完整"))
        add("weak_receipt", "要求补充高质量结果说明", task?.target_project || "", "结果说明质量未通过，需要补接单说明、动作、文件、验证、契约或记忆声明。", "gap_continue");
    for (const value of Array.isArray(summary.verification_failed) ? summary.verification_failed : []) {
        add("failed_verification", "只修失败验证点", task?.target_project || "", String(value), "gap_continue");
    }
    for (const row of receiptQualityRows.filter((item) => item.quality?.grade !== "good")) {
        if (row.quality?.handoff_quality?.pass === false) {
            add("handoff_only_receipt", "要求补齐真实执行证据", row.agent || row.project || "", row.quality.handoff_quality.reason || "子 Agent 的结果更像建议或交接，需要补齐真实修改、执行动作和验证证据。", "gap_continue");
        }
        if (row.quality?.memory_gate?.required && row.quality?.memory_gate?.pass !== true) {
            add("memory_gate_receipt", "补充记忆使用声明", row.agent || row.project || "", `结果说明需要引用记忆 gate：${(row.quality.memory_gate.missing_gate_ids || row.quality.memory_gate.gate_ids || []).join("、") || "本轮派发 gate"}`, "gap_continue");
        }
        if (row.quality?.global_memory_gate?.required && row.quality?.global_memory_gate?.pass !== true) {
            const gate = row.quality.global_memory_gate;
            const reason = (gate.unsafe_used_global_memory_ids || []).length
                ? `background-only 或降权全局记忆不能直接使用，需声明 ignored/background 或 current source verified：${gate.unsafe_used_global_memory_ids.join("、")}`
                : (gate.missing_current_verification_ids || []).length
                    ? `风险全局记忆使用前必须声明 current source verified：${gate.missing_current_verification_ids.join("、")}`
                    : (gate.missing_semantic_acknowledgement_ids || []).length
                        ? `语义仲裁全局记忆必须声明 semantic_risk 已识别：${gate.missing_semantic_acknowledgement_ids.join("、")}`
                        : (gate.missing_cross_group_acknowledgement_ids || []).length
                            ? `跨群聊全局记忆必须声明 cross_group_suppression/advisory/background：${gate.missing_cross_group_acknowledgement_ids.join("、")}`
                            : `结果说明需要按 global_memory_id 声明使用状态：${(gate.missing_global_memory_ids || gate.global_memory_ids || []).join("、") || "本轮全局记忆"}`;
            add("global_memory_receipt", "补充全局记忆使用声明", row.agent || row.project || "", reason, "gap_continue");
        }
        if (row.quality?.global_memory_health_gate?.required && row.quality?.global_memory_health_gate?.pass !== true) {
            const gate = row.quality.global_memory_health_gate;
            const reason = (gate.blocked_global_memory_used_gate_ids || []).length
                ? `Global Agent memory health gate 已阻断，但结果说明仍声明使用全局记忆：${gate.blocked_global_memory_used_gate_ids.join("、")}`
                : (gate.missing_ignore_gate_ids || []).length
                    ? `健康门禁失败时必须在 memoryIgnored 引用 gate 并说明不使用全局记忆：${gate.missing_ignore_gate_ids.join("、")}`
                    : (gate.missing_warning_ack_gate_ids || []).length
                        ? `健康门禁 warn 时必须声明残留警告或当前源核验：${gate.missing_warning_ack_gate_ids.join("、")}`
                        : `结果说明需要引用 Global Agent memory health gate：${(gate.missing_gate_ids || gate.gate_ids || []).join("、") || "本轮健康门禁"}`;
            add("global_memory_health_gate_receipt", "补充全局记忆健康门禁声明", row.agent || row.project || "", reason, "gap_continue");
        }
        if (row.quality?.read_plan_revalidation_gate?.required && row.quality?.read_plan_revalidation_gate?.pass !== true) {
            const gate = row.quality.read_plan_revalidation_gate;
            const reason = gate.session_matched === false
                ? `结果说明必须来自绑定子 Agent 会话：${(gate.session_mismatch_gate_ids || gate.gate_ids || []).join("、") || "本轮读取计划重读 gate"}`
                : (gate.missing_read_plan_ids || []).length
                    ? `结果说明需要声明 stale read_plan_id 已重读当前源：${gate.missing_read_plan_ids.join("、")}`
                    : `结果说明需要引用读取计划重读 gate 并声明 current source verified：${(gate.missing_gate_ids || gate.gate_ids || []).join("、") || "本轮读取计划重读 gate"}`;
            add("read_plan_revalidation_gate_receipt", "补充读取计划重读声明", row.agent || row.project || "", reason, "gap_continue");
        }
        if (row.quality?.post_compact_reinjection_gate?.required && row.quality?.post_compact_reinjection_gate?.pass !== true) {
            const gate = row.quality.post_compact_reinjection_gate;
            const missingUsageIds = gate.missing_candidate_usage_gate_ids || [];
            const missingUsageCandidateIds = gate.missing_candidate_usage_candidate_ids || [];
            const missingCandidateIds = gate.missing_candidate_reference_gate_ids || [];
            const missingGateIds = gate.missing_gate_ids || [];
            const fallbackGateIds = missingGateIds.length ? missingGateIds : (gate.gate_ids || []);
            const reason = missingUsageIds.length
                ? `结果说明需要逐条声明压缩后重注入候选的使用状态 used/ignored/verified：${(missingUsageCandidateIds.length ? missingUsageCandidateIds : missingUsageIds).join("、")}`
                : missingCandidateIds.length
                    ? `结果说明需要声明压缩后重注入候选 candidate_id / 候选值 / 全部候选：${missingCandidateIds.join("、")}`
                    : `结果说明需要引用压缩后重注入 gate：${fallbackGateIds.join("、") || "本轮重注入 gate"}`;
            add("post_compact_reinjection_gate_receipt", "补充压缩记忆使用声明", row.agent || row.project || "", reason, "gap_continue");
        }
        if (row.quality?.api_microcompact?.required && row.quality?.api_microcompact?.pass !== true) {
            const gate = row.quality.api_microcompact;
            const reason = (gate.unsafe_native_applied_plan_checksums || []).length
                ? `该执行器不支持 native API context-management 时不能声明原生应用：${gate.unsafe_native_applied_plan_checksums.join("、")}`
                : `结果说明需要声明 API microcompact edit plan 使用状态 native_applied/advisory/ignored：${(gate.missing_plan_checksums || gate.plan_checksums || []).join("、") || "本轮计划"}`;
            add("api_microcompact_receipt", "补充 API microcompact 使用声明", row.agent || row.project || "", reason, "gap_continue");
        }
        add("weak_receipt", "要求补充高质量结果说明", row.agent || row.project || "", `结果说明评分 ${row.quality?.score || 0}：${(row.quality?.missing || []).join("、")}`, "gap_continue");
    }
    for (const row of Array.isArray(globalMemorySummary?.rows) ? globalMemorySummary.rows : []) {
        if (["not_required", "passed"].includes(String(row.status || "")))
            continue;
        add("global_memory_receipt", "补充全局记忆使用声明", row.agent || task?.target_project || "", row.reason || "结果说明缺少全局记忆使用声明。", "gap_continue");
    }
    for (const row of Array.isArray(globalMemoryHealthSummary?.rows) ? globalMemoryHealthSummary.rows : []) {
        if (["not_required", "passed"].includes(String(row.status || "")))
            continue;
        add("global_memory_health_gate_receipt", "补充全局记忆健康门禁声明", row.agent || task?.target_project || "", row.reason || "结果说明缺少 Global Agent memory health gate 使用/忽略声明。", "gap_continue");
    }
    for (const row of Array.isArray(apiMicrocompactSummary?.rows) ? apiMicrocompactSummary.rows : []) {
        if (["not_required", "passed"].includes(String(row.status || "")))
            continue;
        add("api_microcompact_receipt", "补充 API microcompact 使用声明", row.agent || task?.target_project || "", row.reason || "结果说明缺少 API microcompact edit plan 使用状态声明。", "gap_continue");
    }
    return suggestions.slice(0, 8);
}
function buildChildAgentPlanReviewSummary(ackReview = {}, orders = []) {
    const rows = Array.isArray(ackReview.rows) ? ackReview.rows : [];
    const orderAgents = orders.map((order) => String(order.project || order.agent || order.target || "").trim()).filter(Boolean);
    const reviewRows = rows.length
        ? rows
        : orderAgents.map((agent) => ({ agent, status: "waiting", reason: "等待接单 ACK", planned_scope: [], verification_plan: [], unclear: [] }));
    if (!reviewRows.length)
        return null;
    const normalizedRows = reviewRows.slice(0, 12).map((row) => {
        const rawStatus = String(row.status || "").toLowerCase();
        const approved = rawStatus === "approved";
        const waiting = rawStatus === "waiting";
        const needsRevision = ["missing", "weak", "needs_rewrite"].includes(rawStatus);
        const status = approved ? "approved" : waiting ? "waiting" : needsRevision ? "needs_revision" : (rawStatus || "waiting");
        return {
            agent: (0, collaboration_task_card_1.sanitizeUserAgentProgressText)(row.agent || row.project || "执行成员", "执行成员", 80),
            status,
            status_label: status === "approved" ? "计划清晰" : status === "waiting" ? "等待计划" : "需调整",
            understood_goal: (0, memory_1.compactMemoryText)(row.understood_goal || row.understoodGoal || "", 180),
            planned_scope: (Array.isArray(row.planned_scope) ? row.planned_scope : Array.isArray(row.plannedScope) ? row.plannedScope : [])
                .map((item) => (0, memory_1.compactMemoryText)(item, 140)).filter(Boolean).slice(0, 5),
            forbidden_scope: (Array.isArray(row.forbidden_scope) ? row.forbidden_scope : Array.isArray(row.forbiddenScope) ? row.forbiddenScope : [])
                .map((item) => (0, memory_1.compactMemoryText)(item, 140)).filter(Boolean).slice(0, 4),
            verification_plan: (Array.isArray(row.verification_plan) ? row.verification_plan : Array.isArray(row.verificationPlan) ? row.verificationPlan : [])
                .map((item) => (0, memory_1.compactMemoryText)(item, 140)).filter(Boolean).slice(0, 5),
            unclear: (Array.isArray(row.unclear) ? row.unclear : [])
                .map((item) => (0, memory_1.compactMemoryText)(item, 140)).filter(Boolean).slice(0, 4),
            reason: (0, collaboration_task_card_1.sanitizeUserAgentProgressText)(row.reason || (status === "approved" ? "目标、范围和验证安排清晰" : status === "waiting" ? "等待执行成员提交接单计划" : "执行计划需要补齐目标、范围或验证安排"), "执行计划已整理。", 180),
        };
    });
    const needsRevisionCount = normalizedRows.filter((row) => row.status === "needs_revision").length;
    const waitingCount = normalizedRows.filter((row) => row.status === "waiting").length;
    const approvedCount = normalizedRows.filter((row) => row.status === "approved").length;
    const status = needsRevisionCount ? "needs_revision" : waitingCount ? "waiting" : "approved";
    return {
        schema: "ccm-child-agent-plan-review-v1",
        title: "执行成员计划",
        status,
        status_label: status === "approved" ? "已通过" : status === "waiting" ? "等待提交" : "需调整",
        headline: status === "approved"
            ? "我已检查执行成员的接单计划，目标、范围和验证安排清晰。"
            : status === "waiting"
                ? "正在等待执行成员提交接单计划；收到后我会先检查再让其继续执行。"
                : `${needsRevisionCount} 个执行成员的执行计划还不够清楚，我会先要求补齐目标、范围或验证安排。`,
        approved_count: approvedCount,
        waiting_count: waitingCount,
        needs_revision_count: needsRevisionCount,
        rows: normalizedRows,
        next_action: status === "approved"
            ? "继续跟踪执行结果、文件改动和验证证据。"
            : status === "waiting"
                ? "等待执行成员提交接单计划。"
                : "先要求对应执行成员重写接单计划，再继续执行或验收。",
        display_policy: {
            user_text_first: true,
            technical_default_collapsed: true,
            hide_internal_protocols: true,
            show_for_ordinary_conversation: false,
        },
    };
}
function buildUserAgentCoordinationProtocol(task, summary = {}, executions = [], workOrderPreview = null, acceptanceReview = null) {
    const orders = Array.isArray(workOrderPreview?.orders) ? workOrderPreview.orders : [];
    const receiptCandidates = [
        ...(Array.isArray(summary.receipts) ? summary.receipts : []),
        ...(Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses : []),
    ];
    const seenReceiptAgents = new Set();
    const receipts = receiptCandidates.filter((receipt) => {
        const agent = String(receipt?.agent || receipt?.project || "").trim().toLowerCase();
        if (!agent)
            return true;
        if (seenReceiptAgents.has(agent))
            return false;
        seenReceiptAgents.add(agent);
        return true;
    });
    const memoryDispatchGates = Array.isArray(summary.memory_dispatch_gates || summary.memoryDispatchGates)
        ? (summary.memory_dispatch_gates || summary.memoryDispatchGates)
        : (0, collaboration_memory_gates_1.collectTaskMemoryDispatchFreshnessGates)(task, { assignmentEvidence: summary.assignment_evidence || [], execution: summary.execution || null });
    const globalMemoryReceiptGates = Array.isArray(summary.global_memory_receipt_gates || summary.globalMemoryReceiptGates)
        ? (summary.global_memory_receipt_gates || summary.globalMemoryReceiptGates)
        : (0, collaboration_memory_gates_1.collectTaskGlobalMemoryReceiptGates)(task, { assignmentEvidence: summary.assignment_evidence || [], execution: summary.execution || null });
    const globalMemoryHealthGates = Array.isArray(summary.global_memory_health_gates || summary.globalMemoryHealthGates)
        ? (summary.global_memory_health_gates || summary.globalMemoryHealthGates)
        : (0, collaboration_memory_gates_1.collectTaskGlobalMemoryHealthGates)(task, { assignmentEvidence: summary.assignment_evidence || [], execution: summary.execution || null });
    const readPlanRevalidationGates = Array.isArray(summary.read_plan_revalidation_gates || summary.readPlanRevalidationGates)
        ? (summary.read_plan_revalidation_gates || summary.readPlanRevalidationGates)
        : (0, collaboration_memory_gates_1.collectTaskReadPlanRevalidationGates)(task, { assignmentEvidence: summary.assignment_evidence || [], execution: summary.execution || null });
    const postCompactReinjectionGates = Array.isArray(summary.post_compact_reinjection_gates || summary.postCompactReinjectionGates)
        ? (summary.post_compact_reinjection_gates || summary.postCompactReinjectionGates)
        : (0, collaboration_memory_gates_1.collectTaskPostCompactReinjectionGates)(task, { assignmentEvidence: summary.assignment_evidence || [], execution: summary.execution || null });
    const apiMicrocompactEditPlans = Array.isArray(summary.api_microcompact_edit_plans || summary.apiMicrocompactEditPlans)
        ? (summary.api_microcompact_edit_plans || summary.apiMicrocompactEditPlans)
        : (0, collaboration_memory_gates_1.collectTaskApiMicrocompactEditPlans)(task, { assignmentEvidence: summary.assignment_evidence || [], execution: summary.execution || null });
    const postCompactDispatchMarkers = Array.isArray(summary.post_compact_dispatch_markers || summary.postCompactDispatchMarkers)
        ? (summary.post_compact_dispatch_markers || summary.postCompactDispatchMarkers)
        : (0, collaboration_memory_gates_1.collectTaskPostCompactDispatchMarkers)(task, { assignmentEvidence: summary.assignment_evidence || [], execution: summary.execution || null });
    const notifications = Array.isArray(summary.worker_notifications) ? summary.worker_notifications : [];
    const receiptRows = receipts.map((receipt) => ({
        agent: receipt.agent || receipt.project || "",
        status: receipt.status || receipt.receipt_status || "",
        summary: (0, memory_1.compactMemoryText)(receipt.summary || "", 160),
        quality: scoreChildAgentReceipt(task, receipt, { memoryDispatchGates, globalMemoryReceiptGates, globalMemoryHealthGates, readPlanRevalidationGates, postCompactReinjectionGates, apiMicrocompactEditPlans, assignmentEvidence: summary.assignment_evidence || [] }),
    })).slice(0, 10);
    const memoryGateSummary = (0, collaboration_memory_gates_1.buildMemoryGateVisibleSummary)({
        ...summary,
        memory_dispatch_gates: memoryDispatchGates,
        memory_gate_receipt_rows: receiptRows
            .filter((row) => row.quality?.memory_gate?.required)
            .map((row) => ({ ...row, memory_gate: row.quality.memory_gate })),
    });
    const readPlanRevalidationGateSummary = (0, collaboration_memory_gates_1.buildReadPlanRevalidationGateVisibleSummary)({
        ...summary,
        read_plan_revalidation_gates: readPlanRevalidationGates,
        read_plan_revalidation_gate_receipt_rows: receiptRows
            .filter((row) => row.quality?.read_plan_revalidation_gate?.required)
            .map((row) => ({ ...row, read_plan_revalidation_gate: row.quality.read_plan_revalidation_gate })),
    });
    const globalMemoryReceiptSummary = (0, collaboration_memory_gates_1.buildGlobalMemoryReceiptVisibleSummary)({
        ...summary,
        global_memory_receipt_gates: globalMemoryReceiptGates,
        global_memory_receipt_rows: receiptRows
            .filter((row) => row.quality?.global_memory_gate?.required)
            .map((row) => ({ ...row, global_memory_gate: row.quality.global_memory_gate })),
    });
    const globalMemoryHealthGateSummary = (0, collaboration_memory_gates_1.buildGlobalMemoryHealthGateVisibleSummary)({
        ...summary,
        global_memory_health_gates: globalMemoryHealthGates,
        global_memory_health_gate_receipt_rows: receiptRows
            .filter((row) => row.quality?.global_memory_health_gate?.required)
            .map((row) => ({ ...row, global_memory_health_gate: row.quality.global_memory_health_gate })),
    });
    const reinjectionGateSummary = (0, collaboration_memory_gates_1.buildPostCompactReinjectionGateVisibleSummary)({
        ...summary,
        post_compact_reinjection_gates: postCompactReinjectionGates,
        post_compact_reinjection_gate_receipt_rows: receiptRows
            .filter((row) => row.quality?.post_compact_reinjection_gate?.required)
            .map((row) => ({ ...row, post_compact_reinjection_gate: row.quality.post_compact_reinjection_gate })),
    });
    const apiMicrocompactSummary = (0, collaboration_memory_gates_1.buildApiMicrocompactReceiptVisibleSummary)({
        ...summary,
        api_microcompact_edit_plans: apiMicrocompactEditPlans,
        api_microcompact_receipt_rows: receiptRows
            .filter((row) => row.quality?.api_microcompact?.required)
            .map((row) => ({ ...row, api_microcompact: row.quality.api_microcompact })),
    });
    const postCompactDispatchMarkerSummary = (0, collaboration_memory_gates_1.buildPostCompactDispatchMarkerVisibleSummary)({
        ...summary,
        post_compact_dispatch_markers: postCompactDispatchMarkers,
        post_compact_dispatch_marker_count: postCompactDispatchMarkers.length,
    });
    const handoff = orders.map((order) => {
        const matchName = (value) => String(value || "").toLowerCase() === String(order.project || "").toLowerCase();
        const receipt = receipts.find((item) => matchName(item.agent || item.project));
        const notification = notifications.find((item) => matchName(item.task_id || item.agent || item.project));
        const execution = executions.find((item) => matchName(item.project));
        const accepted = !!(receipt || notification || execution);
        return {
            agent: order.project,
            role: order.role,
            objective: order.objective,
            status: accepted ? "accepted" : workOrderPreview?.requires_confirmation ? "waiting_confirmation" : "waiting_ack",
            detail: accepted ? "已看到执行、结果说明或通知证据" : "等待执行成员接单确认",
        };
    }).slice(0, 10);
    const heartbeat = (0, collaboration_1.uniqueStrings)([
        ...executions.map((item) => `${item.project || "Agent"}：${item.state || "pending"}`),
        ...notifications.map((item) => `${item.task_id || item.agent || "Agent"}：${item.status || "unknown"}${item.summary ? ` · ${item.summary}` : ""}`),
    ]).slice(0, 10).map((item, index) => ({ id: `heartbeat_${index + 1}`, text: (0, memory_1.compactMemoryText)(item, 180) }));
    const contractSync = (0, protocol_gates_1.extractContractSyncHints)(task, summary);
    const computedAckReview = (0, protocol_gates_1.buildAckPreflightReview)(task, receipts, orders);
    const providedAckReview = summary.ack_review || summary.ackReview || null;
    const mergedAckRows = Array.isArray(providedAckReview?.rows)
        ? providedAckReview.rows.map((row) => {
            const agent = String(row?.agent || row?.project || "").toLowerCase();
            const computedRow = computedAckReview.rows?.find((item) => String(item?.agent || item?.project || "").toLowerCase() === agent) || {};
            return {
                ...computedRow,
                ...row,
                planned_scope: Array.isArray(row?.planned_scope) || Array.isArray(row?.plannedScope)
                    ? (row.planned_scope || row.plannedScope)
                    : computedRow.planned_scope,
                forbidden_scope: Array.isArray(row?.forbidden_scope) || Array.isArray(row?.forbiddenScope)
                    ? (row.forbidden_scope || row.forbiddenScope)
                    : computedRow.forbidden_scope,
                verification_plan: Array.isArray(row?.verification_plan) || Array.isArray(row?.verificationPlan)
                    ? (row.verification_plan || row.verificationPlan)
                    : computedRow.verification_plan,
                unclear: Array.isArray(row?.unclear) ? row.unclear : computedRow.unclear,
            };
        })
        : [];
    const ackReview = Array.isArray(providedAckReview?.rows) && providedAckReview.rows.length
        ? {
            ...computedAckReview,
            ...providedAckReview,
            rows: mergedAckRows,
            rejected: Array.isArray(providedAckReview.rejected)
                ? providedAckReview.rejected
                : mergedAckRows.filter((row) => ["missing", "needs_rewrite", "weak"].includes(String(row?.status || ""))),
        }
        : computedAckReview;
    const childPlanReview = buildChildAgentPlanReviewSummary(ackReview, orders);
    const contractTransfer = (0, protocol_gates_1.buildContractTransferPlan)(contractSync, orders);
    const contractInjectionGate = (0, protocol_gates_1.evaluateContractInjectionGate)(contractTransfer.rows || [], Array.isArray(summary.assignment_evidence) ? summary.assignment_evidence : [], receipts);
    const targetedRework = buildTargetedReworkSuggestions(task, summary, acceptanceReview, receiptRows);
    if (ackReview.rejected?.length) {
        for (const row of ackReview.rejected.slice(0, 4)) {
            targetedRework.push({ id: "ack_rewrite", title: "要求重写接单 ACK", target: row.agent || "", reason: row.reason || "ACK 不完整", action: "gap_continue", kind: "targeted_rework", tone: "warning", label: "要求重写 ACK" });
        }
    }
    if (contractTransfer.status === "needs_contract_changes" || contractTransfer.status === "needs_target") {
        targetedRework.push({ id: "contract_sync", title: "同步结构化契约", target: "", reason: contractTransfer.next_action, action: "gap_continue", kind: "targeted_rework", tone: "warning", label: "同步契约" });
    }
    if (contractInjectionGate.required && !contractInjectionGate.pass) {
        for (const row of contractInjectionGate.missing.slice(0, 4)) {
            targetedRework.push({
                id: "contract_inject",
                title: "注入契约给依赖 Agent",
                target: row.target,
                reason: `${row.endpoint || row.type || "contract"}：${row.summary || "结构化契约变化需要同步"}`,
                action: "gap_continue",
                kind: "targeted_rework",
                tone: "warning",
                label: "注入契约",
            });
        }
        for (const row of contractInjectionGate.unconsumed.slice(0, 4)) {
            targetedRework.push({
                id: "contract_consume",
                title: "补充契约消费结果说明",
                target: row.target,
                reason: `${row.endpoint || row.type || "contract"}：结果说明必须引用 injection_id=${row.injection_id}`,
                action: "gap_continue",
                kind: "targeted_rework",
                tone: "warning",
                label: "补消费说明",
            });
        }
    }
    const coordinationEvents = buildCoordinationEventStream(task, {
        ...summary,
        global_memory_receipt_gates: globalMemoryReceiptGates,
        global_memory_receipt_rows: receiptRows
            .filter((row) => row.quality?.global_memory_gate?.required)
            .map((row) => ({ ...row, global_memory_gate: row.quality.global_memory_gate })),
        global_memory_health_gates: globalMemoryHealthGates,
        global_memory_health_gate_receipt_rows: receiptRows
            .filter((row) => row.quality?.global_memory_health_gate?.required)
            .map((row) => ({ ...row, global_memory_health_gate: row.quality.global_memory_health_gate })),
        read_plan_revalidation_gates: readPlanRevalidationGates,
        read_plan_revalidation_gate_receipt_rows: receiptRows
            .filter((row) => row.quality?.read_plan_revalidation_gate?.required)
            .map((row) => ({ ...row, read_plan_revalidation_gate: row.quality.read_plan_revalidation_gate })),
        api_microcompact_edit_plans: apiMicrocompactEditPlans,
        api_microcompact_receipt_rows: receiptRows
            .filter((row) => row.quality?.api_microcompact?.required)
            .map((row) => ({ ...row, api_microcompact: row.quality.api_microcompact })),
    }, executions, ackReview, contractTransfer, receiptRows, targetedRework);
    const weakReceipts = receiptRows.filter((row) => row.quality.grade !== "good");
    const healthScoreParts = [
        handoff.length ? Math.round((handoff.filter((item) => item.status === "accepted").length / handoff.length) * 100) : 100,
        receiptRows.length ? Math.round(receiptRows.reduce((sum, row) => sum + row.quality.score, 0) / receiptRows.length) : (orders.length ? 40 : 100),
        contractSync.status === "needs_sync" ? 50 : 100,
        memoryGateSummary.required && !memoryGateSummary.pass ? 50 : 100,
        globalMemoryReceiptSummary.required && !globalMemoryReceiptSummary.pass ? 50 : 100,
        globalMemoryHealthGateSummary.required && !globalMemoryHealthGateSummary.pass ? 50 : 100,
        readPlanRevalidationGateSummary.required && !readPlanRevalidationGateSummary.pass ? 50 : 100,
        reinjectionGateSummary.required && !reinjectionGateSummary.pass ? 50 : 100,
        apiMicrocompactSummary.required && !apiMicrocompactSummary.pass ? 50 : 100,
        targetedRework.length ? 60 : 100,
    ];
    const health = Math.round(healthScoreParts.reduce((sum, value) => sum + value, 0) / healthScoreParts.length);
    const runtimeKernel = summary.runtime_kernel || buildRuntimeKernelSnapshot(task, {
        ...summary,
        global_memory_receipt_gates: globalMemoryReceiptGates,
        global_memory_receipt_rows: receiptRows
            .filter((row) => row.quality?.global_memory_gate?.required)
            .map((row) => ({ ...row, global_memory_gate: row.quality.global_memory_gate })),
        global_memory_health_gates: globalMemoryHealthGates,
        global_memory_health_gate_receipt_rows: receiptRows
            .filter((row) => row.quality?.global_memory_health_gate?.required)
            .map((row) => ({ ...row, global_memory_health_gate: row.quality.global_memory_health_gate })),
        api_microcompact_edit_plans: apiMicrocompactEditPlans,
        api_microcompact_receipt_rows: receiptRows
            .filter((row) => row.quality?.api_microcompact?.required)
            .map((row) => ({ ...row, api_microcompact: row.quality.api_microcompact })),
    });
    return {
        version: 1,
        source: "main-child-agent-coordination-6.0",
        title: "主 Agent ↔ 子 Agent 协作",
        health,
        status: health >= 85 ? "healthy" : health >= 60 ? "needs_attention" : "blocked",
        ack_review: ackReview,
        child_plan_review: childPlanReview,
        handoff,
        heartbeat,
        contract_sync: contractSync,
        contract_transfer: contractTransfer,
        contract_injection_gate: contractInjectionGate,
        memory_gate_summary: memoryGateSummary,
        global_memory_receipt_summary: globalMemoryReceiptSummary,
        global_memory_health_gate_summary: globalMemoryHealthGateSummary,
        read_plan_revalidation_gate_summary: readPlanRevalidationGateSummary,
        post_compact_reinjection_gate_summary: reinjectionGateSummary,
        api_microcompact_receipt_summary: apiMicrocompactSummary,
        post_compact_dispatch_marker_summary: postCompactDispatchMarkerSummary,
        runtime_kernel: runtimeKernel,
        coordination_events: coordinationEvents,
        receipt_quality: receiptRows,
        weak_receipts: weakReceipts,
        targeted_rework: targetedRework,
        next_action: targetedRework.length
            ? "按缺口精准返工，不整轮重跑"
            : weakReceipts.length
                ? "要求子 Agent 补充更完整结果说明"
                : contractSync.status === "needs_sync"
                    ? "同步跨 Agent 接口/字段契约"
                    : "继续跟踪执行和验收",
    };
}
//# sourceMappingURL=collaboration-coordination-ux-part-01.js.map