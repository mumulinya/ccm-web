"use strict";
// Behavior-freeze split from group-memory-shared.ts (part 2/2).
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
exports.TYPED_MEMORY_DELIVERY_HARD_MAX_SESSION_BYTES = exports.TYPED_MEMORY_DELIVERY_HARD_MAX_LINES_PER_DOCUMENT = exports.TYPED_MEMORY_DELIVERY_HARD_MAX_BYTES_PER_DOCUMENT = exports.TYPED_MEMORY_DELIVERY_HARD_MAX_DOCUMENTS = exports.POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_REL_PATH = exports.POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_REPAIR_CLOSURE_REL_PATH = exports.POST_COMPACT_RECEIPT_MEMORY_USAGE_REPAIR_COMPLETION_REL_PATH = exports.POST_COMPACT_REINJECTION_REPAIR_RECEIPT_CAUTION_REL_PATH = exports.POST_COMPACT_REINJECTION_REPAIR_RECEIPT_MEMORY_REL_PATH = exports.PROVIDER_RANKING_MEMORY_USAGE_RECEIPT_DISCIPLINE_REL_PATH = exports.PROVIDER_RANKING_PROVENANCE_COMPACT_REPAIR_RECEIPT_MEMORY_REL_PATH = exports.markGroupMemoryAutoCompactHookRegistered = exports.isGroupMemoryAutoCompactHookRegistered = exports.groupMemoryAutoCompactHookRegistered = exports.groupMemoryAutoCompactPending = exports.groupMemoryAutoCompactRunning = exports.groupMemoryAutoCompactTimers = exports.GROUP_MEMORY_AUTO_COMPACT_DEBOUNCE_MS = void 0;
exports.resolvePostCompactBoundaryMarkerParts = resolvePostCompactBoundaryMarkerParts;
exports.loadGroupMemoryCompactionConfig = loadGroupMemoryCompactionConfig;
exports.isGroupModelCompactionEnabled = isGroupModelCompactionEnabled;
exports.buildBackgroundCompactionState = buildBackgroundCompactionState;
exports.uniqueProviderRankingCompactRepairRecallStrings = uniqueProviderRankingCompactRepairRecallStrings;
exports.isProviderRankingProvenanceCompactRepairReceiptRecallQuery = isProviderRankingProvenanceCompactRepairReceiptRecallQuery;
exports.isPostCompactReceiptMemoryUsageRepairCompletionRecallQuery = isPostCompactReceiptMemoryUsageRepairCompletionRecallQuery;
exports.isPostCompactCompletionMemoryPreservationRepairClosureRecallQuery = isPostCompactCompletionMemoryPreservationRepairClosureRecallQuery;
exports.findMemoryArtifactBySchema = findMemoryArtifactBySchema;
exports.runnerRequestHasDurableReturnEvidence = runnerRequestHasDurableReturnEvidence;
exports.tokenizeGlobalGroupMemoryQuery = tokenizeGlobalGroupMemoryQuery;
exports.globalGroupMemoryCorpus = globalGroupMemoryCorpus;
exports.scoreGlobalGroupMemoryCandidate = scoreGlobalGroupMemoryCandidate;
exports.latestGroupMessageTimestamp = latestGroupMessageTimestamp;
exports.normalizeGlobalGroupMemoryMembers = normalizeGlobalGroupMemoryMembers;
exports.importGroupProjectMemoriesForMembers = importGroupProjectMemoriesForMembers;
exports.getGroupMessageMemoryWho = getGroupMessageMemoryWho;
exports.buildGroupMessageMemoryLine = buildGroupMessageMemoryLine;
exports.buildCompressedGroupMessageDigest = buildCompressedGroupMessageDigest;
exports.normalizeMemoryStringArray = normalizeMemoryStringArray;
exports.normalizeWorkerLedgerItem = normalizeWorkerLedgerItem;
exports.findLatestWorkerLedger = findLatestWorkerLedger;
exports.appendWorkerLedger = appendWorkerLedger;
exports.updateGroupMemory = updateGroupMemory;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const utils_1 = require("../../core/utils");
const group_memory_index_1 = require("./group-memory-index");
const storage_1 = require("./storage");
const execution_kernel_1 = require("../../agents/execution-kernel");
const direct_dispatch_spool_1 = require("../../agents/direct-dispatch-spool");
const group_agent_memory_packet_1 = require("./group-agent-memory-packet");
const group_memory_storage_1 = require("./group-memory-storage");
const group_memory_shared_part_01_1 = require("./group-memory-shared-part-01");
function resolvePostCompactBoundaryMarkerParts(groupId, input = {}) {
    const compaction = input.compaction || {};
    const boundary = input.compactBoundary || input.compact_boundary || compaction.boundary || {};
    const gate = input.postCompactReinjectionGate || input.post_compact_reinjection_gate || {};
    const recoveryAudit = input.postCompactRecoveryAudit
        || input.post_compact_recovery_audit
        || gate.post_compact_recovery_audit
        || gate.postCompactRecoveryAudit
        || {};
    const rawBoundaryId = String(input.rawBoundaryId
        || input.raw_boundary_id
        || boundary.id
        || recoveryAudit.boundaryId
        || recoveryAudit.boundary_id
        || "");
    const summarizedThroughMessageId = String(input.lastCompactedMessageId
        || input.last_compacted_message_id
        || compaction.lastCompactedMessageId
        || compaction.last_compacted_message_id
        || boundary.summarizedThroughMessageId
        || boundary.summarized_through_message_id
        || "");
    const summaryChecksum = String(input.summaryChecksum
        || input.summary_checksum
        || compaction.summaryChecksum
        || compaction.summary_checksum
        || boundary.summaryChecksum
        || boundary.summary_checksum
        || recoveryAudit.summaryChecksum
        || recoveryAudit.summary_checksum
        || gate.summary_checksum
        || "");
    const compactedMessageCount = Number(input.compactedMessageCount
        || input.compacted_message_count
        || compaction.compactedMessageCount
        || compaction.compacted_message_count
        || boundary.summarizedMessageCount
        || boundary.summarized_message_count
        || 0);
    const hasPostCompactBoundary = !!(rawBoundaryId || summarizedThroughMessageId || summaryChecksum)
        && (compactedMessageCount > 0 || !!gate?.schema || !!compaction.postCompactReinject || !!compaction.post_compact_reinject);
    if (!hasPostCompactBoundary)
        return null;
    const boundaryId = `pcb_${crypto.createHash("sha256").update(JSON.stringify([
        groupId,
        summarizedThroughMessageId,
        summaryChecksum,
        rawBoundaryId && !summarizedThroughMessageId ? rawBoundaryId : "",
    ])).digest("hex").slice(0, 18)}`;
    return {
        boundaryId,
        rawBoundaryId,
        summarizedThroughMessageId,
        summaryChecksum,
        compactedMessageCount,
    };
}
exports.GROUP_MEMORY_AUTO_COMPACT_DEBOUNCE_MS = Math.max(250, Number(process.env.CCM_GROUP_MEMORY_AUTO_COMPACT_DEBOUNCE_MS || 2500));
exports.groupMemoryAutoCompactTimers = new Map();
exports.groupMemoryAutoCompactRunning = new Set();
exports.groupMemoryAutoCompactPending = new Set();
var group_memory_auto_compact_hook_state_1 = require("./group-memory-auto-compact-hook-state");
Object.defineProperty(exports, "groupMemoryAutoCompactHookRegistered", { enumerable: true, get: function () { return group_memory_auto_compact_hook_state_1.groupMemoryAutoCompactHookRegistered; } });
Object.defineProperty(exports, "isGroupMemoryAutoCompactHookRegistered", { enumerable: true, get: function () { return group_memory_auto_compact_hook_state_1.isGroupMemoryAutoCompactHookRegistered; } });
Object.defineProperty(exports, "markGroupMemoryAutoCompactHookRegistered", { enumerable: true, get: function () { return group_memory_auto_compact_hook_state_1.markGroupMemoryAutoCompactHookRegistered; } });
function loadGroupMemoryCompactionConfig(overrides = {}) {
    let config = {};
    try {
        const mod = require("./group-orchestrator");
        if (typeof mod.loadOrchestratorConfig === "function")
            config = mod.loadOrchestratorConfig();
    }
    catch { }
    return { ...(config || {}), ...(overrides || {}) };
}
function isGroupModelCompactionEnabled(config) {
    return config?.memoryCompactionUseModel === true
        || ["hybrid", "model-required"].includes(String(config?.memoryCompactionMode || "").toLowerCase());
}
function buildBackgroundCompactionState(input = {}) {
    return {
        status: String(input.status || "unknown"),
        reason: String(input.reason || ""),
        messageId: String(input.messageId || ""),
        compacted: input.compacted === true,
        modelCompactionEnabled: input.modelCompactionEnabled === true,
        rebuild: input.rebuild === true,
        force: input.force === true,
        boundaryId: String(input.boundaryId || ""),
        summarizedThroughMessageId: String(input.summarizedThroughMessageId || ""),
        keepIndex: Number(input.keepIndex || 0),
        messageCount: Number(input.messageCount || 0),
        typedMemoryScopeId: String(input.typedMemoryScopeId || input.typed_memory_scope_id || ""),
        error: (0, group_memory_shared_part_01_1.compactMemoryText)(input.error || "", 500),
        startedAt: String(input.startedAt || ""),
        completedAt: String(input.completedAt || new Date().toISOString()),
    };
}
// Defer until the current require graph finishes so context ↔ shared cycles don't see incomplete exports.
setImmediate(() => {
    try {
        const { ensureGroupMemoryAutoCompactionHook } = require("./group-memory-context");
        if (typeof ensureGroupMemoryAutoCompactionHook !== "function") {
            console.warn("[group-memory] ensureGroupMemoryAutoCompactionHook unavailable during module init");
            return;
        }
        const result = ensureGroupMemoryAutoCompactionHook();
        if (!result || result.registered !== true) {
            console.warn("[group-memory] auto-compact hook registration returned unexpected result", result);
        }
    }
    catch (err) {
        console.warn("[group-memory] auto-compact hook registration failed:", err?.message || String(err || "unknown error"));
    }
});
exports.PROVIDER_RANKING_PROVENANCE_COMPACT_REPAIR_RECEIPT_MEMORY_REL_PATH = "provider-ranking-provenance-compact-repair-receipt-memory.md";
exports.PROVIDER_RANKING_MEMORY_USAGE_RECEIPT_DISCIPLINE_REL_PATH = "provider-ranking-memory-usage-receipt-discipline.md";
exports.POST_COMPACT_REINJECTION_REPAIR_RECEIPT_MEMORY_REL_PATH = "post-compact-reinjection-repair-receipt-memory.md";
exports.POST_COMPACT_REINJECTION_REPAIR_RECEIPT_CAUTION_REL_PATH = "post-compact-reinjection-repair-receipt-cautions.md";
exports.POST_COMPACT_RECEIPT_MEMORY_USAGE_REPAIR_COMPLETION_REL_PATH = "post-compact-receipt-memory-usage-repair-completions.md";
exports.POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_REPAIR_CLOSURE_REL_PATH = "post-compact-completion-memory-preservation-repair-closures.md";
exports.POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_REL_PATH = "post-compact-completion-memory-preservation-closure-conflict-resolutions.md";
function uniqueProviderRankingCompactRepairRecallStrings(values = [], limit = 40) {
    const seen = new Set();
    const result = [];
    for (const raw of values.flatMap((value) => Array.isArray(value) ? value : [value])) {
        const value = String(raw || "").trim();
        const key = value.toLowerCase();
        if (!value || seen.has(key))
            continue;
        seen.add(key);
        result.push(value);
        if (result.length >= limit)
            break;
    }
    return result;
}
function isProviderRankingProvenanceCompactRepairReceiptRecallQuery(value) {
    const text = String(value || "").toLowerCase();
    return /provider[-_\s]?ranking|provider switch|provider-switch|provider_switch|provenance|compact repair|compact[-_\s]?repair|replayrepairdispatchbriefusage|replay repair dispatch|ranking evidence|fresh valid provider switch|供应商|提供商|排序|来源|压缩.*修复|修复.*压缩/.test(text);
}
function isPostCompactReceiptMemoryUsageRepairCompletionRecallQuery(value, rows = []) {
    const text = String(value || "").toLowerCase();
    if (/corrected[-_\s]?receipt|receipt[-_\s]?memory[-_\s]?usage|memoryused|memoryignored|current source|recovery evidence|回执修复|记忆使用|当前源|恢复证据/.test(text)) {
        return true;
    }
    return rows.some((row) => [
        row.work_item_id,
        row.brief_id,
        row.timeline_binding_id,
        row.original_worker_context_packet_id,
        ...(Array.isArray(row.required_doc_rel_paths) ? row.required_doc_rel_paths : []),
    ].some((token) => {
        const normalized = String(token || "").trim().toLowerCase();
        return normalized.length >= 4 && text.includes(normalized);
    }));
}
function isPostCompactCompletionMemoryPreservationRepairClosureRecallQuery(value, rows = []) {
    const text = String(value || "").toLowerCase();
    if (/completion[-_\s]?memory|compact[-_\s]?preservation|corrected[-_\s]?(retry|outcome)|exact identity|authority boundary|压缩.*保全|保全.*修复|纠正.*结果|会话权限/.test(text)) {
        return true;
    }
    return rows.some((row) => [
        row.work_item_id,
        row.failed_retry_id,
        row.failed_outcome_id,
        row.corrected_retry_id,
        row.corrected_outcome_id,
        ...(Array.isArray(row.completion_doc_rel_paths) ? row.completion_doc_rel_paths : []),
        ...(Array.isArray(row.completion_work_item_ids) ? row.completion_work_item_ids : []),
        ...(Array.isArray(row.completion_timeline_binding_ids) ? row.completion_timeline_binding_ids : []),
    ].some((token) => {
        const normalized = String(token || "").trim().toLowerCase();
        return normalized.length >= 4 && text.includes(normalized);
    }));
}
exports.TYPED_MEMORY_DELIVERY_HARD_MAX_DOCUMENTS = 5;
exports.TYPED_MEMORY_DELIVERY_HARD_MAX_BYTES_PER_DOCUMENT = 4096;
exports.TYPED_MEMORY_DELIVERY_HARD_MAX_LINES_PER_DOCUMENT = 200;
exports.TYPED_MEMORY_DELIVERY_HARD_MAX_SESSION_BYTES = 60 * 1024;
function findMemoryArtifactBySchema(value, schema, seen = new Set()) {
    if (!value || typeof value !== "object" || seen.has(value))
        return null;
    seen.add(value);
    if (value.schema === schema)
        return value;
    for (const nested of Array.isArray(value) ? value : Object.values(value)) {
        const found = findMemoryArtifactBySchema(nested, schema, seen);
        if (found)
            return found;
    }
    return null;
}
function runnerRequestHasDurableReturnEvidence(record) {
    const runnerRequestId = String(record.runner_request_id || "");
    if (!runnerRequestId)
        return true;
    const requestFile = path.join(utils_1.CCM_DIR, "agent-runner", "requests", `${runnerRequestId}.json`);
    const resultFile = path.join(utils_1.CCM_DIR, "agent-runner", "results", `${runnerRequestId}.json`);
    if (!fs.existsSync(requestFile) || !fs.existsSync(resultFile))
        return false;
    try {
        const request = JSON.parse(fs.readFileSync(requestFile, "utf-8"));
        const result = JSON.parse(fs.readFileSync(resultFile, "utf-8"));
        if (String(request.id || "") !== runnerRequestId || String(result.id || "") !== runnerRequestId)
            return false;
        if (request.schema === direct_dispatch_spool_1.DIRECT_AGENT_DISPATCH_REQUEST_SCHEMA && (0, direct_dispatch_spool_1.validateDirectAgentDispatchPair)(request, result).valid !== true)
            return false;
        if (String(request.taskAgentSessionId || "") !== String(record.task_agent_session_id || ""))
            return false;
        if (String(request.groupId || "") !== String(record.group_id || ""))
            return false;
        const execution = record.execution_id ? (0, execution_kernel_1.loadExecution)(String(record.execution_id)) : null;
        return !execution || (execution.externalRunnerRequestIds || []).includes(runnerRequestId);
    }
    catch {
        return false;
    }
}
function tokenizeGlobalGroupMemoryQuery(value) {
    const text = String(value || "").toLowerCase();
    const tokens = new Set();
    for (const match of text.matchAll(/[a-z0-9_./\\:-]{3,}/g))
        tokens.add(match[0]);
    const chinese = text.replace(/[^\u3400-\u9fff]/g, "");
    for (let index = 0; index < chinese.length - 1; index += 1)
        tokens.add(chinese.slice(index, index + 2));
    return [...tokens].slice(0, 120);
}
function globalGroupMemoryCorpus(group, memory) {
    const members = (group?.members || []).map((member) => [member.project, member.agent, member.platform].filter(Boolean).join(":")).join(" ");
    const listText = (items = [], mapper = (item) => JSON.stringify(item)) => (items || []).slice(-12).map(mapper).join("\n");
    return [
        group?.id,
        group?.name,
        members,
        memory?.goal,
        memory?.currentPhase,
        memory?.summary,
        memory?.messageDigest,
        listText(memory?.persistentRequirements || [], (item) => item.text || item),
        listText(memory?.factAnchors || [], (item) => item.text || item),
        listText(memory?.decisions || [], (item) => item.decision || item),
        listText(memory?.completed || [], (item) => `${item.project || ""} ${item.summary || ""}`),
        listText(memory?.blocked || [], (item) => `${item.project || ""} ${item.reason || ""}`),
        listText(memory?.nextActions || [], (item) => item.action || item),
    ].filter(Boolean).join("\n").toLowerCase();
}
function scoreGlobalGroupMemoryCandidate(group, memory, messages, query = "") {
    const queryTokens = tokenizeGlobalGroupMemoryQuery(query);
    let score = 0;
    const corpus = globalGroupMemoryCorpus(group, memory);
    if (!queryTokens.length)
        score += 1;
    for (const token of queryTokens) {
        if (!token)
            continue;
        if (corpus.includes(token))
            score += token.length >= 5 ? 3 : 1;
    }
    if (String(group?.id || "").toLowerCase() && String(query || "").toLowerCase().includes(String(group.id).toLowerCase()))
        score += 8;
    if (String(group?.name || "").toLowerCase() && String(query || "").toLowerCase().includes(String(group.name).toLowerCase()))
        score += 8;
    if ((memory?.blocked || []).length)
        score += 2;
    if ((memory?.nextActions || []).length)
        score += 2;
    if ((memory?.persistentRequirements || []).length)
        score += 2;
    if ((memory?.completed || []).length)
        score += 1;
    if ((messages || []).length)
        score += 1;
    return score;
}
function latestGroupMessageTimestamp(messages = []) {
    for (const message of [...(messages || [])].reverse()) {
        const value = String(message?.timestamp || message?.time || message?.created_at || "");
        const parsed = Date.parse(value);
        if (Number.isFinite(parsed))
            return value;
    }
    return "";
}
function normalizeGlobalGroupMemoryMembers(group) {
    return (group?.members || []).slice(0, 12).map((member) => ({
        project: member.project,
        agent: member.agent,
        platform: member.platform || "",
    }));
}
function importGroupProjectMemoriesForMembers(groupId, group, options = {}) {
    const rootsByProject = options.projectRoots || options.project_roots || {};
    const imports = [];
    const seen = new Set();
    for (const member of (group?.members || []).slice(0, Number(options.maxProjectMemoryImportMembers || options.max_project_memory_import_members || 6))) {
        const project = (0, group_memory_shared_part_01_1.normalizeAgentMemoryProject)(member?.project || "");
        if (!project || project === "coordinator" || project === "unknown")
            continue;
        const explicit = member?.projectRoot || member?.project_root || member?.workDir || member?.work_dir || rootsByProject[project];
        const root = explicit ? path.resolve(String(explicit)) : (0, group_memory_shared_part_01_1.resolveGroupProjectMemoryRoot)(project, {});
        if (!root || seen.has(root.toLowerCase()))
            continue;
        seen.add(root.toLowerCase());
        imports.push((0, group_memory_index_1.importProjectMemoryFilesToGroupTypedMemory)(groupId, root, {
            project,
            settingSources: options.settingSources ?? options.setting_sources,
            includeProject: options.includeProjectMemory !== false && options.include_project_memory !== false,
            includeLocal: options.includeLocalProjectMemory !== false && options.include_local_project_memory !== false,
            maxParentDepth: options.projectMemoryMaxParentDepth || options.project_memory_max_parent_depth || 0,
            maxRuleFiles: options.projectMemoryMaxRuleFiles || options.project_memory_max_rule_files,
            maxImportFiles: options.projectMemoryMaxImportFiles || options.project_memory_max_import_files,
        }));
    }
    return imports;
}
function getGroupMessageMemoryWho(message) {
    if (message?.role === "user")
        return `[用户 -> ${message.target || "all"}]`;
    if (message?.role === "thinking")
        return "[系统思考]";
    return `[${message?.agent || "Agent"}]`;
}
function buildGroupMessageMemoryLine(message, max = 260) {
    const time = message?.timestamp ? String(message.timestamp).slice(0, 19).replace("T", " ") : "unknown-time";
    const id = message?.id ? `#${message.id}` : "#local";
    const who = getGroupMessageMemoryWho(message);
    const content = (0, group_memory_shared_part_01_1.compactMemoryText)(message?.content || message?.delivery_summary?.headline || "", max);
    const extras = [];
    if (Array.isArray(message?.assignments) && message.assignments.length) {
        extras.push(`派发:${message.assignments.slice(0, 4).map((item) => `${item.project || item.target || "unknown"}:${item.status || "pending"}`).join(",")}`);
    }
    if (message?.fileChanges?.count)
        extras.push(`文件变更:${message.fileChanges.count}`);
    if (message?.delivery_summary?.headline)
        extras.push(`交付:${(0, group_memory_shared_part_01_1.compactMemoryText)(message.delivery_summary.headline, 120)}`);
    return `- ${time} ${id} ${who} ${content}${extras.length ? `（${extras.join("；")}）` : ""}`;
}
function buildCompressedGroupMessageDigest(messages, limit = 30) {
    const source = (messages || []).filter((message) => !String(message?.content || "").startsWith("📤"));
    if (!source.length)
        return "";
    const omitted = Math.max(0, source.length - limit);
    const lines = source.slice(-limit).map((message) => buildGroupMessageMemoryLine(message, 220));
    if (omitted > 0)
        lines.unshift(`- 更早 ${omitted} 条旧消息已进一步折叠，仅保留在原始群聊记录中，可按 message id 回溯。`);
    return lines.join("\n");
}
function normalizeMemoryStringArray(value) {
    if (!Array.isArray(value))
        return [];
    return value.map((item) => String(item || "").trim()).filter(Boolean);
}
function normalizeWorkerLedgerItem(item = {}) {
    return {
        time: item.time || new Date().toISOString(),
        taskId: String(item.taskId || item.task_id || "").trim(),
        project: String(item.project || item.agent || "").trim(),
        status: String(item.status || "").trim(),
        receiptStatus: String(item.receiptStatus || item.receipt_status || "").trim(),
        summary: (0, group_memory_shared_part_01_1.compactMemoryText)(item.summary || "", 320),
        filesChanged: Array.isArray(item.filesChanged || item.files_changed) ? (item.filesChanged || item.files_changed).slice(0, 12) : [],
        verification: Array.isArray(item.verification) ? item.verification.slice(0, 12) : [],
        blockers: Array.isArray(item.blockers) ? item.blockers.slice(0, 12) : [],
        needs: Array.isArray(item.needs) ? item.needs.slice(0, 12) : [],
        memoryUsed: normalizeMemoryStringArray(item.memoryUsed || item.memory_used).slice(0, 12),
        memoryIgnored: normalizeMemoryStringArray(item.memoryIgnored || item.memory_ignored).slice(0, 12),
    };
}
function findLatestWorkerLedger(memory, project) {
    const target = String(project || "").trim();
    if (!target)
        return null;
    return [...(memory?.workerLedger || [])].reverse().find((item) => item.project === target) || null;
}
function appendWorkerLedger(memory, item) {
    const normalized = normalizeWorkerLedgerItem(item);
    if (!normalized.project && !normalized.summary)
        return memory;
    return {
        ...(memory || {}),
        workerLedger: (0, group_memory_shared_part_01_1.uniqueByKey)([...(memory?.workerLedger || []), normalized], (x) => [
            x.taskId || "",
            x.project || "",
            x.status || "",
            x.summary || "",
        ].join("|"), 40),
    };
}
function updateGroupMemory(groupId, patch = {}) {
    const sessionId = String(patch.groupSessionId || patch.group_session_id || (0, storage_1.getActiveGroupChatSessionId)(groupId));
    const memory = (0, group_memory_storage_1.loadGroupMemory)(groupId, sessionId);
    const next = { ...memory };
    if (patch.goal && !next.goal)
        next.goal = (0, group_memory_shared_part_01_1.compactMemoryText)(patch.goal, 500);
    if (patch.currentPhase)
        next.currentPhase = patch.currentPhase;
    if (patch.decision) {
        next.decisions = (0, group_memory_shared_part_01_1.uniqueByKey)([...(next.decisions || []), {
                time: new Date().toISOString(),
                decision: (0, group_memory_shared_part_01_1.compactMemoryText)(patch.decision, 260),
                reason: (0, group_memory_shared_part_01_1.compactMemoryText)(patch.reason || "", 220),
            }], (item) => `${item.decision}|${item.reason}`, 20);
    }
    if (patch.completed) {
        const item = patch.completed;
        next.completed = (0, group_memory_shared_part_01_1.uniqueByKey)([...(next.completed || []), {
                time: new Date().toISOString(),
                project: item.project || "",
                summary: (0, group_memory_shared_part_01_1.compactMemoryText)(item.summary || "", 260),
                filesChanged: item.filesChanged || [],
                verification: item.verification || [],
            }], (x) => `${x.project}|${x.summary}`, 30);
        next.blocked = (next.blocked || []).filter((x) => x.project !== item.project);
    }
    if (patch.blocked) {
        const item = patch.blocked;
        next.blocked = (0, group_memory_shared_part_01_1.uniqueByKey)([...(next.blocked || []), {
                time: new Date().toISOString(),
                project: item.project || "",
                reason: (0, group_memory_shared_part_01_1.compactMemoryText)(item.reason || "", 260),
                needs: item.needs || [],
            }], (x) => `${x.project}|${x.reason}`, 30);
    }
    if (patch.messageDigest) {
        next.messageDigest = (0, group_memory_shared_part_01_1.compactMemoryText)([next.messageDigest || "", patch.messageDigest].filter(Boolean).join(" | "), 2400);
    }
    if (patch.messageCompression) {
        next.messageCompression = { ...(next.messageCompression || {}), ...(patch.messageCompression || {}) };
    }
    if (patch.workerLedger || patch.workerNotification) {
        const item = patch.workerLedger || patch.workerNotification;
        const merged = appendWorkerLedger(next, item);
        next.workerLedger = merged.workerLedger || [];
        next.agentMemories = (0, group_agent_memory_packet_1.upsertAgentMemory)(next.agentMemories || {}, item);
    }
    if (patch.openQuestion) {
        next.openQuestions = (0, group_memory_shared_part_01_1.uniqueByKey)([...(next.openQuestions || []), {
                time: new Date().toISOString(),
                question: (0, group_memory_shared_part_01_1.compactMemoryText)(patch.openQuestion, 260),
            }], (x) => x.question, 20);
    }
    if (patch.nextAction) {
        next.nextActions = (0, group_memory_shared_part_01_1.uniqueByKey)([...(next.nextActions || []), {
                time: new Date().toISOString(),
                action: (0, group_memory_shared_part_01_1.compactMemoryText)(patch.nextAction, 260),
            }], (x) => x.action, 20);
    }
    return (0, group_memory_storage_1.saveGroupMemory)(groupId, next, sessionId);
}
//# sourceMappingURL=group-memory-shared-part-02.js.map