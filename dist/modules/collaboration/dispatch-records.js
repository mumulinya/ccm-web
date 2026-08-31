"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeMentionTask = normalizeMentionTask;
exports.normalizeDispatchTask = normalizeDispatchTask;
exports.buildDispatchKey = buildDispatchKey;
exports.normalizeReceiptStatus = normalizeReceiptStatus;
exports.receiptStatusToDispatchStatus = receiptStatusToDispatchStatus;
exports.dispatchStatusToAssignmentStatus = dispatchStatusToAssignmentStatus;
exports.normalizeDispatchAssignment = normalizeDispatchAssignment;
exports.normalizeDispatchBatch = normalizeDispatchBatch;
exports.attachDispatchIdentityToMention = attachDispatchIdentityToMention;
exports.createDispatchRecord = createDispatchRecord;
exports.recordToAssignmentStatus = recordToAssignmentStatus;
exports.recordToWorkerLedger = recordToWorkerLedger;
exports.recordToTaskNotification = recordToTaskNotification;
exports.recordToCollectedOutput = recordToCollectedOutput;
exports.recordToTimelineEvent = recordToTimelineEvent;
function normalizeMentionTask(text) {
    return String(text || "").replace(/\s+/g, " ").trim().slice(0, 240);
}
function normalizeDispatchTask(text) {
    return normalizeMentionTask(text)
        .replace(/主\s*Agent\s*(?:工作单|指派|派发|要求)/gi, "")
        .replace(/(?:回执要求|必须包含|CCM_AGENT_RECEIPT|结构化回执|验收标准|执行要求)[：:：]?/gi, "")
        .replace(/[`*_#>\[\]{}()（）【】]+/g, " ")
        .replace(/[，。；、,.;:：\-—\s]+/g, " ")
        .trim()
        .toLowerCase()
        .slice(0, 220);
}
function safeDispatchKeyPart(value, max = 80) {
    return String(value || "")
        .replace(/[|\r\n\t]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, max);
}
function buildDispatchKey(input = {}) {
    const scope = safeDispatchKeyPart(input.scopeId || input.taskId || input.rootSessionScopeId || "conversation", 80);
    const source = safeDispatchKeyPart(input.sourceProject || "coordinator", 80);
    const target = safeDispatchKeyPart(input.targetName || input.project || input.agent || "unknown", 80);
    const continuation = safeDispatchKeyPart(input.continuationOf || input.continuation_of || "", 80);
    const fingerprint = safeDispatchKeyPart(input.taskFingerprint || normalizeDispatchTask(input.taskText || input.task || input.message || ""), 120);
    return [scope, source, target, continuation ? `cont:${continuation}` : fingerprint].filter(Boolean).join("|");
}
function normalizeReceiptStatus(status) {
    const value = String(status || "").trim();
    if (["done", "partial", "blocked", "failed", "needs_info"].includes(value))
        return value;
    return "missing";
}
function receiptStatusToDispatchStatus(status) {
    const normalized = normalizeReceiptStatus(status);
    if (normalized === "done")
        return "completed";
    if (normalized === "missing")
        return "missing_receipt";
    return normalized;
}
function dispatchStatusToAssignmentStatus(status) {
    const value = String(status || "").trim();
    if (value === "completed" || value === "skipped")
        return "done";
    if (["running", "done", "partial", "blocked", "failed", "needs_info"].includes(value))
        return value;
    if (value === "missing_receipt")
        return "blocked";
    return "pending";
}
function normalizeDispatchAssignment(raw = {}, context = {}) {
    const project = String(raw.project || raw.targetName || raw.agent || raw.target_project || "").trim();
    const targetName = String(raw.targetName || raw.project || raw.agent || raw.target_project || project).trim();
    const task = String(raw.task || raw.message || raw.description || raw.taskText || "").trim();
    const taskFingerprint = String(raw.taskFingerprint || raw.task_fingerprint || normalizeDispatchTask(task)).trim();
    const attempt = Number(raw.attempt || 1) || 1;
    const continuationOf = String(raw.continuationOf || raw.continuation_of || "").trim();
    const continuationStrategy = String(raw.continuationStrategy || raw.continuation_strategy || "").trim();
    const sourceProject = String(raw.sourceProject || raw.source_project || context.sourceProject || "coordinator").trim();
    const taskId = String(raw.taskId || raw.task_id || context.taskId || "").trim();
    const scopeId = String(raw.scopeId || raw.scope_id || context.scopeId || taskId || "conversation").trim();
    const dispatchKey = String(raw.dispatchKey || raw.dispatch_key || buildDispatchKey({
        scopeId,
        taskId,
        sourceProject,
        targetName,
        taskText: task,
        taskFingerprint,
        continuationOf,
    })).trim();
    const rework = !!raw.rework;
    const assignmentId = String(raw.assignmentId || raw.assignment_id || [targetName, dispatchKey, rework ? "rework" : "initial", attempt].filter(Boolean).join("::")).trim();
    const status = String(raw.status || context.defaultStatus || "pending").trim();
    return {
        ...raw,
        scopeId,
        taskId,
        sourceProject,
        targetName,
        project: project || targetName,
        task,
        taskText: task,
        taskFingerprint,
        dispatchKey,
        assignmentId,
        attempt,
        continuationOf,
        continuationStrategy,
        rework,
        reason: String(raw.reason || "").trim(),
        dependsOn: String(raw.dependsOn || raw.depends_on || "").trim(),
        status,
        statusText: String(raw.statusText || raw.status_text || context.defaultStatusText || status || "待处理").trim(),
    };
}
function normalizeDispatchBatch(items = [], context = {}) {
    const seen = new Set();
    const result = [];
    for (const item of items || []) {
        const assignment = normalizeDispatchAssignment(item, context);
        const key = assignment.dispatchKey || `${assignment.project}\n${assignment.taskFingerprint}`;
        if (!assignment.project || !assignment.task || seen.has(key))
            continue;
        seen.add(key);
        result.push(assignment);
    }
    return result;
}
function attachDispatchIdentityToMention(mention, context = {}) {
    if (!mention)
        return mention;
    const normalized = normalizeDispatchAssignment(typeof mention === "string"
        ? { mention, targetName: String(mention).replace(/^@/, "").trim(), task: "" }
        : { ...mention, project: mention.project || mention.targetName, task: mention.task || mention.message }, context);
    return {
        ...(typeof mention === "string" ? { mention } : mention),
        mention: typeof mention === "string" ? mention : (mention.mention || `@${normalized.targetName}`),
        targetName: normalized.targetName,
        message: normalized.task,
        task: normalized.task,
        taskFingerprint: normalized.taskFingerprint,
        dispatchKey: normalized.dispatchKey,
        assignmentId: normalized.assignmentId,
        attempt: normalized.attempt,
        continuationOf: normalized.continuationOf,
        continuationStrategy: normalized.continuationStrategy,
        rework: normalized.rework,
        dependsOn: normalized.dependsOn,
        reason: normalized.reason,
        sourceProject: normalized.sourceProject,
        scopeId: normalized.scopeId,
        taskId: normalized.taskId,
    };
}
function createDispatchRecord(input) {
    return {
        identity: input.identity || input.assignment,
        assignment: input.assignment,
        status: input.status || "pending",
        statusText: input.statusText || input.assignment.statusText || String(input.status || "pending"),
        receipt: input.receipt || null,
        fileChanges: input.fileChanges || null,
        workEvents: input.workEvents || [],
        outputs: input.outputs || [],
        blockers: input.blockers || [],
        needs: input.needs || [],
        startedAt: input.startedAt || "",
        finishedAt: input.finishedAt || "",
        summary: input.summary || input.receipt?.summary || "",
        resultExcerpt: input.resultExcerpt || "",
    };
}
function recordToAssignmentStatus(record) {
    return {
        project: record.assignment.project,
        assignmentId: record.identity.assignmentId,
        dispatchKey: record.identity.dispatchKey,
        status: dispatchStatusToAssignmentStatus(record.status),
        statusText: record.statusText || record.assignment.statusText,
    };
}
function recordToWorkerLedger(record) {
    const receipt = record.receipt || {};
    return {
        taskId: record.identity.taskId,
        scopeId: record.identity.scopeId,
        project: record.assignment.project,
        sourceProject: record.identity.sourceProject,
        dispatchKey: record.identity.dispatchKey,
        taskFingerprint: record.identity.taskFingerprint,
        assignmentId: record.identity.assignmentId,
        attempt: record.identity.attempt,
        continuationOf: record.identity.continuationOf,
        continuationStrategy: record.identity.continuationStrategy,
        status: record.status,
        receiptStatus: receipt.status || (record.status === "missing_receipt" ? "missing" : record.status),
        summary: record.summary || receipt.summary || record.resultExcerpt || "",
        filesChanged: receipt.filesChanged || [],
        verification: receipt.verification || [],
        blockers: record.blockers?.length ? record.blockers : (receipt.blockers || []),
        needs: record.needs?.length ? record.needs : (receipt.needs || []),
    };
}
function recordToTaskNotification(record) {
    const receipt = record.receipt || null;
    const receiptStatus = normalizeReceiptStatus(receipt?.status || (record.status === "missing_receipt" ? "missing" : record.status));
    return {
        task_id: record.assignment.project,
        status: record.status === "done" ? "completed" : record.status,
        receipt_status: receiptStatus,
        assignment_id: record.identity.assignmentId,
        dispatch_key: record.identity.dispatchKey,
        receipt_trusted: receipt?.receipt_trust?.trusted !== false,
        receipt_trust_level: receipt?.receipt_trust?.level || "trusted",
        receipt_trust_warnings: receipt?.receipt_trust?.warnings || [],
        summary: record.summary || receipt?.summary || record.resultExcerpt || "",
        result: record.outputs?.join("\n\n") || record.resultExcerpt || "",
    };
}
function recordToCollectedOutput(record, formatter) {
    const text = record.outputs?.join("\n\n") || record.resultExcerpt || record.summary || "";
    return formatter(record.assignment.project, text, record.receipt || null);
}
function recordToTimelineEvent(record, type = "child_agent_dispatch") {
    return {
        type,
        title: `${record.assignment.project} ${record.statusText || record.status}`,
        detail: record.summary || record.assignment.task,
        status: record.status === "failed" ? "fail" : record.status === "blocked" || record.status === "missing_receipt" ? "warn" : record.status === "completed" || record.status === "done" ? "ok" : "active",
        phase: record.status === "running" ? "executing" : record.status === "completed" || record.status === "done" ? "reviewing" : "dispatching",
        agent: record.assignment.project,
        data: { assignmentId: record.identity.assignmentId, dispatchKey: record.identity.dispatchKey, receipt: record.receipt || null },
    };
}
//# sourceMappingURL=dispatch-records.js.map