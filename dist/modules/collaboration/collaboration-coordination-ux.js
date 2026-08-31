"use strict";
// collaboration-coordination-ux.ts — merged from 2 part files (behavior-freeze merge).
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
const worker_handoff_1 = require("../../agents/worker-handoff");
// ===== merged from collaboration-coordination-ux-part-01.ts =====
/** Coordination protocol UX, runtime kernel display, and dispatch helpers. Behavior-preserving extraction from the collaboration facade. */
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
        items.push(...splitEvidenceList(value));
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
    const hasExecutedVerification = verification.some((item) => !isSuggestedOnlyVerification(item) && !isFailedVerification(item));
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
    const normalize = (value = {}) => ({
        mcp: (0, collaboration_1.uniqueStrings)(Array.isArray(value?.mcp) ? value.mcp : []),
        skill: (0, collaboration_1.uniqueStrings)(Array.isArray(value?.skill) ? value.skill : []),
    });
    const configuredTools = normalize(allowedTools?.configuredTools || allowedTools?.configured_tools || allowedTools);
    const executionRoleSkills = (0, collaboration_1.uniqueStrings)(allowedTools?.executionRoleSkills || allowedTools?.execution_role_skills || []);
    const effectiveTools = normalize(allowedTools || audit.requested || {});
    return {
        schema: "ccm-runtime-tool-authorization-snapshot-v2",
        snapshotId: audit.snapshotId || "",
        snapshotPath: audit.snapshotPath || "",
        mcpConfigPath: audit.mcpConfigPath || "",
        allowedTools: effectiveTools,
        configuredTools,
        executionRoleSkills,
        enforceExecutionRoleSkills: allowedTools?.enforceExecutionRoleSkills === true || allowedTools?.enforce_execution_role_skills === true,
        effectiveTools,
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
// ===== merged from collaboration-coordination-ux-part-02.ts =====
/** Coordination protocol UX, runtime kernel display, and dispatch helpers. Behavior-preserving extraction from the collaboration facade. */
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
        return (!status || status === "done") && scoreChildAgentReceipt(task, receipt, { memoryDispatchGates, globalMemoryReceiptGates, globalMemoryHealthGates, readPlanRevalidationGates, postCompactReinjectionGates, apiMicrocompactEditPlans, assignmentEvidence: assignments }).grade === "good";
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
        quality: scoreChildAgentReceipt(task, receipt, { memoryDispatchGates, globalMemoryReceiptGates, globalMemoryHealthGates, readPlanRevalidationGates, postCompactReinjectionGates, apiMicrocompactEditPlans, assignmentEvidence: assignments }),
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
        const quality = scoreChildAgentReceipt(task, receipt, { memoryDispatchGates, globalMemoryReceiptGates, globalMemoryHealthGates, readPlanRevalidationGates, postCompactReinjectionGates, apiMicrocompactEditPlans, assignmentEvidence: assignments });
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
        const quality = receipt ? scoreChildAgentReceipt(task, receipt, { memoryDispatchGates, globalMemoryReceiptGates, globalMemoryHealthGates, readPlanRevalidationGates, postCompactReinjectionGates, apiMicrocompactEditPlans, assignmentEvidence: assignments }) : null;
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
function coordinationUserGoal(task) {
    const source = (0, memory_1.compactMemoryText)(task?.user_goal || task?.userGoal || task?.business_goal || task?.businessGoal || task?.title || "这项需求", 1200);
    const explicitGoal = source.match(/(?:用户目标|业务目标|需求目标|目标)\s*[：:]\s*([^\r\n]+)/i)?.[1] || "";
    const value = explicitGoal || source;
    return (0, memory_1.compactMemoryText)(value
        .replace(/【(?:全局|群聊|项目)?主\s*Agent[^】]*】/gi, " ")
        .replace(/请按(?:这个|以下)?链路[\s\S]*$/i, " ")
        .replace(/(?:回执|派发|工作单|内部约束|技术要求)\s*[：:][\s\S]*$/i, " ")
        .replace(/\s+/g, " ")
        .trim(), 180).replace(/[。！？!?；;，,]+$/u, "") || "这项需求";
}
function buildUserCoordinationAcknowledgement(task, assignments = [], options = {}) {
    const projects = (0, collaboration_1.uniqueStrings)([
        ...(assignments || []).map((item) => item.project),
        ...(Array.isArray(options.projects) ? options.projects : []),
    ].filter(Boolean));
    const dispatchPolicy = options.dispatchPolicy || task?.dispatch_policy || task?.dispatchPolicy || {};
    const requiresConfirmation = dispatchPolicy.requiresConfirmation === true
        || dispatchPolicy.requires_confirmation === true
        || ["ask_user", "await_confirmation", "needs_confirmation"].includes(String(dispatchPolicy.action || ""));
    const queue = options.queue || task?.queue || {};
    const queuePosition = Math.max(0, Number(queue.position || task?.queue_position || task?.queuePosition || 0));
    const rows = [
        "已接管这项开发需求。",
        `目标：${coordinationUserGoal(task)}`,
        `负责范围：${projects.length ? projects.join("、") : "正在确认涉及的项目"}`,
        "执行流程：确认范围 → 开发修改 → 运行验证 → TestAgent（独立验收） → 最终交付",
        `确认状态：${requiresConfirmation ? "需要你确认计划后再执行" : "当前无需额外确认"}`,
        queuePosition > 0 ? `队列状态：第 ${queuePosition} 位` : "当前状态：正在制定执行计划",
        "后续只更新同一张任务卡；遇到阻塞或完成时再通知你。",
    ];
    return rows.join("\n");
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
//# sourceMappingURL=collaboration-coordination-ux.js.map