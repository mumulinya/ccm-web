"use strict";
// Behavior-freeze split from group-compact-file-references.ts (part 1/3).
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
exports.getGroupPostCompactCandidateUsageLedgerFile = getGroupPostCompactCandidateUsageLedgerFile;
exports.getGroupApiMicrocompactNativeApplyProofLedgerFile = getGroupApiMicrocompactNativeApplyProofLedgerFile;
exports.getGroupApiMicrocompactNativeApplyRequestTelemetryLedgerFile = getGroupApiMicrocompactNativeApplyRequestTelemetryLedgerFile;
exports.getGroupCompactFileReferenceLedgerFile = getGroupCompactFileReferenceLedgerFile;
exports.normalizeCompactFileReferencePath = normalizeCompactFileReferencePath;
exports.compactFileReferenceId = compactFileReferenceId;
exports.compactFileReferenceKind = compactFileReferenceKind;
exports.compactFileReferenceEntry = compactFileReferenceEntry;
exports.uniqueCompactFileReferences = uniqueCompactFileReferences;
exports.buildGroupCompactFileReferences = buildGroupCompactFileReferences;
exports.compactFileReferenceReadPlanPriority = compactFileReferenceReadPlanPriority;
exports.buildGroupCompactFileReferenceReadPlan = buildGroupCompactFileReferenceReadPlan;
exports.readGroupCompactFileReferenceLedger = readGroupCompactFileReferenceLedger;
exports.writeGroupCompactFileReferenceLedger = writeGroupCompactFileReferenceLedger;
exports.compactFileReferenceTextForDetection = compactFileReferenceTextForDetection;
exports.compactFileReferenceMentioned = compactFileReferenceMentioned;
exports.recordGroupCompactFileReferenceSurfacing = recordGroupCompactFileReferenceSurfacing;
exports.summarizeGroupCompactFileReferenceAccess = summarizeGroupCompactFileReferenceAccess;
exports.compactFileReferenceReadPlanMentionTokens = compactFileReferenceReadPlanMentionTokens;
exports.compactFileReferenceReadPlanMentioned = compactFileReferenceReadPlanMentioned;
exports.summarizeGroupCompactFileReferenceReadPlanAccess = summarizeGroupCompactFileReferenceReadPlanAccess;
exports.summarizeGroupCompactFileReferenceReadPlanFreshness = summarizeGroupCompactFileReferenceReadPlanFreshness;
exports.latestGroupCompactFileReferenceReadPlanRows = latestGroupCompactFileReferenceReadPlanRows;
exports.latestGroupCompactFileReferenceReadPlanRevalidationGate = latestGroupCompactFileReferenceReadPlanRevalidationGate;
exports.compactReadPlanRevalidationGateRow = compactReadPlanRevalidationGateRow;
exports.buildGroupCompactFileReferenceReadPlanRevalidationGate = buildGroupCompactFileReferenceReadPlanRevalidationGate;
exports.buildGroupMemorySourceManifest = buildGroupMemorySourceManifest;
exports.readGroupPostCompactCandidateUsageLedger = readGroupPostCompactCandidateUsageLedger;
exports.writeGroupPostCompactCandidateUsageLedger = writeGroupPostCompactCandidateUsageLedger;
exports.readGroupApiMicrocompactNativeApplyProofLedger = readGroupApiMicrocompactNativeApplyProofLedger;
exports.writeGroupApiMicrocompactNativeApplyProofLedger = writeGroupApiMicrocompactNativeApplyProofLedger;
exports.readGroupApiMicrocompactNativeApplyRequestTelemetryLedger = readGroupApiMicrocompactNativeApplyRequestTelemetryLedger;
exports.writeGroupApiMicrocompactNativeApplyRequestTelemetryLedger = writeGroupApiMicrocompactNativeApplyRequestTelemetryLedger;
exports.postCompactCandidateStatsKey = postCompactCandidateStatsKey;
exports.buildPostCompactCandidateEntry = buildPostCompactCandidateEntry;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const context_budget_1 = require("../../system/context-budget");
const group_memory_index_1 = require("./group-memory-index");
const storage_1 = require("./storage");
const group_memory_shared_1 = require("./group-memory-shared");
const group_memory_storage_1 = require("./group-memory-storage");
function getGroupPostCompactCandidateUsageLedgerFile(groupId, sessionId = "") {
    return (0, group_memory_storage_1.getGroupSessionSidecarFile)(group_memory_shared_1.GROUP_MEMORY_POST_COMPACT_CANDIDATE_USAGE_DIR, groupId, sessionId);
}
function getGroupApiMicrocompactNativeApplyProofLedgerFile(groupId, sessionId = "") {
    return (0, group_memory_storage_1.getGroupSessionSidecarFile)(group_memory_shared_1.GROUP_API_MICROCOMPACT_NATIVE_APPLY_PROOF_DIR, groupId, sessionId);
}
function getGroupApiMicrocompactNativeApplyRequestTelemetryLedgerFile(groupId, sessionId = "") {
    return (0, group_memory_storage_1.getGroupSessionSidecarFile)(group_memory_shared_1.GROUP_API_MICROCOMPACT_NATIVE_APPLY_REQUEST_TELEMETRY_DIR, groupId, sessionId);
}
function getGroupCompactFileReferenceLedgerFile(groupId) {
    return path.join(group_memory_shared_1.GROUP_COMPACT_FILE_REFERENCE_DIR, `${String(groupId || "unknown").replace(/[^a-zA-Z0-9._:-]+/g, "-").slice(0, 160) || "unknown"}.json`);
}
function normalizeCompactFileReferencePath(value) {
    return String(value || "").replace(/\\/g, "/").trim();
}
function compactFileReferenceId(groupId, type, filePath) {
    return `compact-file:${crypto.createHash("sha256").update(JSON.stringify([groupId, type, normalizeCompactFileReferencePath(filePath)])).digest("hex").slice(0, 14)}`;
}
function compactFileReferenceKind(filePath) {
    try {
        const stat = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
        return stat?.isDirectory() ? "directory" : "file";
    }
    catch {
        return "file";
    }
}
function compactFileReferenceEntry(groupId, type, filePath, reason, extra = {}) {
    const normalizedPath = String(filePath || "").trim();
    if (!normalizedPath)
        return null;
    const sourceState = (0, group_memory_shared_1.buildGroupMemorySourceEntry)(`compact:${type}`, normalizedPath, type);
    return {
        schema: "ccm-compact-file-reference-v1",
        reference_id: compactFileReferenceId(groupId, type, normalizedPath),
        type,
        kind: sourceState.kind || compactFileReferenceKind(normalizedPath),
        path: normalizedPath,
        displayPath: normalizeCompactFileReferencePath(normalizedPath),
        reason: (0, group_memory_shared_1.compactMemoryText)(reason, 260),
        exists: sourceState.exists === true,
        bytes: Number(sourceState.bytes || 0),
        checksum: sourceState.checksum || "",
        checksumMode: sourceState.checksumMode || "",
        mtimeMs: Number(sourceState.mtimeMs || 0),
        mtime: sourceState.mtime || "",
        sourceChecksum: sourceState.checksum || "",
        sourceChecksumMode: sourceState.checksumMode || "",
        sourceMtimeMs: Number(sourceState.mtimeMs || 0),
        sourceMtime: sourceState.mtime || "",
        sourceBytes: Number(sourceState.bytes || 0),
        ...extra,
    };
}
function uniqueCompactFileReferences(refs = [], limit = 40) {
    return (0, group_memory_shared_1.uniqueByKey)(refs.filter(Boolean), (item) => `${item.reference_id || ""}|${normalizeCompactFileReferencePath(item.path || "")}`, limit);
}
function buildGroupCompactFileReferences(groupId, input = {}) {
    const refs = [];
    const groupSessionId = String(input.groupSessionId || input.group_session_id || "default");
    const sourceManifest = input.sourceManifest || input.source_manifest || {};
    const rawSources = input.rawSources || input.raw_sources || {};
    const sessionMemory = input.sessionMemory || input.session_memory || {};
    const toolContinuity = input.toolContinuity || input.tool_continuity || {};
    const typedMemory = input.typedMemory || input.typed_memory || {};
    const add = (type, filePath, reason, extra = {}) => {
        const ref = compactFileReferenceEntry(groupId, type, filePath, reason, extra);
        if (ref)
            refs.push(ref);
    };
    add("group_session_memory", sessionMemory.summaryFile || rawSources.group_session_memory_summary_file, "CC 风格 Session Memory summary.md；压缩后优先作为会话短记忆恢复。", {
        checksum: sessionMemory.markdownChecksum || "",
        source_schema: sessionMemory.schema || "",
    });
    add("group_session_memory_snapshot", sessionMemory.snapshotFile || rawSources.group_session_memory_snapshot_file, "Session Memory snapshot.json；用于核对摘要 checksum 和压缩边界。", {
        checksum: sessionMemory.snapshotChecksum || sessionMemory.summaryChecksum || "",
        source_schema: sessionMemory.schema || "",
    });
    add("tool_continuity_summary", toolContinuity.summaryFile || rawSources.group_tool_continuity_summary_file, "工具/技能连续性 summary.md；只恢复上下文，不扩大授权。", {
        checksum: toolContinuity.markdownChecksum || "",
        source_schema: toolContinuity.schema || "",
    });
    add("tool_continuity_snapshot", toolContinuity.snapshotFile || rawSources.group_tool_continuity_snapshot_file, "工具/技能连续性 snapshot.json；用于核对 allowed/requested/synced/missing 和 invoked skills。", {
        checksum: toolContinuity.snapshotChecksum || "",
        source_schema: toolContinuity.schema || "",
    });
    add("typed_memory_index", rawSources.group_typed_memory_index_file || typedMemory.sync?.indexFile || typedMemory.sync?.index_file, "typed MEMORY.md 入口；长期记忆索引和召回入口。");
    add("typed_memory_dir", rawSources.group_typed_memory_dir || typedMemory.sync?.memoryDir || typedMemory.sync?.memory_dir, "typed memory 目录；必要时按索引继续读取具体记忆文档。");
    add("group_memory_json", rawSources.group_memory_file || (0, group_memory_storage_1.getGroupMemoryFile)(groupId, groupSessionId), "群聊结构化记忆 JSON；压缩摘要、约束和工作账本的结构化来源。");
    add("raw_group_messages_json", rawSources.group_messages_file || (0, group_memory_shared_1.getGroupMessagesFileHint)(groupId, groupSessionId), "群聊原始消息 JSON；最高保真来源，按 message id 回溯。");
    add("global_agent_memory_json", rawSources.global_agent_memory_file, "全局 Agent 长期记忆 JSON；只注入与当前任务匹配的全局约束/历史结论，使用前必须核验当前状态。");
    add("global_memory_arbitration_ledger", rawSources.group_global_memory_arbitration_ledger_file, "全局/群聊记忆仲裁账本；用于核对被本群聊新证据降权或冲突的全局记忆，并为 typed memory 蒸馏提供候选。");
    add("global_memory_cross_group_arbitration", rawSources.global_memory_cross_group_arbitration_dir, "跨群聊全局记忆仲裁 ledger 目录；用于核对同一全局记忆是否已在其他群聊被降权/冲突，避免 stale 全局记忆重复注入子 Agent。");
    add("typed_memory_recall_ledger", rawSources.group_typed_memory_recall_ledger_file, "typed memory recall ledger；用于避免重复召回和核对已 surfaced 记忆。");
    add("typed_memory_distillation_ledger", rawSources.group_typed_memory_distillation_ledger_file, "typed memory distillation ledger；用于核对长期日志蒸馏和归档。");
    add("post_compact_candidate_usage_ledger", rawSources.group_post_compact_candidate_usage_ledger_file, "压缩重注入候选使用账本；子 Agent 回执应声明 used/ignored/verified。");
    add("post_compact_dispatch_ledger", rawSources.group_post_compact_dispatch_ledger_file, "压缩后首次派发账本；用于核对 post-compact 第一跳上下文。");
    add("replay_repair_work_items", rawSources.group_replay_repair_work_items_file, "Replay repair work items；压缩恢复缺口的待办来源。");
    for (const entry of Array.isArray(sourceManifest.entries) ? sourceManifest.entries : []) {
        if (!entry?.path)
            continue;
        if (!["typed_memory_doc", "typed_memory_entrypoint", "raw_group_messages_json", "group_memory_json"].includes(String(entry.type || "")))
            continue;
        add(String(entry.type || "memory_source"), entry.path, `source manifest ${entry.id || "entry"}；${entry.type || "memory source"}`, {
            manifest_id: entry.id || "",
            checksum: entry.checksum || entry.docChecksum || "",
            source_schema: sourceManifest.schema || "",
        });
    }
    const unique = uniqueCompactFileReferences(refs, Number(input.limit || 40));
    return {
        schema: "ccm-group-compact-file-references-v1",
        version: group_memory_shared_1.GROUP_COMPACT_FILE_REFERENCE_LEDGER_VERSION,
        groupId,
        generatedAt: String(input.generatedAt || input.generated_at || new Date().toISOString()),
        referenceCount: unique.length,
        fileCount: unique.filter((item) => item.kind === "file").length,
        directoryCount: unique.filter((item) => item.kind === "directory").length,
        missingCount: unique.filter((item) => item.exists === false).length,
        references: unique,
        usePolicy: {
            sourceOfTruth: "raw_group_messages_json",
            behavior: "compact_file_reference",
            note: "这些路径是压缩后恢复上下文的文件引用；内容过大或过旧时应按当前任务选择性读取/核验，不要盲目假定。",
        },
    };
}
function compactFileReferenceReadPlanPriority(reference = {}) {
    const type = String(reference.type || "");
    if (reference.exists === false)
        return { priority: 900, action: "skip_missing", readMode: "unavailable", reason: "引用路径不存在；不要假定该来源可读，在 memoryIgnored 中说明缺失。" };
    if (type === "group_session_memory")
        return { priority: 10, action: "read_first_for_compact_summary", readMode: "read_markdown_summary", reason: "压缩后短记忆摘要，优先用来恢复会话目标、约束和近期结论。" };
    if (type === "raw_group_messages_json")
        return { priority: 20, action: "read_if_summary_is_insufficient", readMode: "targeted_json_source_of_truth", reason: "群聊原始消息是最高保真来源；只在需要核对 message id、用户原话或摘要冲突时读取。" };
    if (type === "typed_memory_index")
        return { priority: 30, action: "read_index_before_specific_memory_docs", readMode: "read_index_then_targeted_docs", reason: "typed MEMORY.md 是长期记忆入口；先看索引，再按任务读取具体类型化文档。" };
    if (type === "typed_memory_dir")
        return { priority: 35, action: "list_or_open_index_only", readMode: "directory_index_only", reason: "typed memory 目录只作为入口；避免盲目读取整个目录。" };
    if (type === "group_memory_json")
        return { priority: 40, action: "read_for_structured_state", readMode: "targeted_json_state", reason: "结构化群聊记忆可核对 workerLedger、约束、压缩边界和当前阶段。" };
    if (type === "group_session_memory_snapshot")
        return { priority: 45, action: "read_to_verify_summary_checksum", readMode: "targeted_json_metadata", reason: "用于核对 Session Memory 摘要 checksum、边界和生成状态。" };
    if (type === "tool_continuity_summary")
        return { priority: 50, action: "read_if_tool_or_skill_context_matters", readMode: "read_markdown_summary", reason: "工具/技能连续性只恢复上下文，不扩大授权；涉及工具选择时再读取。" };
    if (type === "tool_continuity_snapshot")
        return { priority: 55, action: "read_to_verify_tool_context_only", readMode: "targeted_json_metadata", reason: "核对 allowed/requested/synced/missing 与 invoked skills，仍以当前 runtime gate 为准。" };
    if (type === "post_compact_candidate_usage_ledger")
        return { priority: 60, action: "read_for_candidate_usage_history", readMode: "targeted_json_ledger", reason: "核对压缩重注入候选历史 used/ignored/verified，避免重复提升 stale 记忆。" };
    if (type === "post_compact_dispatch_ledger")
        return { priority: 65, action: "read_for_first_dispatch_after_compact", readMode: "targeted_json_ledger", reason: "核对压缩后第一跳派发 marker 和边界连续性。" };
    if (type === "typed_memory_recall_ledger")
        return { priority: 70, action: "read_for_recall_dedupe", readMode: "targeted_json_ledger", reason: "需要排查重复召回或已 surfaced 记忆时再读取。" };
    if (type === "typed_memory_distillation_ledger")
        return { priority: 75, action: "read_for_distillation_archive", readMode: "targeted_json_ledger", reason: "需要核对长期日志蒸馏、归档和降权历史时再读取。" };
    if (type === "global_memory_arbitration_ledger")
        return { priority: 58, action: "read_for_global_group_memory_conflict_history", readMode: "targeted_json_ledger", reason: "排查全局记忆与本群聊新证据冲突时读取；重复冲突应优先蒸馏为 typed MEMORY.md。" };
    if (type === "global_memory_cross_group_arbitration")
        return { priority: 59, action: "read_for_cross_group_global_memory_suppression", readMode: "directory_index_then_targeted_json_ledgers", reason: "排查同一全局记忆是否已在其他群聊被降权/冲突；只能作为谨慎背景，不能覆盖当前群聊证据。" };
    if (type === "replay_repair_work_items")
        return { priority: 80, action: "read_for_replay_repair_work", readMode: "targeted_json_work_items", reason: "需要处理压缩恢复缺口或待办时读取。" };
    return { priority: 85, action: "read_if_current_task_requires", readMode: reference.kind === "directory" ? "directory_index_only" : "targeted_file_read", reason: "按当前任务相关性决定是否读取；读取后必须在回执声明。" };
}
function buildGroupCompactFileReferenceReadPlan(groupId, references = {}, options = {}) {
    const refs = Array.isArray(references?.references) ? references.references : [];
    const maxEntries = Math.max(1, Math.min(20, Number(options.maxEntries || options.max_entries || 10)));
    const entries = refs.map((reference) => {
        const plan = compactFileReferenceReadPlanPriority(reference);
        const bytes = Number(reference.bytes || 0);
        const maxBytesToInspect = reference.kind === "directory"
            ? 0
            : Math.min(bytes || Number(options.defaultMaxBytes || 128 * 1024), Number(options.maxBytesPerReference || options.max_bytes_per_reference || 256 * 1024));
        return {
            schema: "ccm-compact-file-reference-read-plan-entry-v1",
            read_plan_id: `cfr-read:${crypto.createHash("sha256").update(JSON.stringify([groupId, reference.reference_id || "", reference.path || "", plan.action])).digest("hex").slice(0, 12)}`,
            reference_id: reference.reference_id || "",
            type: reference.type || "",
            kind: reference.kind || "",
            path: reference.path || "",
            displayPath: reference.displayPath || normalizeCompactFileReferencePath(reference.path || ""),
            exists: reference.exists === true,
            sourceChecksum: reference.sourceChecksum || reference.checksum || "",
            sourceChecksumMode: reference.sourceChecksumMode || reference.checksumMode || "",
            sourceMtimeMs: Number(reference.sourceMtimeMs || reference.mtimeMs || 0),
            sourceMtime: reference.sourceMtime || reference.mtime || "",
            sourceBytes: Number(reference.sourceBytes || reference.bytes || 0),
            priority: plan.priority,
            action: plan.action,
            readMode: plan.readMode,
            maxBytesToInspect,
            tokenBudgetHint: maxBytesToInspect ? Math.ceil(maxBytesToInspect / 4) : 0,
            reason: plan.reason,
            receipt: "读取或决定不读取后，在 CCM_AGENT_RECEIPT.memoryUsed 或 memoryIgnored 中引用 read_plan_id、reference_id 或路径。",
        };
    }).sort((a, b) => Number(a.priority || 0) - Number(b.priority || 0) || String(a.type || "").localeCompare(String(b.type || "")));
    const planned = entries.filter((entry) => entry.action !== "skip_missing").slice(0, maxEntries);
    const missing = entries.filter((entry) => entry.action === "skip_missing");
    const sourceOfTruth = planned.filter((entry) => ["raw_group_messages_json", "group_memory_json"].includes(String(entry.type || "")));
    const compactSummaries = planned.filter((entry) => ["group_session_memory", "typed_memory_index", "tool_continuity_summary"].includes(String(entry.type || "")));
    return {
        schema: "ccm-group-compact-file-reference-read-plan-v1",
        version: group_memory_shared_1.GROUP_COMPACT_FILE_REFERENCE_LEDGER_VERSION,
        groupId,
        generatedAt: String(options.generatedAt || options.generated_at || new Date().toISOString()),
        sourceReferenceCount: refs.length,
        plannedCount: planned.length,
        missingCount: missing.length,
        maxEntries,
        hasSourceOfTruth: sourceOfTruth.length > 0,
        hasCompactSummary: compactSummaries.length > 0,
        entries: [...planned, ...missing.slice(0, Math.max(0, maxEntries - planned.length))],
        policy: {
            mode: "read_on_demand_after_compact",
            sourceOfTruth: "raw_group_messages_json",
            doNotReadAll: true,
            preferOrder: ["group_session_memory", "raw_group_messages_json", "typed_memory_index", "group_memory_json"],
            receiptFields: ["memoryUsed", "memoryIgnored"],
            note: "这是压缩后文件引用读取计划：先按任务相关性选择读取，避免盲目全量读目录或大 JSON；读取或忽略都要回执声明。",
        },
    };
}
function readGroupCompactFileReferenceLedger(groupId) {
    const file = getGroupCompactFileReferenceLedgerFile(groupId);
    try {
        const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
        return {
            ...parsed,
            file,
            entries: Array.isArray(parsed.entries) ? parsed.entries : [],
            stats: parsed.stats && typeof parsed.stats === "object" ? parsed.stats : {},
        };
    }
    catch {
        return {
            schema: "ccm-group-compact-file-reference-ledger-v1",
            version: group_memory_shared_1.GROUP_COMPACT_FILE_REFERENCE_LEDGER_VERSION,
            groupId,
            file,
            entries: [],
            stats: {},
            updatedAt: "",
        };
    }
}
function writeGroupCompactFileReferenceLedger(groupId, ledger) {
    const file = getGroupCompactFileReferenceLedgerFile(groupId);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, JSON.stringify({
        schema: "ccm-group-compact-file-reference-ledger-v1",
        version: group_memory_shared_1.GROUP_COMPACT_FILE_REFERENCE_LEDGER_VERSION,
        groupId,
        entries: (ledger.entries || []).slice(-180),
        stats: ledger.stats || {},
        updatedAt: ledger.updatedAt || new Date().toISOString(),
    }, null, 2), "utf-8");
    fs.renameSync(temp, file);
    return { ...ledger, file };
}
function compactFileReferenceTextForDetection(reference = {}) {
    return [
        reference.reference_id,
        reference.path,
        reference.displayPath,
        path.basename(String(reference.path || "")),
    ].map(item => String(item || "").toLowerCase()).filter(Boolean);
}
function compactFileReferenceMentioned(text, reference = {}) {
    const lower = String(text || "").replace(/\\/g, "/").toLowerCase();
    if (!lower)
        return false;
    return compactFileReferenceTextForDetection(reference).some(token => token && lower.includes(token));
}
function recordGroupCompactFileReferenceSurfacing(groupId, references = {}, options = {}) {
    if (!references?.schema || !Array.isArray(references.references) || !references.references.length)
        return null;
    const ledger = readGroupCompactFileReferenceLedger(groupId);
    const readPlan = options.readPlan || options.read_plan || {};
    const readPlanEntries = Array.isArray(readPlan.entries) ? readPlan.entries : [];
    const readPlanRevalidationGate = options.readPlanRevalidationGate || options.read_plan_revalidation_gate || null;
    const sessionBinding = options.sessionBinding || options.session_binding || null;
    const fingerprint = (0, group_memory_shared_1.compactReferenceFingerprint)(references.references);
    const scope = String(options.scope || options.contextKind || options.context_kind || "child_agent");
    const targetProject = String(options.targetProject || options.target_project || "");
    const entryId = `file-ref:${crypto.createHash("sha256").update(JSON.stringify([groupId, scope, targetProject, fingerprint])).digest("hex").slice(0, 14)}`;
    const entry = {
        entry_id: entryId,
        generated_at: String(options.generatedAt || options.generated_at || new Date().toISOString()),
        scope,
        target_project: targetProject,
        task_id: String(options.taskId || options.task_id || sessionBinding?.task_id || sessionBinding?.taskId || ""),
        trace_id: String(options.traceId || options.trace_id || sessionBinding?.trace_id || sessionBinding?.traceId || ""),
        task_agent_session_id: String(sessionBinding?.task_agent_session_id || sessionBinding?.taskAgentSessionId || ""),
        native_session_id: String(sessionBinding?.native_session_id || sessionBinding?.nativeSessionId || ""),
        session_binding: sessionBinding?.schema ? sessionBinding : null,
        task_query_hash: (0, group_memory_shared_1.hashSessionMemoryText)(options.task || options.task_query || "", 12),
        reference_count: references.referenceCount || references.references.length,
        missing_count: references.missingCount || 0,
        read_plan_count: readPlanEntries.length,
        reference_fingerprint: fingerprint,
        references: references.references.slice(0, 40).map((item) => ({
            reference_id: item.reference_id,
            type: item.type,
            kind: item.kind,
            path: item.path,
            checksum: item.checksum || "",
            exists: item.exists === true,
        })),
        read_plan_entries: readPlanEntries.slice(0, 40).map((item) => ({
            read_plan_id: item.read_plan_id,
            reference_id: item.reference_id,
            type: item.type,
            action: item.action,
            priority: item.priority,
            path: item.path,
            exists: item.exists === true,
            sourceChecksum: item.sourceChecksum || "",
            sourceChecksumMode: item.sourceChecksumMode || "",
            sourceMtimeMs: Number(item.sourceMtimeMs || 0),
            sourceBytes: Number(item.sourceBytes || 0),
        })),
        read_plan_revalidation_gate: readPlanRevalidationGate?.schema === "ccm-group-compact-file-reference-read-plan-revalidation-gate-v1"
            ? {
                schema: readPlanRevalidationGate.schema,
                version: readPlanRevalidationGate.version,
                revalidation_gate_id: readPlanRevalidationGate.revalidation_gate_id || "",
                group_id: readPlanRevalidationGate.group_id || groupId,
                target_project: readPlanRevalidationGate.target_project || targetProject,
                scope: readPlanRevalidationGate.scope || scope,
                generated_at: readPlanRevalidationGate.generated_at || String(options.generatedAt || options.generated_at || new Date().toISOString()),
                status: readPlanRevalidationGate.status || "",
                action: readPlanRevalidationGate.action || "",
                required_count: Number(readPlanRevalidationGate.required_count || 0),
                verification_count: Number(readPlanRevalidationGate.verification_count || 0),
                checked_count: Number(readPlanRevalidationGate.checked_count || 0),
                required_read_plan_ids: (readPlanRevalidationGate.required_read_plan_ids || []).slice(0, 20),
                verification_read_plan_ids: (readPlanRevalidationGate.verification_read_plan_ids || []).slice(0, 12),
                required_entries: (readPlanRevalidationGate.required_entries || []).slice(0, 20),
                verification_entries: (readPlanRevalidationGate.verification_entries || []).slice(0, 12),
                receipt_contract: readPlanRevalidationGate.receipt_contract || {},
                session_binding: readPlanRevalidationGate.session_binding || sessionBinding || null,
            }
            : null,
    };
    const entries = (0, group_memory_shared_1.uniqueByKey)([...(ledger.entries || []), entry], (item) => item.entry_id || `${item.scope}|${item.target_project}|${item.reference_fingerprint}`, 180);
    const stats = {
        entryCount: entries.length,
        latestReferenceCount: entry.reference_count,
        latestMissingCount: entry.missing_count,
        latestReadPlanCount: entry.read_plan_count,
        targetProjects: (0, group_memory_shared_1.uniqueByKey)(entries.map((item) => ({ target_project: item.target_project || "" })), (item) => item.target_project, 40).map((item) => item.target_project).filter(Boolean),
    };
    return writeGroupCompactFileReferenceLedger(groupId, { ...ledger, entries, stats, updatedAt: entry.generated_at });
}
function summarizeGroupCompactFileReferenceAccess(groupId, references = {}, memory = {}) {
    const refs = Array.isArray(references?.references) ? references.references : [];
    const ledger = readGroupCompactFileReferenceLedger(groupId);
    const evidenceSources = [];
    for (const item of Array.isArray(memory.workerLedger) ? memory.workerLedger : []) {
        evidenceSources.push({
            source: "worker_ledger",
            target_project: item.project || item.agent || "",
            task_id: item.taskId || item.task_id || "",
            text: [
                item.summary,
                ...(Array.isArray(item.memoryUsed || item.memory_used) ? (item.memoryUsed || item.memory_used) : []),
                ...(Array.isArray(item.memoryIgnored || item.memory_ignored) ? (item.memoryIgnored || item.memory_ignored) : []),
            ].filter(Boolean).join("\n"),
        });
    }
    for (const message of (0, storage_1.getGroupMessages)(groupId, String(memory?.groupSessionId || "")).slice(-160)) {
        evidenceSources.push({
            source: "group_message",
            target_project: message.agent || message.target || "",
            task_id: message.task_id || message.taskId || "",
            message_id: message.id || message.uuid || "",
            text: [
                message.content,
                JSON.stringify(message.receipt || {}),
                JSON.stringify(message.delivery_summary || {}),
            ].filter(Boolean).join("\n"),
        });
    }
    const rows = refs.map((reference) => {
        const matches = evidenceSources.filter(source => compactFileReferenceMentioned(source.text, reference)).slice(-8);
        return {
            reference_id: reference.reference_id,
            type: reference.type,
            path: reference.path,
            exists: reference.exists === true,
            mentioned: matches.length > 0,
            mention_count: matches.length,
            latest: matches[matches.length - 1] || null,
        };
    });
    const mentioned = rows.filter(row => row.mentioned);
    return {
        schema: "ccm-group-compact-file-reference-access-summary-v1",
        version: group_memory_shared_1.GROUP_COMPACT_FILE_REFERENCE_LEDGER_VERSION,
        groupId,
        ledger_file: ledger.file,
        ledger_entry_count: Array.isArray(ledger.entries) ? ledger.entries.length : 0,
        reference_count: refs.length,
        mentioned_count: mentioned.length,
        missing_count: rows.filter(row => row.exists === false).length,
        mention_rate: refs.length ? Math.round((mentioned.length / refs.length) * 1000) / 10 : null,
        rows,
        recent_surfaced: (Array.isArray(ledger.entries) ? ledger.entries : []).slice(-8).reverse(),
    };
}
function compactFileReferenceReadPlanMentionTokens(entry = {}) {
    return [
        entry.read_plan_id,
        entry.reference_id,
        entry.path,
        entry.displayPath,
        path.basename(String(entry.path || "")),
    ].map(item => String(item || "").toLowerCase()).filter(Boolean);
}
function compactFileReferenceReadPlanMentioned(text, entry = {}) {
    const lower = String(text || "").replace(/\\/g, "/").toLowerCase();
    if (!lower)
        return { mentioned: false, readPlanIdMentioned: false, referenceMentioned: false };
    const readPlanId = String(entry.read_plan_id || "").toLowerCase();
    const readPlanIdMentioned = !!readPlanId && lower.includes(readPlanId);
    const referenceMentioned = compactFileReferenceReadPlanMentionTokens(entry)
        .filter(token => token !== readPlanId)
        .some(token => token && lower.includes(token));
    return { mentioned: readPlanIdMentioned || referenceMentioned, readPlanIdMentioned, referenceMentioned };
}
function summarizeGroupCompactFileReferenceReadPlanAccess(groupId, readPlan = {}, memory = {}) {
    const entries = Array.isArray(readPlan?.entries) ? readPlan.entries : [];
    const ledger = readGroupCompactFileReferenceLedger(groupId);
    const evidenceSources = [];
    for (const item of Array.isArray(memory.workerLedger) ? memory.workerLedger : []) {
        evidenceSources.push({
            source: "worker_ledger",
            target_project: item.project || item.agent || "",
            task_id: item.taskId || item.task_id || "",
            text: [
                item.summary,
                ...(Array.isArray(item.memoryUsed || item.memory_used) ? (item.memoryUsed || item.memory_used) : []),
                ...(Array.isArray(item.memoryIgnored || item.memory_ignored) ? (item.memoryIgnored || item.memory_ignored) : []),
            ].filter(Boolean).join("\n"),
        });
    }
    for (const message of (0, storage_1.getGroupMessages)(groupId, String(memory?.groupSessionId || "")).slice(-160)) {
        evidenceSources.push({
            source: "group_message",
            target_project: message.agent || message.target || "",
            task_id: message.task_id || message.taskId || "",
            message_id: message.id || message.uuid || "",
            text: [
                message.content,
                JSON.stringify(message.receipt || {}),
                JSON.stringify(message.delivery_summary || {}),
            ].filter(Boolean).join("\n"),
        });
    }
    const rows = entries.map((entry) => {
        const matches = evidenceSources.map(source => {
            const match = compactFileReferenceReadPlanMentioned(source.text, entry);
            return match.mentioned ? { ...source, read_plan_id_mentioned: match.readPlanIdMentioned, reference_mentioned: match.referenceMentioned } : null;
        }).filter(Boolean).slice(-8);
        return {
            read_plan_id: entry.read_plan_id,
            reference_id: entry.reference_id,
            type: entry.type,
            action: entry.action,
            priority: Number(entry.priority || 0),
            path: entry.path,
            exists: entry.exists === true,
            mentioned: matches.length > 0,
            read_plan_id_mentioned: matches.some((match) => match.read_plan_id_mentioned === true),
            reference_mentioned: matches.some((match) => match.reference_mentioned === true),
            mention_count: matches.length,
            latest: matches[matches.length - 1] || null,
        };
    });
    const mentioned = rows.filter(row => row.mentioned);
    const readPlanIdMentioned = rows.filter(row => row.read_plan_id_mentioned);
    return {
        schema: "ccm-group-compact-file-reference-read-plan-access-summary-v1",
        version: group_memory_shared_1.GROUP_COMPACT_FILE_REFERENCE_LEDGER_VERSION,
        groupId,
        ledger_file: ledger.file,
        ledger_entry_count: Array.isArray(ledger.entries) ? ledger.entries.length : 0,
        read_plan_entry_count: entries.length,
        mentioned_count: mentioned.length,
        read_plan_id_mentioned_count: readPlanIdMentioned.length,
        reference_mentioned_count: rows.filter(row => row.reference_mentioned).length,
        mention_rate: entries.length ? Math.round((mentioned.length / entries.length) * 1000) / 10 : null,
        read_plan_id_mention_rate: entries.length ? Math.round((readPlanIdMentioned.length / entries.length) * 1000) / 10 : null,
        rows,
        recent_surfaced: (Array.isArray(ledger.entries) ? ledger.entries : []).slice(-8).reverse().map((entry) => ({
            entry_id: entry.entry_id || "",
            generated_at: entry.generated_at || "",
            scope: entry.scope || "",
            target_project: entry.target_project || "",
            read_plan_count: Number(entry.read_plan_count || (entry.read_plan_entries || []).length || 0),
        })),
    };
}
function summarizeGroupCompactFileReferenceReadPlanFreshness(groupId, readPlan = {}) {
    const entries = Array.isArray(readPlan?.entries) ? readPlan.entries : [];
    const rows = entries.map((entry) => {
        const current = (0, group_memory_shared_1.buildGroupMemorySourceEntry)(`read_plan:${entry.read_plan_id || entry.reference_id || entry.type || "source"}`, entry.path || "", entry.type || "compact_read_plan_source");
        const expectedChecksum = String(entry.sourceChecksum || entry.checksum || "");
        const expectedMtimeMs = Number(entry.sourceMtimeMs || entry.mtimeMs || 0);
        const expectedBytes = Number(entry.sourceBytes || entry.bytes || 0);
        const planned = entry.action !== "skip_missing";
        const existsChanged = entry.exists === true && current.exists !== true;
        const checksumChanged = !!expectedChecksum && !!current.checksum && expectedChecksum !== current.checksum;
        const bytesChanged = expectedBytes > 0 && Number(current.bytes || 0) !== expectedBytes;
        const mtimeChanged = expectedMtimeMs > 0 && Number(current.mtimeMs || 0) !== expectedMtimeMs;
        const unverifiable = planned && current.exists === true && !expectedChecksum && !expectedMtimeMs && !expectedBytes;
        const changed = planned && (existsChanged || checksumChanged || bytesChanged || (!checksumChanged && mtimeChanged));
        const freshnessStatus = !planned && current.exists !== true
            ? "missing_expected"
            : current.exists !== true ? "missing"
                : changed ? "changed"
                    : unverifiable ? "unverifiable"
                        : "fresh";
        return {
            read_plan_id: entry.read_plan_id || "",
            reference_id: entry.reference_id || "",
            type: entry.type || "",
            action: entry.action || "",
            priority: Number(entry.priority || 0),
            path: entry.path || "",
            exists: current.exists === true,
            planned,
            freshness_status: freshnessStatus,
            fresh: freshnessStatus === "fresh" || freshnessStatus === "missing_expected",
            changed,
            unverifiable,
            expected: {
                checksum: expectedChecksum,
                checksumMode: entry.sourceChecksumMode || entry.checksumMode || "",
                mtimeMs: expectedMtimeMs,
                bytes: expectedBytes,
            },
            current: {
                checksum: current.checksum || "",
                checksumMode: current.checksumMode || "",
                mtimeMs: Number(current.mtimeMs || 0),
                bytes: Number(current.bytes || 0),
                status: current.status || "",
            },
            changes: [
                existsChanged ? "exists" : "",
                checksumChanged ? "checksum" : "",
                bytesChanged ? "bytes" : "",
                mtimeChanged ? "mtimeMs" : "",
            ].filter(Boolean),
            reason: changed
                ? "read plan source changed after surfacing; re-read and verify current source before using this memory"
                : unverifiable ? "read plan source lacks stable fingerprint; verify current source before using"
                    : "read plan source is fresh",
        };
    });
    const checkedRows = rows.filter((row) => row.planned);
    const changedRows = checkedRows.filter((row) => row.changed || row.freshness_status === "missing");
    const unverifiableRows = checkedRows.filter((row) => row.unverifiable);
    const freshRows = checkedRows.filter((row) => row.freshness_status === "fresh");
    const freshnessRate = checkedRows.length ? Math.round((freshRows.length / checkedRows.length) * 1000) / 10 : null;
    const status = checkedRows.length === 0
        ? "empty"
        : changedRows.length > 0 ? "fail"
            : unverifiableRows.length > 0 ? "warn"
                : "ok";
    return {
        schema: "ccm-group-compact-file-reference-read-plan-freshness-v1",
        version: group_memory_shared_1.GROUP_COMPACT_FILE_REFERENCE_LEDGER_VERSION,
        groupId,
        generatedAt: new Date().toISOString(),
        status,
        checked: checkedRows.length,
        freshCount: freshRows.length,
        changedCount: changedRows.length,
        unverifiableCount: unverifiableRows.length,
        freshnessRate,
        rows: rows.slice(0, 40),
        staleRows: changedRows.slice(0, 12),
        gaps: [
            ...changedRows.slice(0, 8).map((row) => ({
                read_plan_id: row.read_plan_id,
                reference_id: row.reference_id,
                type: row.type,
                path: row.path,
                reason: row.reason,
                changes: row.changes,
            })),
            ...unverifiableRows.slice(0, 4).map((row) => ({
                read_plan_id: row.read_plan_id,
                reference_id: row.reference_id,
                type: row.type,
                path: row.path,
                reason: row.reason,
                changes: ["fingerprint_missing"],
            })),
        ].slice(0, 12),
    };
}
function latestGroupCompactFileReferenceReadPlanRows(groupId, fallbackReadPlan = {}, options = {}) {
    const ledger = readGroupCompactFileReferenceLedger(groupId);
    const maxLedgerEntries = Math.max(1, Math.min(20, Number(options.maxLedgerEntries || options.max_ledger_entries || 8)));
    const fromLedger = (Array.isArray(ledger.entries) ? ledger.entries : []).slice(-maxLedgerEntries).flatMap((entry) => (Array.isArray(entry.read_plan_entries) ? entry.read_plan_entries : []).map((row) => ({
        ...row,
        surfaced_at: entry.generated_at || "",
        surfacing_scope: entry.scope || "",
        target_project: entry.target_project || "",
        surfacing_entry_id: entry.entry_id || "",
    })));
    const rowsSource = fromLedger.length ? fromLedger : (Array.isArray(fallbackReadPlan?.entries) ? fallbackReadPlan.entries : []);
    const seen = new Set();
    const rows = [];
    for (const row of [...rowsSource].reverse()) {
        const id = String(row.read_plan_id || row.readPlanId || "").trim();
        const referenceId = String(row.reference_id || row.referenceId || "").trim();
        const refPath = String(row.path || "").trim();
        const key = id || referenceId || refPath;
        if (!key || seen.has(key))
            continue;
        seen.add(key);
        rows.unshift({
            read_plan_id: id,
            reference_id: referenceId,
            type: row.type || "",
            action: row.action || "",
            priority: Number(row.priority || 0),
            path: refPath,
            displayPath: row.displayPath || normalizeCompactFileReferencePath(refPath),
            exists: row.exists !== false,
            sourceChecksum: row.sourceChecksum || row.source_checksum || row.checksum || "",
            sourceChecksumMode: row.sourceChecksumMode || row.source_checksum_mode || row.checksumMode || "",
            sourceMtimeMs: Number(row.sourceMtimeMs || row.source_mtime_ms || row.mtimeMs || 0),
            sourceBytes: Number(row.sourceBytes || row.source_bytes || row.bytes || 0),
            surfaced_at: row.surfaced_at || row.generated_at || "",
            surfacing_scope: row.surfacing_scope || row.scope || "",
            target_project: row.target_project || "",
            surfacing_entry_id: row.surfacing_entry_id || row.entry_id || "",
        });
    }
    return {
        schema: "ccm-group-compact-file-reference-read-plan-latest-rows-v1",
        groupId,
        ledgerFile: ledger.file,
        ledgerEntryCount: Array.isArray(ledger.entries) ? ledger.entries.length : 0,
        rows: rows.slice(0, Math.max(1, Math.min(80, Number(options.maxRows || options.max_rows || 60)))),
    };
}
function latestGroupCompactFileReferenceReadPlanRevalidationGate(groupId) {
    const ledger = readGroupCompactFileReferenceLedger(groupId);
    const entries = Array.isArray(ledger.entries) ? ledger.entries : [];
    for (const entry of [...entries].reverse()) {
        const gate = entry.read_plan_revalidation_gate || entry.readPlanRevalidationGate;
        if (gate?.schema === "ccm-group-compact-file-reference-read-plan-revalidation-gate-v1") {
            return {
                ...gate,
                ledger_file: ledger.file,
                surfacing_entry_id: entry.entry_id || "",
                surfaced_at: entry.generated_at || "",
                surfacing_scope: entry.scope || "",
                target_project: entry.target_project || gate.target_project || "",
            };
        }
    }
    return null;
}
function compactReadPlanRevalidationGateRow(row = {}, action) {
    return {
        read_plan_id: row.read_plan_id || "",
        reference_id: row.reference_id || "",
        type: row.type || "",
        action: row.action || "",
        revalidation_action: action,
        priority: Number(row.priority || 0),
        path: row.path || "",
        displayPath: row.displayPath || normalizeCompactFileReferencePath(row.path || ""),
        freshness_status: row.freshness_status || "",
        changes: Array.isArray(row.changes) ? row.changes : [],
        expected: row.expected || {},
        current: row.current || {},
        reason: row.reason || "",
    };
}
function buildGroupCompactFileReferenceReadPlanRevalidationGate(groupId, freshness = {}, options = {}) {
    const rows = Array.isArray(freshness?.rows) ? freshness.rows : [];
    const sessionBinding = options.sessionBinding || options.session_binding || null;
    const requiredRows = rows
        .filter((row) => row?.planned !== false && (row.changed === true || row.freshness_status === "missing"))
        .map((row) => compactReadPlanRevalidationGateRow(row, "must_re_read_current_source_before_use"));
    const verificationRows = rows
        .filter((row) => row?.planned !== false && row.unverifiable === true)
        .map((row) => compactReadPlanRevalidationGateRow(row, "verify_current_source_before_use"));
    const targetProject = String(options.targetProject || options.target_project || "");
    const generatedAt = String(options.generatedAt || options.generated_at || new Date().toISOString());
    const gateId = `cfr-rvg:${crypto.createHash("sha256").update(JSON.stringify([
        groupId,
        targetProject,
        requiredRows.map((row) => [row.read_plan_id, row.freshness_status, row.changes, row.current?.checksum || row.current?.mtimeMs || ""]),
        verificationRows.map((row) => [row.read_plan_id, row.freshness_status]),
        sessionBinding?.task_agent_session_id || sessionBinding?.taskAgentSessionId || "",
        sessionBinding?.native_session_id || sessionBinding?.nativeSessionId || "",
    ])).digest("hex").slice(0, 14)}`;
    const status = requiredRows.length
        ? "required"
        : verificationRows.length ? "verify_recommended"
            : rows.length ? "not_required" : "empty";
    const action = requiredRows.length
        ? "re_read_changed_sources_before_using_compact_memory"
        : verificationRows.length ? "verify_unfingerprinted_sources_before_using_compact_memory"
            : "none";
    const gate = {
        schema: "ccm-group-compact-file-reference-read-plan-revalidation-gate-v1",
        version: group_memory_shared_1.GROUP_COMPACT_FILE_REFERENCE_READ_PLAN_REVALIDATION_GATE_VERSION,
        revalidation_gate_id: gateId,
        group_id: groupId,
        target_project: targetProject,
        scope: String(options.scope || (targetProject ? `child:${targetProject}` : "child")),
        generated_at: generatedAt,
        task_id: String(sessionBinding?.task_id || sessionBinding?.taskId || options.taskId || options.task_id || ""),
        trace_id: String(sessionBinding?.trace_id || sessionBinding?.traceId || options.traceId || options.trace_id || ""),
        task_agent_session_id: String(sessionBinding?.task_agent_session_id || sessionBinding?.taskAgentSessionId || ""),
        native_session_id: String(sessionBinding?.native_session_id || sessionBinding?.nativeSessionId || ""),
        session_binding: sessionBinding?.schema ? sessionBinding : null,
        status,
        action,
        required_count: requiredRows.length,
        verification_count: verificationRows.length,
        checked_count: Number(freshness.checked || rows.filter((row) => row?.planned !== false).length || 0),
        freshness_status: freshness.status || "unknown",
        freshness_rate: freshness.freshnessRate ?? null,
        changed_count: Number(freshness.changedCount || requiredRows.length || 0),
        unverifiable_count: Number(freshness.unverifiableCount || verificationRows.length || 0),
        required_read_plan_ids: requiredRows.map((row) => row.read_plan_id).filter(Boolean),
        verification_read_plan_ids: verificationRows.map((row) => row.read_plan_id).filter(Boolean),
        required_entries: requiredRows.slice(0, 20),
        verification_entries: verificationRows.slice(0, 12),
        receipt_contract: {
            required_receipt_fields: ["memoryUsed", "memoryIgnored"],
            required_reference: gateId,
            required_read_plan_ids: requiredRows.map((row) => row.read_plan_id).filter(Boolean).slice(0, 20),
            required_task_agent_session_id: String(sessionBinding?.task_agent_session_id || sessionBinding?.taskAgentSessionId || ""),
            required_native_session_id: String(sessionBinding?.native_session_id || sessionBinding?.nativeSessionId || ""),
            memory_used_must_reference_gate: requiredRows.length > 0 || verificationRows.length > 0,
            memory_ignored_must_reference_gate: requiredRows.length > 0 || verificationRows.length > 0,
            receipt_should_match_session: !!(sessionBinding?.task_agent_session_id || sessionBinding?.taskAgentSessionId || sessionBinding?.native_session_id || sessionBinding?.nativeSessionId),
            require_current_source_verification: requiredRows.length > 0,
            required_receipt_signal: "read_plan_id plus re-read/current source verified, or memoryIgnored explaining the read_plan_id was not used",
            note: "changed read plan entries must be re-read from the current source before applying compact memory; the receipt must mention the read_plan_id and gate id.",
        },
        prompt_patch: requiredRows.length
            ? [
                "Compact read plan revalidation required:",
                sessionBinding?.task_agent_session_id ? `- session_binding=${sessionBinding.task_agent_session_id}; native=${sessionBinding.native_session_id || "pending"}; turn=${sessionBinding.turn || 0}; receipt must stay tied to this task Agent session.` : "",
                ...requiredRows.slice(0, 8).map((row) => `- read_plan_id=${row.read_plan_id}; ${row.type}; ${row.displayPath || row.path}; changes=${(row.changes || []).join(",") || row.freshness_status}; re-read current source before using compact memory.`),
                `Receipt: mention gate ${gateId}, each read_plan_id, and "current source verified" in memoryUsed; if not used, mention the read_plan_id in memoryIgnored with the reason.`,
            ].join("\n")
            : verificationRows.length
                ? [
                    "Compact read plan verification recommended:",
                    sessionBinding?.task_agent_session_id ? `- session_binding=${sessionBinding.task_agent_session_id}; native=${sessionBinding.native_session_id || "pending"}; turn=${sessionBinding.turn || 0}.` : "",
                    ...verificationRows.slice(0, 6).map((row) => `- read_plan_id=${row.read_plan_id}; ${row.type}; ${row.displayPath || row.path}; fingerprint missing; verify current source before using.`),
                    `Receipt: mention gate ${gateId} and the read_plan_id in memoryUsed/memoryIgnored.`,
                ].join("\n")
                : "",
    };
    return {
        ...gate,
        context_budget: (0, context_budget_1.buildContextBudget)({ context: gate, maxChars: 9000, maxTokens: 24_000 }),
    };
}
function buildGroupMemorySourceManifest(groupId, input = {}) {
    const generatedAt = String(input.generatedAt || input.generated_at || new Date().toISOString());
    const groupSessionId = String(input.groupSessionId || input.group_session_id || "default");
    const typedMemoryScopeId = groupSessionId === "default" ? groupId : `${groupId}--${groupSessionId}`;
    const typedSync = input.typedMemorySync || input.typed_memory_sync || {};
    const typedIndex = typedSync.index || typedSync || {};
    const typedDocs = Array.isArray(input.typedDocs || input.typed_docs)
        ? (input.typedDocs || input.typed_docs)
        : Array.isArray(typedIndex.docs) ? typedIndex.docs : [];
    const baseEntries = [
        (0, group_memory_shared_1.buildGroupMemorySourceEntry)("group_memory", (0, group_memory_storage_1.getGroupMemoryFile)(groupId, groupSessionId), "group_memory_json"),
        (0, group_memory_shared_1.buildGroupMemorySourceEntry)("group_messages", (0, group_memory_shared_1.getGroupMessagesFileHint)(groupId, groupSessionId), "raw_group_messages_json"),
        (0, group_memory_shared_1.buildGroupMemorySourceEntry)("typed_memory_dir", typedIndex.dir || (0, group_memory_index_1.getGroupTypedMemoryDir)(typedMemoryScopeId), "typed_memory_directory"),
        (0, group_memory_shared_1.buildGroupMemorySourceEntry)("typed_memory_index", typedIndex.file || path.join((0, group_memory_index_1.getGroupTypedMemoryDir)(typedMemoryScopeId), "MEMORY.md"), "typed_memory_entrypoint"),
    ];
    if (input.distillationLedgerFile || input.distillation_ledger_file || input.typedLogDistillation?.ledgerFile) {
        baseEntries.push((0, group_memory_shared_1.buildGroupMemorySourceEntry)("typed_memory_distillation_ledger", input.distillationLedgerFile || input.distillation_ledger_file || input.typedLogDistillation?.ledgerFile, "typed_memory_distillation_ledger"));
    }
    if (input.recallLedgerFile || input.recall_ledger_file || input.typedMemoryLedger?.file) {
        baseEntries.push((0, group_memory_shared_1.buildGroupMemorySourceEntry)("typed_memory_recall_ledger", input.recallLedgerFile || input.recall_ledger_file || input.typedMemoryLedger?.file, "typed_memory_recall_ledger"));
    }
    if (input.globalAgentMemoryFile || input.global_agent_memory_file || input.globalAgentMemoryRecall?.file) {
        baseEntries.push((0, group_memory_shared_1.buildGroupMemorySourceEntry)("global_agent_memory", input.globalAgentMemoryFile || input.global_agent_memory_file || input.globalAgentMemoryRecall?.file, "global_agent_memory_json"));
    }
    if (input.globalMemoryArbitrationLedgerFile || input.global_memory_arbitration_ledger_file || (input.globalMemoryArbitrationLedger?.file && Number(input.globalMemoryArbitrationLedger?.entryCount || 0) > 0)) {
        baseEntries.push((0, group_memory_shared_1.buildGroupMemorySourceEntry)("global_memory_arbitration_ledger", input.globalMemoryArbitrationLedgerFile || input.global_memory_arbitration_ledger_file || input.globalMemoryArbitrationLedger?.file, "global_memory_arbitration_ledger"));
    }
    const crossGroupSuppression = input.globalAgentMemoryRecall?.crossGroupSuppression || input.global_agent_memory_recall?.crossGroupSuppression || {};
    if (input.globalMemoryCrossGroupArbitrationDir || input.global_memory_cross_group_arbitration_dir || (crossGroupSuppression.sourceDir && (Number(crossGroupSuppression.suppressedCount || 0) > 0 || Number(crossGroupSuppression.advisoryCount || 0) > 0))) {
        baseEntries.push((0, group_memory_shared_1.buildGroupMemorySourceEntry)("global_memory_cross_group_arbitration", input.globalMemoryCrossGroupArbitrationDir || input.global_memory_cross_group_arbitration_dir || crossGroupSuppression.sourceDir, "global_memory_cross_group_arbitration_ledgers"));
    }
    const docEntries = typedDocs.slice(0, 80).map((doc) => (0, group_memory_shared_1.buildGroupMemorySourceEntry)(`typed_doc:${doc.relPath || path.basename(String(doc.file || ""))}`, doc.file, "typed_memory_doc", {
        relPath: doc.relPath || path.basename(String(doc.file || "")),
        memoryType: doc.type || "",
        source: doc.source || "",
        docChecksum: doc.checksum || "",
    }));
    const entries = [...baseEntries, ...docEntries];
    const requiredIds = new Set(["group_memory", "group_messages", "typed_memory_index"]);
    const missingRequired = entries.filter(entry => requiredIds.has(entry.id) && entry.exists !== true).map(entry => entry.id);
    const generatedAtMs = Date.parse(generatedAt);
    const changedAfterManifest = Number.isFinite(generatedAtMs)
        ? entries.filter(entry => entry.exists && entry.mtimeMs > generatedAtMs + 5000).map(entry => entry.id)
        : [];
    const latestMtimeMs = entries.reduce((max, entry) => Math.max(max, Number(entry.mtimeMs || 0)), 0);
    const manifestChecksum = crypto.createHash("sha256").update(JSON.stringify(entries.map(entry => ({
        id: entry.id,
        path: entry.path,
        exists: entry.exists,
        bytes: entry.bytes,
        mtimeMs: entry.mtimeMs,
        checksum: entry.checksum,
    })))).digest("hex").slice(0, 24);
    const status = missingRequired.length ? "missing_required_source" : changedAfterManifest.length ? "changed_after_context_build" : "pass";
    return {
        schema: "ccm-group-memory-source-manifest-v1",
        version: group_memory_shared_1.GROUP_MEMORY_SOURCE_MANIFEST_VERSION,
        groupId,
        groupSessionId,
        generatedAt,
        status,
        pass: status === "pass",
        sourceOrder: [
            "group_memory_json",
            "raw_group_messages_json",
            "typed_MEMORY.md_entrypoint",
            "typed_memory_docs",
            "global_agent_memory_json",
            "global_memory_arbitration_ledger",
            "global_memory_cross_group_arbitration_ledgers",
            "recall_and_distillation_ledgers",
        ],
        entryCount: entries.length,
        typedDocCount: typedDocs.length,
        includedTypedDocCount: docEntries.length,
        requiredIds: [...requiredIds],
        missingRequired,
        changedAfterManifest,
        latestMtimeMs,
        latestMtime: latestMtimeMs ? new Date(latestMtimeMs).toISOString() : "",
        manifestChecksum,
        entries,
    };
}
function readGroupPostCompactCandidateUsageLedger(groupId, sessionId = "") {
    const file = getGroupPostCompactCandidateUsageLedgerFile(groupId, sessionId);
    try {
        const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
        return {
            ...parsed,
            file,
            stats: parsed?.stats && typeof parsed.stats === "object" ? parsed.stats : {},
            entries: Array.isArray(parsed?.entries) ? parsed.entries : [],
            totals: parsed?.totals && typeof parsed.totals === "object" ? parsed.totals : {},
        };
    }
    catch {
        return {
            schema: "ccm-group-post-compact-candidate-usage-ledger-v1",
            version: group_memory_shared_1.GROUP_MEMORY_POST_COMPACT_CANDIDATE_USAGE_LEDGER_VERSION,
            groupId,
            groupSessionId: String(sessionId || "default"),
            file,
            stats: {},
            entries: [],
            totals: { used: 0, ignored: 0, verified: 0, mentioned: 0, total: 0 },
            updatedAt: "",
        };
    }
}
function writeGroupPostCompactCandidateUsageLedger(groupId, ledger, sessionId = "") {
    const file = getGroupPostCompactCandidateUsageLedgerFile(groupId, sessionId);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const entries = (Array.isArray(ledger.entries) ? ledger.entries : []).slice(-240);
    const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, JSON.stringify({
        schema: "ccm-group-post-compact-candidate-usage-ledger-v1",
        version: group_memory_shared_1.GROUP_MEMORY_POST_COMPACT_CANDIDATE_USAGE_LEDGER_VERSION,
        groupId,
        groupSessionId: String(sessionId || "default"),
        stats: ledger.stats || {},
        entries,
        totals: ledger.totals || { used: 0, ignored: 0, verified: 0, mentioned: 0, total: 0 },
        updatedAt: ledger.updatedAt || new Date().toISOString(),
    }, null, 2), "utf-8");
    fs.renameSync(temp, file);
}
function readGroupApiMicrocompactNativeApplyProofLedger(groupId, sessionId = "") {
    const file = getGroupApiMicrocompactNativeApplyProofLedgerFile(groupId, sessionId);
    try {
        const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
        return {
            ...parsed,
            file,
            stats: parsed?.stats && typeof parsed.stats === "object" ? parsed.stats : {},
            entries: Array.isArray(parsed?.entries) ? parsed.entries : [],
            totals: parsed?.totals && typeof parsed.totals === "object" ? parsed.totals : {},
        };
    }
    catch {
        return {
            schema: "ccm-group-api-microcompact-native-apply-proof-ledger-v1",
            version: group_memory_shared_1.GROUP_API_MICROCOMPACT_NATIVE_APPLY_PROOF_LEDGER_VERSION,
            groupId,
            groupSessionId: String(sessionId || "default"),
            file,
            stats: {},
            entries: [],
            totals: { verified: 0, failed: 0, advisory: 0, not_supported: 0, native_claims: 0, total: 0 },
            updatedAt: "",
        };
    }
}
function writeGroupApiMicrocompactNativeApplyProofLedger(groupId, ledger, sessionId = "") {
    const file = getGroupApiMicrocompactNativeApplyProofLedgerFile(groupId, sessionId);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const entries = (Array.isArray(ledger.entries) ? ledger.entries : []).slice(-320);
    const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, JSON.stringify({
        schema: "ccm-group-api-microcompact-native-apply-proof-ledger-v1",
        version: group_memory_shared_1.GROUP_API_MICROCOMPACT_NATIVE_APPLY_PROOF_LEDGER_VERSION,
        groupId,
        groupSessionId: String(sessionId || "default"),
        stats: ledger.stats || {},
        entries,
        totals: ledger.totals || { verified: 0, failed: 0, advisory: 0, not_supported: 0, native_claims: 0, total: 0 },
        updatedAt: ledger.updatedAt || new Date().toISOString(),
    }, null, 2), "utf-8");
    fs.renameSync(temp, file);
}
function readGroupApiMicrocompactNativeApplyRequestTelemetryLedger(groupId, sessionId = "") {
    const file = getGroupApiMicrocompactNativeApplyRequestTelemetryLedgerFile(groupId, sessionId);
    try {
        const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
        return {
            ...parsed,
            file,
            stats: parsed?.stats && typeof parsed.stats === "object" ? parsed.stats : {},
            entries: Array.isArray(parsed?.entries) ? parsed.entries : [],
            totals: parsed?.totals && typeof parsed.totals === "object" ? parsed.totals : {},
        };
    }
    catch {
        return {
            schema: "ccm-group-api-microcompact-native-apply-request-telemetry-ledger-v1",
            version: group_memory_shared_1.GROUP_API_MICROCOMPACT_NATIVE_APPLY_REQUEST_TELEMETRY_LEDGER_VERSION,
            groupId,
            groupSessionId: String(sessionId || "default"),
            file,
            stats: {},
            entries: [],
            totals: { sent: 0, matched_contract: 0, invalid: 0, failed: 0, total: 0 },
            updatedAt: "",
        };
    }
}
function writeGroupApiMicrocompactNativeApplyRequestTelemetryLedger(groupId, ledger, sessionId = "") {
    const file = getGroupApiMicrocompactNativeApplyRequestTelemetryLedgerFile(groupId, sessionId);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const entries = (Array.isArray(ledger.entries) ? ledger.entries : []).slice(-320);
    const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, JSON.stringify({
        schema: "ccm-group-api-microcompact-native-apply-request-telemetry-ledger-v1",
        version: group_memory_shared_1.GROUP_API_MICROCOMPACT_NATIVE_APPLY_REQUEST_TELEMETRY_LEDGER_VERSION,
        groupId,
        groupSessionId: String(sessionId || "default"),
        stats: ledger.stats || {},
        entries,
        totals: ledger.totals || { sent: 0, matched_contract: 0, invalid: 0, failed: 0, total: 0 },
        updatedAt: ledger.updatedAt || new Date().toISOString(),
    }, null, 2), "utf-8");
    fs.renameSync(temp, file);
}
function postCompactCandidateStatsKey(row = {}, targetProject = "") {
    const candidateId = String(row.candidate_id || row.candidateId || "").trim();
    const value = (0, group_memory_shared_1.compactMemoryText)(row.value || "", 220);
    return [
        String(targetProject || row.target_project || row.targetProject || "").trim().toLowerCase(),
        candidateId || crypto.createHash("sha256").update(value).digest("hex").slice(0, 18),
    ].join("|");
}
function buildPostCompactCandidateEntry(groupId, input = {}, row = {}) {
    const usageState = (0, group_memory_shared_1.normalizePostCompactUsageState)(row.usage_state || row.usageState);
    if (!usageState)
        return null;
    const candidateId = String(row.candidate_id || row.candidateId || "").trim();
    const value = (0, group_memory_shared_1.compactMemoryText)(row.value || "", 260);
    if (!candidateId && !value)
        return null;
    const targetProject = String(row.target_project || row.targetProject || input.targetProject || input.target_project || "").trim();
    const agent = String(row.agent || input.agent || input.project || "").trim();
    const gateId = String(row.gate_id || row.gateId || input.gateId || input.gate_id || "").trim();
    const taskId = String(input.taskId || input.task_id || "").trim();
    const generatedAt = String(input.generatedAt || input.generated_at || new Date().toISOString());
    const entryCore = {
        group_id: groupId,
        group_session_id: String(input.groupSessionId || input.group_session_id || "default"),
        target_project: targetProject,
        agent,
        task_id: taskId,
        execution_id: String(input.executionId || input.execution_id || ""),
        gate_id: gateId,
        candidate_id: candidateId,
        kind: String(row.kind || ""),
        value,
        sourceMessageId: String(row.sourceMessageId || row.source_message_id || ""),
        usage_state: usageState,
        direct_reference: row.direct_reference === true || row.directReference === true,
        referenced: row.referenced === true,
        receipt_status: String(input.receiptStatus || input.receipt_status || ""),
        generated_at: generatedAt,
    };
    return {
        schema: "ccm-group-post-compact-candidate-usage-entry-v1",
        entry_id: `pccu_${crypto.createHash("sha256").update(JSON.stringify(entryCore)).digest("hex").slice(0, 18)}`,
        ...entryCore,
    };
}
//# sourceMappingURL=group-compact-file-references-part-01.js.map