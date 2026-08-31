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
exports.submitGroupCoordinationRequest = submitGroupCoordinationRequest;
exports.listGroupCoordinationRequests = listGroupCoordinationRequests;
exports.claimSubmittedGroupCoordinationRequests = claimSubmittedGroupCoordinationRequests;
exports.updateGroupCoordinationRequest = updateGroupCoordinationRequest;
exports.getGroupCoordinationStoreDiagnostics = getGroupCoordinationStoreDiagnostics;
const crypto = __importStar(require("crypto"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const atomic_json_file_1 = require("../../core/atomic-json-file");
const agent_communication_v2_1 = require("../../system/agent-communication-v2");
const MAX_RECORDS = 1600;
const TERMINAL = new Set(["resumed", "failed", "timeout", "cancelled"]);
function storeFile() {
    return String(process.env.CCM_GROUP_COORDINATION_FILE || "").trim()
        || path.join(utils_1.CCM_DIR, "group-coordination-requests.json");
}
function emptyStore() {
    return { schema: "ccm-group-coordination-store-v1", version: 1, updated_at: new Date().toISOString(), requests: [] };
}
function cleanText(value, max = 2000) {
    return String(value || "").replace(/[\0\r\t]+/g, " ").trim().slice(0, max);
}
function cleanList(value, maxItems = 30, maxText = 500) {
    const rows = Array.isArray(value) ? value : value ? [value] : [];
    return Array.from(new Set(rows.map(item => cleanText(item, maxText)).filter(Boolean))).slice(0, maxItems);
}
function normalizeContext(context) {
    return {
        groupId: cleanText(context?.groupId, 160),
        taskId: cleanText(context?.taskId, 160),
        groupSessionId: cleanText(context?.groupSessionId, 160),
        sourceProject: cleanText(context?.sourceProject, 160),
        sourceAgentType: cleanText(context?.sourceAgentType, 80),
        sourceTaskAgentSessionId: cleanText(context?.sourceTaskAgentSessionId, 200),
        sourceNativeSessionId: cleanText(context?.sourceNativeSessionId, 240),
        sourceWorkDir: cleanText(context?.sourceWorkDir, 1200),
    };
}
function assertContext(context) {
    if (!context.groupId || !context.taskId || !context.sourceProject) {
        throw new Error("协调请求缺少 groupId、taskId 或 sourceProject，已拒绝写入");
    }
}
function loadStore(file = storeFile()) {
    const parsed = (0, atomic_json_file_1.readJsonWithBackup)(file, emptyStore());
    if (parsed?.schema !== "ccm-group-coordination-store-v1" || !Array.isArray(parsed.requests))
        return emptyStore();
    return parsed;
}
function mutateStore(operation) {
    const file = storeFile();
    return (0, atomic_json_file_1.withFileLock)(file, () => {
        const store = loadStore(file);
        const result = operation(store);
        store.requests = store.requests.slice(-MAX_RECORDS);
        store.updated_at = new Date().toISOString();
        (0, atomic_json_file_1.writeJsonAtomic)(file, store);
        return result;
    });
}
function matchesContext(row, context) {
    return row.group_id === context.groupId
        && row.task_id === context.taskId
        && (!context.groupSessionId || row.group_session_id === context.groupSessionId)
        && row.source_project === context.sourceProject
        && (!context.sourceTaskAgentSessionId || row.source_task_agent_session_id === context.sourceTaskAgentSessionId);
}
function submitGroupCoordinationRequest(contextInput, input) {
    const context = normalizeContext(contextInput);
    assertContext(context);
    const kind = (["information", "implementation", "review", "risk"].includes(String(input?.kind || ""))
        ? input.kind
        : "information");
    const summary = cleanText(input?.summary || input?.question, 1000);
    const question = cleanText(input?.question || input?.summary, 3000);
    if (!summary || summary.length < 4)
        throw new Error("协调请求需要清晰的 summary 或 question");
    const idempotencyKey = cleanText(input?.idempotencyKey, 300) || crypto.createHash("sha256").update(JSON.stringify({
        group: context.groupId,
        task: context.taskId,
        source: context.sourceProject,
        session: context.sourceTaskAgentSessionId,
        kind,
        summary,
        question,
    })).digest("hex");
    const submitted = mutateStore(store => {
        const existing = [...store.requests].reverse().find(row => matchesContext(row, context)
            && row.idempotency_key === idempotencyKey
            && !TERMINAL.has(row.status));
        if (existing)
            return { record: existing, deduplicated: true };
        const now = new Date().toISOString();
        const record = {
            schema: "ccm-group-coordination-request-v1",
            id: `gcr_${Date.now().toString(36)}_${crypto.randomBytes(5).toString("hex")}`,
            status: "submitted",
            kind,
            group_id: context.groupId,
            task_id: context.taskId,
            group_session_id: context.groupSessionId,
            source_project: context.sourceProject,
            source_agent_type: context.sourceAgentType,
            source_task_agent_session_id: context.sourceTaskAgentSessionId,
            source_native_session_id: context.sourceNativeSessionId,
            source_work_dir: context.sourceWorkDir,
            summary,
            question,
            reason: cleanText(input?.reason, 1600),
            blocking: input?.blocking !== false,
            required_capabilities: cleanList(input?.requiredCapabilities, 20, 120),
            target_hint: cleanText(input?.targetHint, 160),
            evidence: cleanList(input?.evidence, 30, 1000),
            acceptance_criteria: cleanList(input?.acceptanceCriteria, 30, 1000),
            requested_write_paths: cleanList(input?.requestedWritePaths, 40, 1000),
            idempotency_key: idempotencyKey,
            coordinator_claim_id: "",
            work_item_task_id: "",
            resolution: null,
            metadata: input?.metadata && typeof input.metadata === "object" ? input.metadata : null,
            audit: [{ at: now, type: "submitted_via_mcp", detail: "子 Agent 已向群聊主 Agent 提交协调请求" }],
            created_at: now,
            updated_at: now,
        };
        store.requests.push(record);
        return { record, deduplicated: false };
    });
    if ((0, agent_communication_v2_1.readAgentCommunicationPolicy)().agentCommunicationV2Enabled) {
        try {
            const communication = (0, agent_communication_v2_1.createAgentCommunicationEnvelope)({
                taskId: context.taskId,
                workItemId: submitted.record.id,
                scope: "group",
                scopeId: context.groupId,
                exactSessionId: context.groupSessionId,
                generation: Math.max(0, Number(input.metadata?.generation || 0)),
                attempt: Math.max(1, Number(input.metadata?.attempt || 1)),
                senderAgentId: context.sourceProject,
                receiverAgentId: "ccm-group-main-agent",
                messageType: "coordination_request",
                correlationId: String(input.metadata?.correlation_id || submitted.record.id),
                parentMessageId: String(input.metadata?.communication_message_id || ""),
                idempotencyKey: `coordination-v2:${submitted.record.id}`,
                initialState: "waiting_dependency",
                payload: {
                    kind,
                    summary,
                    requiredCapabilities: input.requiredCapabilities,
                    targetHint: input.targetHint,
                    acceptanceCriteria: input.acceptanceCriteria,
                    requestedWritePaths: input.requestedWritePaths,
                    legacyRequestId: submitted.record.id,
                },
            });
            if (submitted.record.metadata?.communication_message_id !== communication.envelope.messageId) {
                submitted.record = updateGroupCoordinationRequest(submitted.record.id, {
                    metadata: { ...(submitted.record.metadata || {}), communication_message_id: communication.envelope.messageId },
                    auditType: communication.deduplicated ? "communication_v2_reused" : "communication_v2_created",
                    auditDetail: "协调请求已进入Agent Communication V2账本",
                }) || submitted.record;
            }
            return { ...submitted, communication: communication.envelope };
        }
        catch (error) {
            submitted.record = updateGroupCoordinationRequest(submitted.record.id, {
                auditType: "communication_v2_retryable",
                auditDetail: `V2通信账本写入待重试：${String(error?.message || error).slice(0, 300)}`,
            }) || submitted.record;
        }
    }
    return submitted;
}
function listGroupCoordinationRequests(query = {}) {
    const context = normalizeContext(query);
    const statuses = new Set(query.statuses || []);
    return loadStore().requests.filter(row => {
        if (context.groupId && row.group_id !== context.groupId)
            return false;
        if (context.taskId && row.task_id !== context.taskId)
            return false;
        if (context.groupSessionId && row.group_session_id !== context.groupSessionId)
            return false;
        if (context.sourceProject && row.source_project !== context.sourceProject)
            return false;
        if (context.sourceTaskAgentSessionId && row.source_task_agent_session_id !== context.sourceTaskAgentSessionId)
            return false;
        return !statuses.size || statuses.has(row.status);
    });
}
function claimSubmittedGroupCoordinationRequests(contextInput, claimId) {
    const context = normalizeContext(contextInput);
    assertContext(context);
    const safeClaimId = cleanText(claimId, 240);
    if (!safeClaimId)
        throw new Error("主 Agent claimId 不能为空");
    return mutateStore(store => {
        const claimed = [];
        for (const row of store.requests) {
            const staleTriage = row.status === "triaged" && Date.now() - Date.parse(row.updated_at || row.created_at || "") >= 2 * 60 * 1000;
            if (!matchesContext(row, context) || (row.status !== "submitted" && !staleTriage))
                continue;
            const at = new Date().toISOString();
            row.status = "triaged";
            row.coordinator_claim_id = safeClaimId;
            row.updated_at = at;
            row.audit = [...row.audit, { at, type: staleTriage ? "reclaimed_after_restart" : "claimed_by_group_main_agent", detail: staleTriage ? "检测到中断的仲裁，群聊主 Agent 已重新接管" : "群聊主 Agent 已接管并开始判断" }].slice(-60);
            claimed.push(row);
        }
        return claimed;
    });
}
function updateGroupCoordinationRequest(id, patch) {
    const safeId = cleanText(id, 240);
    const updated = mutateStore(store => {
        const row = store.requests.find(item => item.id === safeId);
        if (!row)
            return null;
        const at = new Date().toISOString();
        const { auditType, auditDetail, ...updates } = patch;
        Object.assign(row, updates, { id: row.id, schema: row.schema, updated_at: at });
        if (auditType || auditDetail) {
            row.audit = [...row.audit, { at, type: cleanText(auditType || "updated", 120), detail: cleanText(auditDetail || "协调请求已更新", 1000) }].slice(-60);
        }
        return row;
    });
    if (updated?.status === "merge_conflict") {
        try {
            (0, agent_communication_v2_1.recordAgentCommunicationAuditEvent)(String(updated.metadata?.communication_message_id || ""), "worktree_merge_conflict", {
                requestId: updated.id,
                workItemTaskId: updated.work_item_task_id,
            });
        }
        catch { }
    }
    if (updated && (0, agent_communication_v2_1.readAgentCommunicationPolicy)().agentCommunicationV2Enabled
        && ["resolved", "resumed", "failed", "timeout", "cancelled"].includes(updated.status)
        && updated.group_session_id) {
        try {
            (0, agent_communication_v2_1.createAgentCommunicationEnvelope)({
                taskId: updated.task_id,
                workItemId: updated.id,
                scope: "group",
                scopeId: updated.group_id,
                exactSessionId: updated.group_session_id,
                generation: Math.max(0, Number(updated.metadata?.generation || 0)),
                attempt: Math.max(1, Number(updated.metadata?.attempt || 1)),
                senderAgentId: "ccm-group-main-agent",
                receiverAgentId: updated.source_project,
                messageType: "coordination_resolution",
                correlationId: updated.id,
                parentMessageId: String(updated.metadata?.communication_message_id || ""),
                idempotencyKey: `coordination-resolution-v2:${updated.id}`,
                initialState: "completed",
                payload: {
                    requestId: updated.id,
                    status: updated.status,
                    kind: updated.kind,
                    workItemTaskId: updated.work_item_task_id,
                    routeChecksum: updated.route_checksum,
                    resolutionChecksum: crypto.createHash("sha256").update(JSON.stringify(updated.resolution || {})).digest("hex"),
                    sourceSessionId: updated.source_task_agent_session_id,
                },
            });
            const requestMessageId = String(updated.metadata?.communication_message_id || "");
            let requestMessage = requestMessageId
                ? (0, agent_communication_v2_1.getAgentCommunication)(requestMessageId, { includeEvents: false, includeReceipts: false })
                : null;
            if (requestMessage && !["completed", "cancelled", "failed"].includes(requestMessage.state)) {
                if (["failed", "timeout"].includes(updated.status)) {
                    (0, agent_communication_v2_1.transitionAgentCommunication)(requestMessageId, "failed", { eventType: "coordination_failed", detail: { requestId: updated.id, status: updated.status } });
                }
                else if (updated.status === "cancelled") {
                    if (requestMessage.state !== "cancel_requested")
                        (0, agent_communication_v2_1.transitionAgentCommunication)(requestMessageId, "cancel_requested", { eventType: "coordination_cancel_requested", detail: { requestId: updated.id } });
                    (0, agent_communication_v2_1.transitionAgentCommunication)(requestMessageId, "cancelled", { eventType: "coordination_cancelled", detail: { requestId: updated.id } });
                }
                else if (requestMessage.state === "waiting_dependency") {
                    requestMessage = (0, agent_communication_v2_1.transitionAgentCommunication)(requestMessageId, "result_submitted", { eventType: "coordination_result_submitted", detail: { requestId: updated.id } }).envelope;
                    requestMessage = (0, agent_communication_v2_1.transitionAgentCommunication)(requestMessageId, "verifying", { eventType: "coordination_resolution_verified", detail: { requestId: updated.id } }).envelope;
                    requestMessage = (0, agent_communication_v2_1.transitionAgentCommunication)(requestMessageId, "accepted", { eventType: "coordination_resolution_accepted", detail: { requestId: updated.id } }).envelope;
                    (0, agent_communication_v2_1.transitionAgentCommunication)(requestMessageId, "completed", { eventType: "coordination_completed", detail: { requestId: updated.id } });
                }
            }
        }
        catch {
            // The v1 coordination record remains authoritative and the idempotent V2
            // resolution can be reconciled on the next status update or restart.
        }
    }
    return updated;
}
function getGroupCoordinationStoreDiagnostics() {
    const rows = loadStore().requests;
    return {
        schema: "ccm-group-coordination-store-diagnostics-v1",
        file: storeFile(),
        total: rows.length,
        open: rows.filter(row => !TERMINAL.has(row.status)).length,
        by_status: Object.fromEntries(Array.from(new Set(rows.map(row => row.status))).map(status => [status, rows.filter(row => row.status === status).length])),
    };
}
//# sourceMappingURL=group-coordination-store.js.map