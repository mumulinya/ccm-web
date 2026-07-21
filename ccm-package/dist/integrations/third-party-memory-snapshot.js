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
exports.THIRD_PARTY_MEMORY_MCP_TOOL_ALIASES = exports.THIRD_PARTY_MEMORY_SNAPSHOT_SCHEMA = void 0;
exports.validateThirdPartyMemorySnapshot = validateThirdPartyMemorySnapshot;
exports.createThirdPartyMemorySnapshot = createThirdPartyMemorySnapshot;
exports.loadThirdPartyMemorySnapshot = loadThirdPartyMemorySnapshot;
exports.getThirdPartyMemoryManifest = getThirdPartyMemoryManifest;
exports.readThirdPartySessionContext = readThirdPartySessionContext;
exports.readThirdPartyMemoryItems = readThirdPartyMemoryItems;
exports.storeThirdPartyMemorySearchItems = storeThirdPartyMemorySearchItems;
exports.inspectThirdPartyMemoryHydration = inspectThirdPartyMemoryHydration;
exports.acknowledgeThirdPartyMemoryHydration = acknowledgeThirdPartyMemoryHydration;
exports.reportThirdPartyMemoryUsage = reportThirdPartyMemoryUsage;
exports.readThirdPartyMemoryUsageReports = readThirdPartyMemoryUsageReports;
exports.mergeThirdPartyMemoryUsageIntoReceipt = mergeThirdPartyMemoryUsageIntoReceipt;
exports.buildThirdPartyMemoryBootstrap = buildThirdPartyMemoryBootstrap;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../core/utils");
const context_budget_1 = require("../system/context-budget");
const session_memory_window_1 = require("../system/session-memory-window");
exports.THIRD_PARTY_MEMORY_SNAPSHOT_SCHEMA = "ccm-third-party-memory-snapshot-v1";
exports.THIRD_PARTY_MEMORY_MCP_TOOL_ALIASES = [
    "mcp__ccm__knowledge_context__get_context_manifest",
    "mcp__ccm__knowledge_context__read_session_context",
    "mcp__ccm__knowledge_context__search_memory",
    "mcp__ccm__knowledge_context__read_memory_items",
    "mcp__ccm__knowledge_context__report_memory_usage",
    "mcp__ccm__knowledge_context__acknowledge_memory_context",
];
const SNAPSHOT_ROOT = path.join(utils_1.CCM_DIR, "third-party-memory-snapshots");
const USAGE_ROOT = path.join(utils_1.CCM_DIR, "third-party-memory-usage");
const DEFAULT_PAGE_TOKENS = 8_000;
const MAX_PAGE_TOKENS = 20_000;
const RETAIN_PER_BINDING = 20;
function canonical(value) {
    if (Array.isArray(value))
        return value.map(canonical);
    if (!value || typeof value !== "object")
        return value;
    return Object.keys(value).sort().reduce((result, key) => {
        if (value[key] !== undefined)
            result[key] = canonical(value[key]);
        return result;
    }, {});
}
function digest(value, length = 64) {
    return crypto.createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex").slice(0, length);
}
function atomicWrite(file, value) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.${crypto.randomBytes(4).toString("hex")}.tmp`;
    fs.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    fs.renameSync(temp, file);
}
function safeId(value) {
    const id = String(value || "");
    if (!/^[a-zA-Z0-9._:-]{1,180}$/.test(id))
        throw new Error("第三方记忆快照标识无效");
    return id;
}
function bindingKey(input) {
    const kind = String(input.bindingKind || input.binding_kind || "task");
    return digest(kind === "project_session"
        ? [kind, input.project, input.projectSessionId || input.project_session_id]
        : [kind, input.project, input.groupId || input.group_id, input.groupSessionId || input.group_session_id, input.taskAgentSessionId || input.task_agent_session_id], 28);
}
function bindingDir(key) {
    return path.join(SNAPSHOT_ROOT, safeId(key));
}
function snapshotFile(key, snapshotId) {
    return path.join(bindingDir(key), `${safeId(snapshotId)}.json`);
}
function ledgerFile(key, snapshotId) {
    return path.join(bindingDir(key), `${safeId(snapshotId)}.reads.json`);
}
function latestFile(key) {
    return path.join(bindingDir(key), "latest.json");
}
function messageContent(message) {
    const content = message && typeof message === "object" && Object.prototype.hasOwnProperty.call(message, "content")
        ? message.content
        : message;
    if (typeof content === "string")
        return content;
    try {
        return JSON.stringify(content);
    }
    catch {
        return String(content || "");
    }
}
function normalizeMessage(message, index) {
    return {
        id: String(message?.id || message?.uuid || message?.messageId || `message-${index}`),
        role: String(message?.role || message?.type || "message"),
        agent: String(message?.agent || message?.target || ""),
        timestamp: String(message?.timestamp || message?.created_at || message?.createdAt || ""),
        responseId: String(message?.responseId || message?.response_id || ""),
        content: messageContent(message),
    };
}
function segmentId(kind, rows, content) {
    return `mseg_${digest([kind, rows.map(row => row.id), content], 28)}`;
}
function buildMessageSegments(messagesInput, kind, pageTokens, required) {
    const messages = (Array.isArray(messagesInput) ? messagesInput : []).map(normalizeMessage);
    const rounds = (0, session_memory_window_1.buildCompleteConversationRounds)(messages);
    const segments = [];
    let selected = [];
    let selectedTokens = 0;
    const flush = () => {
        if (!selected.length)
            return;
        const content = JSON.stringify(selected);
        const tokens = (0, context_budget_1.estimateTextTokens)(content);
        segments.push({
            id: segmentId(kind, selected, content),
            kind,
            required,
            messageIds: selected.map(row => row.id),
            messageCount: selected.length,
            tokens,
            content,
            overBudget: tokens > pageTokens,
        });
        selected = [];
        selectedTokens = 0;
    };
    for (const round of rounds) {
        const normalizedRound = round.map((message, index) => normalizeMessage(message, index));
        const roundTokens = (0, context_budget_1.estimateTextTokens)(JSON.stringify(normalizedRound));
        if (selected.length && selectedTokens + roundTokens > pageTokens)
            flush();
        selected.push(...normalizedRound);
        selectedTokens += roundTokens;
        if (selectedTokens >= pageTokens)
            flush();
    }
    flush();
    return segments;
}
function normalizeMemoryItem(item, index) {
    const content = typeof item?.content === "string" ? item.content : JSON.stringify(item?.content || item || null);
    const kind = String(item?.kind || "memory");
    return {
        id: String(item?.id || `mem_${digest([kind, item?.source || "", content, index], 28)}`),
        kind,
        source: String(item?.source || "ccm"),
        required: item?.required !== false,
        stale: item?.stale === true,
        requiresVerification: item?.requiresVerification === true || item?.requires_verification === true,
        tokens: (0, context_budget_1.estimateTextTokens)(content),
        checksum: digest(content),
        content,
    };
}
function readJson(file) {
    try {
        return JSON.parse(fs.readFileSync(file, "utf8"));
    }
    catch {
        return null;
    }
}
function readLatestSnapshot(key) {
    const latest = readJson(latestFile(key));
    return latest?.snapshotId ? readJson(snapshotFile(key, latest.snapshotId)) : null;
}
function readLedger(snapshot) {
    return readJson(ledgerFile(snapshot.bindingKey, snapshot.id)) || {
        schema: "ccm-third-party-memory-read-ledger-v1",
        snapshotId: snapshot.id,
        snapshotChecksum: snapshot.checksum,
        manifestReadAt: "",
        readSegmentIds: [],
        readMemoryItemIds: [],
        searchItems: {},
        reports: [],
        acknowledgedAt: "",
    };
}
function writeLedger(snapshot, ledger) {
    atomicWrite(ledgerFile(snapshot.bindingKey, snapshot.id), {
        ...ledger,
        snapshotId: snapshot.id,
        snapshotChecksum: snapshot.checksum,
        updatedAt: new Date().toISOString(),
    });
}
function reserveReadBudget(context, ledger, tokens) {
    const budget = Math.max(0, Number(context.memoryReadBudgetTokens || 0));
    const delivered = Math.max(0, Number(ledger.deliveredTokens || 0));
    const next = delivered + Math.max(0, Number(tokens || 0));
    if (budget > 0 && next >= budget)
        throw new Error(`MCP 累计记忆读取达到模型容量门禁：${next}/${budget}`);
    ledger.deliveredTokens = next;
    return next;
}
function snapshotCore(input) {
    const { checksum, ...core } = input || {};
    return core;
}
function validateThirdPartyMemorySnapshot(snapshot) {
    const issues = [];
    if (snapshot?.schema !== exports.THIRD_PARTY_MEMORY_SNAPSHOT_SCHEMA || Number(snapshot?.version || 0) !== 1)
        issues.push("snapshot_schema_invalid");
    if (!snapshot?.id || !snapshot?.bindingKey)
        issues.push("snapshot_identity_missing");
    if (String(snapshot?.checksum || "") !== digest(snapshotCore(snapshot)))
        issues.push("snapshot_checksum_invalid");
    return { valid: issues.length === 0, issues };
}
function createThirdPartyMemorySnapshot(input) {
    const key = bindingKey(input);
    const pageTokens = Math.max(1_000, Math.min(MAX_PAGE_TOKENS, Number(input.pageTokens || DEFAULT_PAGE_TOKENS)));
    const mode = String(input.mode || "precompact_full_raw");
    const allVisibleMessages = (Array.isArray(input.messages) ? input.messages : []).map(normalizeMessage);
    const allArchiveMessages = (Array.isArray(input.archiveMessages) ? input.archiveMessages : []).map(normalizeMessage);
    const memoryItems = (Array.isArray(input.memoryItems) ? input.memoryItems : []).map(normalizeMemoryItem);
    const previous = readLatestSnapshot(key);
    const previousLedger = previous ? readLedger(previous) : null;
    const sameLineage = previous
        && previousLedger?.acknowledgedAt
        && String(previous.provider || "") === String(input.provider || "")
        && (!String(previous.nativeSessionId || "")
            || String(previous.nativeSessionId || "") === String(input.nativeSessionId || input.native_session_id || ""))
        && Number(previous.nativeGeneration || 0) === Number(input.nativeGeneration || 0)
        && Number(previous.boundaryGeneration || 0) === Number(input.boundaryGeneration || 0)
        && String(previous.mode || "") === mode;
    const priorMessageIds = new Set(sameLineage ? previous.allMessageIds || [] : []);
    const priorMemoryChecksums = new Set(sameLineage ? previous.allMemoryChecksums || [] : []);
    const deliveryMode = sameLineage ? "delta" : "full";
    const requiredMessages = sameLineage
        ? allVisibleMessages.filter(message => !priorMessageIds.has(message.id))
        : allVisibleMessages;
    const requiredMemoryItems = memoryItems.filter(item => item.required && (!sameLineage || !priorMemoryChecksums.has(item.checksum)));
    const segments = [];
    const summaryContent = input.summary ? (typeof input.summary === "string" ? input.summary : JSON.stringify(input.summary)) : "";
    const summaryChecksum = summaryContent ? digest(summaryContent) : "";
    if (summaryContent && (!sameLineage || String(previous.summaryChecksum || "") !== summaryChecksum)) {
        segments.push({
            id: `mseg_${digest(["summary", summaryContent], 28)}`,
            kind: "summary",
            required: true,
            messageIds: [],
            messageCount: 0,
            tokens: (0, context_budget_1.estimateTextTokens)(summaryContent),
            content: summaryContent,
            overBudget: false,
        });
    }
    segments.push(...buildMessageSegments(requiredMessages, "continuity", pageTokens, true));
    segments.push(...buildMessageSegments(allArchiveMessages, "raw_archive", pageTokens, false));
    const requiredSegmentIds = segments.filter(segment => segment.required).map(segment => segment.id);
    const requiredMemoryItemIds = requiredMemoryItems.map(item => item.id);
    const requiredHydrationTokens = segments.filter(segment => segment.required).reduce((sum, segment) => sum + Number(segment.tokens || 0), 0)
        + requiredMemoryItems.reduce((sum, item) => sum + Number(item.tokens || 0), 0);
    const now = new Date().toISOString();
    const identity = {
        bindingKind: String(input.bindingKind || input.binding_kind || "task"),
        role: String(input.role || "project-child-agent"),
        project: String(input.project || ""),
        projectSessionId: String(input.projectSessionId || input.project_session_id || ""),
        groupId: String(input.groupId || input.group_id || ""),
        groupSessionId: String(input.groupSessionId || input.group_session_id || ""),
        taskId: String(input.taskId || input.task_id || ""),
        taskAgentSessionId: String(input.taskAgentSessionId || input.task_agent_session_id || ""),
    };
    const id = `mctx_${digest([key, now, input.nativeGeneration || 0, input.boundaryGeneration || 0, requiredSegmentIds, requiredMemoryItemIds], 28)}`;
    const snapshot = {
        schema: exports.THIRD_PARTY_MEMORY_SNAPSHOT_SCHEMA,
        version: 1,
        id,
        bindingKey: key,
        identity,
        mode,
        deliveryMode,
        summarySource: String(input.summarySource || input.summary_source || ""),
        summaryChecksum,
        provider: String(input.provider || ""),
        model: String(input.model || ""),
        nativeSessionId: String(input.nativeSessionId || input.native_session_id || ""),
        nativeGeneration: Number(input.nativeGeneration || input.native_generation || 0),
        boundaryGeneration: Number(input.boundaryGeneration || input.boundary_generation || 0),
        previousSnapshotId: sameLineage ? String(previous.id || "") : "",
        rehydrationRequired: !sameLineage,
        rehydrationReason: !previous ? "initial_generation" : sameLineage ? "delta_available" : "identity_or_boundary_changed",
        messageCursor: String(allVisibleMessages.at(-1)?.id || ""),
        allMessageIds: allVisibleMessages.map(message => message.id),
        allMemoryChecksums: memoryItems.map(item => item.checksum),
        segments,
        memoryItems,
        requiredSegmentIds,
        requiredMemoryItemIds,
        requiredHydrationTokens,
        pageTokens,
        modelContextWindow: Number(input.modelContextWindow || input.model_context_window || 0),
        autoCompactThreshold: Number(input.autoCompactThreshold || input.auto_compact_threshold || 0),
        requestChecksum: digest(String(input.requestText || input.request_text || "")),
        createdAt: now,
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60_000).toISOString(),
    };
    snapshot.checksum = digest(snapshotCore(snapshot));
    atomicWrite(snapshotFile(key, id), snapshot);
    atomicWrite(latestFile(key), { snapshotId: id, checksum: snapshot.checksum, updatedAt: now });
    writeLedger(snapshot, readLedger(snapshot));
    const files = fs.readdirSync(bindingDir(key))
        .filter(file => /^mctx_[a-f0-9]+\.json$/.test(file))
        .map(file => ({ file, mtimeMs: fs.statSync(path.join(bindingDir(key), file)).mtimeMs }))
        .sort((a, b) => a.mtimeMs - b.mtimeMs);
    for (const { file } of files.slice(0, Math.max(0, files.length - RETAIN_PER_BINDING))) {
        const oldId = file.slice(0, -5);
        try {
            fs.unlinkSync(path.join(bindingDir(key), file));
        }
        catch { }
        try {
            fs.unlinkSync(ledgerFile(key, oldId));
        }
        catch { }
    }
    return snapshot;
}
function loadThirdPartyMemorySnapshot(snapshotId, expectedChecksum = "") {
    const id = safeId(snapshotId);
    if (!fs.existsSync(SNAPSHOT_ROOT))
        throw new Error("第三方记忆快照不存在");
    for (const entry of fs.readdirSync(SNAPSHOT_ROOT, { withFileTypes: true })) {
        if (!entry.isDirectory())
            continue;
        const file = snapshotFile(entry.name, id);
        if (!fs.existsSync(file))
            continue;
        const snapshot = readJson(file);
        const validation = validateThirdPartyMemorySnapshot(snapshot);
        if (!validation.valid)
            throw new Error(`第三方记忆快照校验失败：${validation.issues.join(",")}`);
        if (expectedChecksum && String(snapshot.checksum) !== String(expectedChecksum))
            throw new Error("第三方记忆快照 checksum 不匹配");
        if (Date.parse(snapshot.expiresAt || "") <= Date.now())
            throw new Error("第三方记忆快照已过期");
        return snapshot;
    }
    throw new Error("第三方记忆快照不存在");
}
function assertSnapshotContext(snapshot, context) {
    const identity = snapshot.identity || {};
    for (const [field, actual] of [
        ["project", context.project],
        ["projectSessionId", context.projectSessionId],
        ["groupId", context.groupId],
        ["groupSessionId", context.groupSessionId],
        ["taskAgentSessionId", context.taskAgentSessionId],
    ]) {
        if (String(identity[field] || "") !== String(actual || ""))
            throw new Error(`第三方记忆快照作用域不匹配：${field}`);
    }
}
function getThirdPartyMemoryManifest(context) {
    const snapshot = loadThirdPartyMemorySnapshot(context.memorySnapshotId, context.memorySnapshotChecksum);
    assertSnapshotContext(snapshot, context);
    const ledger = readLedger(snapshot);
    ledger.manifestReadAt = ledger.manifestReadAt || new Date().toISOString();
    writeLedger(snapshot, ledger);
    return {
        schema: "ccm-third-party-memory-manifest-v1",
        snapshotId: snapshot.id,
        snapshotChecksum: snapshot.checksum,
        mode: snapshot.mode,
        deliveryMode: snapshot.deliveryMode,
        rehydrationRequired: snapshot.rehydrationRequired,
        rehydrationReason: snapshot.rehydrationReason,
        boundaryGeneration: snapshot.boundaryGeneration,
        nativeGeneration: snapshot.nativeGeneration,
        requiredHydrationTokens: snapshot.requiredHydrationTokens,
        messageCursor: snapshot.messageCursor,
        requiredSegmentIds: snapshot.requiredSegmentIds,
        requiredMemoryItemIds: snapshot.requiredMemoryItemIds,
        sessionSegments: snapshot.segments.map((segment) => ({ id: segment.id, kind: segment.kind, required: segment.required, tokens: segment.tokens, messageCount: segment.messageCount, overBudget: segment.overBudget })),
        memoryItems: snapshot.memoryItems.map((item) => ({ id: item.id, kind: item.kind, source: item.source, required: item.required, tokens: item.tokens, stale: item.stale, requiresVerification: item.requiresVerification })),
    };
}
function readThirdPartySessionContext(context, input = {}) {
    const snapshot = loadThirdPartyMemorySnapshot(context.memorySnapshotId, context.memorySnapshotChecksum);
    assertSnapshotContext(snapshot, context);
    const view = String(input.view || "continuity");
    if (!['continuity', 'raw_archive'].includes(view))
        throw new Error("会话上下文视图无效");
    const candidates = snapshot.segments.filter((segment) => view === "raw_archive" ? segment.kind === "raw_archive" : segment.kind !== "raw_archive");
    const cursor = Math.max(0, Number(input.cursor || 0));
    const maxTokens = Math.max(1_000, Math.min(MAX_PAGE_TOKENS, Number(input.max_tokens || input.maxTokens || DEFAULT_PAGE_TOKENS)));
    const selected = [];
    let tokens = 0;
    let index = cursor;
    while (index < candidates.length) {
        const segment = candidates[index];
        if (selected.length && tokens + Number(segment.tokens || 0) > maxTokens)
            break;
        selected.push(segment);
        tokens += Number(segment.tokens || 0);
        index += 1;
        if (tokens >= maxTokens)
            break;
    }
    const ledger = readLedger(snapshot);
    reserveReadBudget(context, ledger, tokens);
    ledger.readSegmentIds = [...new Set([...(ledger.readSegmentIds || []), ...selected.map(segment => segment.id)])];
    writeLedger(snapshot, ledger);
    return {
        success: true,
        snapshotId: snapshot.id,
        snapshotChecksum: snapshot.checksum,
        view,
        cursor,
        nextCursor: index < candidates.length ? index : null,
        hasMore: index < candidates.length,
        tokens,
        segments: selected.map(segment => ({ ...segment, content: JSON.parse(segment.content) })),
    };
}
function readThirdPartyMemoryItems(context, ids) {
    const snapshot = loadThirdPartyMemorySnapshot(context.memorySnapshotId, context.memorySnapshotChecksum);
    assertSnapshotContext(snapshot, context);
    const requested = [...new Set((Array.isArray(ids) ? ids : []).map(String))].slice(0, 24);
    const ledger = readLedger(snapshot);
    const searchItems = Object.values(ledger.searchItems || {});
    const pool = [...snapshot.memoryItems, ...searchItems];
    const items = requested.map(id => pool.find((item) => item.id === id)).filter(Boolean);
    if (items.length !== requested.length)
        throw new Error("记忆条目不存在或不属于当前快照");
    const totalTokens = items.reduce((sum, item) => sum + Number(item.tokens || (0, context_budget_1.estimateTextTokens)(item.content)), 0);
    if (totalTokens > 20_000)
        throw new Error("本次记忆读取超过 20K token，请减少条目数量");
    reserveReadBudget(context, ledger, totalTokens);
    ledger.readMemoryItemIds = [...new Set([...(ledger.readMemoryItemIds || []), ...items.map((item) => item.id)])];
    writeLedger(snapshot, ledger);
    return { success: true, snapshotId: snapshot.id, snapshotChecksum: snapshot.checksum, totalTokens, items };
}
function storeThirdPartyMemorySearchItems(context, itemsInput) {
    const snapshot = loadThirdPartyMemorySnapshot(context.memorySnapshotId, context.memorySnapshotChecksum);
    assertSnapshotContext(snapshot, context);
    const items = (Array.isArray(itemsInput) ? itemsInput : []).slice(0, 12).map(normalizeMemoryItem);
    const ledger = readLedger(snapshot);
    reserveReadBudget(context, ledger, items.reduce((sum, item) => sum + (0, context_budget_1.estimateTextTokens)(item.content.slice(0, 800)), 0));
    ledger.searchItems = { ...(ledger.searchItems || {}), ...Object.fromEntries(items.map(item => [item.id, item])) };
    writeLedger(snapshot, ledger);
    return items.map(item => ({ id: item.id, kind: item.kind, source: item.source, tokens: item.tokens, stale: item.stale, requiresVerification: item.requiresVerification, preview: item.content.slice(0, 800) }));
}
function inspectThirdPartyMemoryHydration(context) {
    const snapshot = loadThirdPartyMemorySnapshot(context.memorySnapshotId, context.memorySnapshotChecksum);
    assertSnapshotContext(snapshot, context);
    const ledger = readLedger(snapshot);
    const missingSegmentIds = snapshot.requiredSegmentIds.filter((id) => !(ledger.readSegmentIds || []).includes(id));
    const missingMemoryItemIds = snapshot.requiredMemoryItemIds.filter((id) => !(ledger.readMemoryItemIds || []).includes(id));
    return {
        ready: !!ledger.manifestReadAt && !missingSegmentIds.length && !missingMemoryItemIds.length,
        manifestRead: !!ledger.manifestReadAt,
        missingSegmentIds,
        missingMemoryItemIds,
        snapshot,
        ledger,
    };
}
function acknowledgeThirdPartyMemoryHydration(context) {
    const hydration = inspectThirdPartyMemoryHydration(context);
    if (!hydration.ready)
        throw new Error(`必需记忆尚未读取完成：segments=${hydration.missingSegmentIds.join(",") || "none"}; memory=${hydration.missingMemoryItemIds.join(",") || "none"}`);
    const ledger = hydration.ledger;
    ledger.acknowledgedAt = new Date().toISOString();
    writeLedger(hydration.snapshot, ledger);
    return { snapshot: hydration.snapshot, ledger };
}
function reportThirdPartyMemoryUsage(context, input = {}) {
    const snapshot = loadThirdPartyMemorySnapshot(context.memorySnapshotId, context.memorySnapshotChecksum);
    assertSnapshotContext(snapshot, context);
    if (String(input.snapshotId || input.snapshot_id || "") !== snapshot.id || String(input.snapshotChecksum || input.snapshot_checksum || "") !== snapshot.checksum) {
        throw new Error("记忆使用报告未绑定当前快照");
    }
    const cleanIds = (value) => [...new Set((Array.isArray(value) ? value : []).map(String).filter(Boolean))].slice(0, 80);
    const candidateUpdates = (Array.isArray(input.candidateUpdates || input.candidate_updates) ? input.candidateUpdates || input.candidate_updates : []).slice(0, 20);
    const acceptedCandidates = [];
    const rejectedCandidates = [];
    for (const candidate of candidateUpdates) {
        const content = String(candidate?.content || candidate?.decision || candidate?.summary || "").trim();
        const sourceMessageIds = cleanIds(candidate?.sourceMessageIds || candidate?.source_message_ids);
        const evidence = cleanIds(candidate?.evidence || candidate?.files || candidate?.verification);
        const normalized = { kind: String(candidate?.kind || "candidate"), content: content.slice(0, 4000), sourceMessageIds, evidence };
        if (!normalized.content || (!sourceMessageIds.length && !evidence.length))
            rejectedCandidates.push({ ...normalized, reason: "source_or_evidence_required" });
        else
            acceptedCandidates.push({ ...normalized, id: `mcand_${digest([snapshot.id, normalized], 28)}` });
    }
    const core = {
        schema: "ccm-third-party-memory-usage-report-v1",
        version: 1,
        id: `musage_${digest([snapshot.id, Date.now(), input], 28)}`,
        at: new Date().toISOString(),
        snapshotId: snapshot.id,
        snapshotChecksum: snapshot.checksum,
        identity: snapshot.identity,
        usedIds: cleanIds(input.usedIds || input.used_ids),
        ignoredIds: cleanIds(input.ignoredIds || input.ignored_ids),
        verifiedIds: cleanIds(input.verifiedIds || input.verified_ids),
        conflicts: (Array.isArray(input.conflicts) ? input.conflicts : []).map((item) => String(item).slice(0, 1200)).slice(0, 20),
        acceptedCandidates,
        rejectedCandidates,
        status: "candidate_only_pending_existing_acceptance",
    };
    const report = { ...core, checksum: digest(core) };
    atomicWrite(path.join(USAGE_ROOT, `${safeId(report.id)}.json`), report);
    const ledger = readLedger(snapshot);
    ledger.reports = [...(ledger.reports || []), report.id].slice(-20);
    writeLedger(snapshot, ledger);
    return report;
}
function readThirdPartyMemoryUsageReports(snapshotId, snapshotChecksum = "") {
    if (!fs.existsSync(USAGE_ROOT))
        return [];
    return fs.readdirSync(USAGE_ROOT).filter(file => file.endsWith(".json")).flatMap(file => {
        const report = readJson(path.join(USAGE_ROOT, file));
        if (String(report?.snapshotId || "") !== String(snapshotId || ""))
            return [];
        if (snapshotChecksum && String(report?.snapshotChecksum || "") !== String(snapshotChecksum))
            return [];
        const { checksum, ...core } = report || {};
        if (String(checksum || "") !== digest(core))
            return [];
        return [report];
    }).sort((a, b) => String(a.at || "").localeCompare(String(b.at || "")));
}
function mergeThirdPartyMemoryUsageIntoReceipt(receiptInput, snapshotId, snapshotChecksum = "") {
    const receipt = receiptInput && typeof receiptInput === "object" ? { ...receiptInput } : receiptInput;
    if (!receipt || !snapshotId)
        return receipt;
    const reports = readThirdPartyMemoryUsageReports(snapshotId, snapshotChecksum);
    if (!reports.length)
        return receipt;
    const projectMemory = { ...(receipt.projectMemory || receipt.project_memory || {}) };
    const targetKey = {
        constraint: "constraints",
        decision: "decisions",
        fact: "facts",
        lesson: "lessons",
        risk: "risks",
        open_item: "openItems",
        contract: "contracts",
    };
    for (const report of reports) {
        for (const candidate of report.acceptedCandidates || []) {
            const key = targetKey[String(candidate.kind || "")] || "facts";
            projectMemory[key] = [...(Array.isArray(projectMemory[key]) ? projectMemory[key] : []), {
                    content: candidate.content,
                    evidence: candidate.evidence,
                    reason: `第三方 Agent 记忆候选；sourceMessages=${(candidate.sourceMessageIds || []).join(",")}`,
                }];
        }
    }
    return {
        ...receipt,
        projectMemory,
        memoryUsed: [...new Set([...(receipt.memoryUsed || receipt.memory_used || []), ...reports.flatMap(report => report.usedIds || [])])],
        memoryIgnored: [...new Set([...(receipt.memoryIgnored || receipt.memory_ignored || []), ...reports.flatMap(report => report.ignoredIds || [])])],
        memoryMcpUsageReports: reports.map(report => ({ id: report.id, checksum: report.checksum, snapshotId: report.snapshotId })),
    };
}
function buildThirdPartyMemoryBootstrap(snapshot, challenge) {
    return [
        "【CCM 第三方 Agent 记忆加载】",
        `- snapshot=${snapshot.id}`,
        `- checksum=${snapshot.checksum}`,
        `- mode=${snapshot.mode}; delivery=${snapshot.deliveryMode}; required_tokens=${snapshot.requiredHydrationTokens}`,
        `- boundary_generation=${snapshot.boundaryGeneration}; native_generation=${snapshot.nativeGeneration}`,
        "- 执行任务前依次调用 ccm__knowledge_context/get_context_manifest、read_session_context 和 read_memory_items，直到所有 required 项读取完成。",
        `- 然后调用 ccm__knowledge_context/acknowledge_memory_context：challenge_id=${challenge?.challenge_id || ""}，snapshot_id=${snapshot.id}，snapshot_checksum=${snapshot.checksum}。`,
        "- 未完成确认不得修改代码或提交交付；需要旧边界原文时使用 read_session_context(view=raw_archive)。",
    ].join("\n");
}
//# sourceMappingURL=third-party-memory-snapshot.js.map