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
exports.calculateContextSourceBudget = calculateContextSourceBudget;
exports.recordContextSourceReceipts = recordContextSourceReceipts;
exports.recordSharedFileProjection = recordSharedFileProjection;
exports.markContextSourcesFromOutput = markContextSourcesFromOutput;
exports.extractStructuredContextSourceRefs = extractStructuredContextSourceRefs;
exports.promoteContextSourceReceipts = promoteContextSourceReceipts;
exports.finalizeContextSourceRun = finalizeContextSourceRun;
exports.readContextSourceContinuity = readContextSourceContinuity;
exports.buildContextSourceManifestReference = buildContextSourceManifestReference;
exports.buildContextSourceCatalog = buildContextSourceCatalog;
exports.recordContextSourceCatalog = recordContextSourceCatalog;
exports.restoreContextSources = restoreContextSources;
exports.listContextSourceCatalogEntries = listContextSourceCatalogEntries;
exports.clearContextSourceContinuity = clearContextSourceContinuity;
exports.runContextSourceContinuitySelfTest = runContextSourceContinuitySelfTest;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../core/utils");
const atomic_json_file_1 = require("../core/atomic-json-file");
const context_budget_1 = require("./context-budget");
const knowledge_index_1 = require("../modules/knowledge/knowledge-index");
const knowledge_access_1 = require("../modules/knowledge/knowledge-access");
const knowledge_files_1 = require("../modules/knowledge/knowledge-files");
const shared_files_v2_1 = require("../modules/tools/shared-files-v2");
const ROOT = path.join(utils_1.CCM_DIR, "main-agent-context-source-continuity");
const EMPTY_BUDGET = Object.freeze({
    catalogTargetTokens: 0,
    catalogUsedTokens: 0,
    hydrationTargetTokens: 0,
    hydrationUsedTokens: 0,
    knowledgeTokens: 0,
    sharedFileTokens: 0,
    restoredTokens: 0,
    remainingSafeTokens: 0,
});
function hash(value) {
    return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value ?? null)).digest("hex");
}
function normalizeIdentity(input) {
    const agentKind = String(input?.agentKind || input?.scope || "");
    if (!["global", "project", "group"].includes(agentKind))
        throw new Error("context_source_identity_scope_invalid");
    const scopeId = String(input?.scopeId || input?.scope_id || "").trim();
    const exactSessionId = String(input?.exactSessionId || input?.exact_session_id || "").trim();
    if (!scopeId || !exactSessionId)
        throw new Error("context_source_identity_exact_session_required");
    return { agentKind: agentKind, scope: agentKind, scopeId, exactSessionId, generation: Math.max(0, Math.floor(Number(input?.generation || 0))) };
}
function storeFile(identityInput) {
    const identity = normalizeIdentity(identityInput);
    return path.join(ROOT, `${identity.agentKind}-${hash([identity.scopeId, identity.exactSessionId]).slice(0, 40)}.json`);
}
function emptyStore(identity) {
    return { schema: "ccm-context-source-continuity-store-v2", version: 2, identity, receipts: [], latestRestore: null, budget: { ...EMPTY_BUDGET }, updatedAt: "", contentStored: false, checksum: "" };
}
function sanitizeReceipt(input, identity) {
    const sourceKind = input?.sourceKind === "shared_file" ? "shared_file" : "knowledge";
    const core = {
        schema: "ccm-context-source-read-receipt-v2",
        version: 2,
        receiptId: String(input?.receiptId || `csr_${hash([sourceKind, input?.sourceId, input?.revision, input?.chunkIds]).slice(0, 24)}`),
        identity,
        boundaryGeneration: Math.max(0, Math.floor(Number(input?.boundaryGeneration ?? identity.generation))),
        sourceKind,
        sourceId: String(input?.sourceId || "").slice(0, 500),
        documentName: String(input?.documentName || "").slice(0, 500),
        chunkIds: Array.from(new Set((Array.isArray(input?.chunkIds) ? input.chunkIds : []).map((value) => String(value)).filter(Boolean))).slice(0, 100),
        headings: Array.from(new Set((Array.isArray(input?.headings) ? input.headings : []).map((value) => String(value)).filter(Boolean))).slice(0, 100),
        revision: String(input?.revision || "").slice(0, 300),
        checksum: String(input?.checksum || "").slice(0, 300),
        indexGeneration: String(input?.indexGeneration || "").slice(0, 300),
        scopeChecksum: String(input?.scopeChecksum || "").slice(0, 300),
        queryChecksum: String(input?.queryChecksum || (input?.query ? hash(String(input.query)) : "")).slice(0, 300),
        tokenCount: Math.max(0, Math.floor(Number(input?.tokenCount || 0))),
        state: (["discovered", "read", "injected", "used", "ignored", "promoted", "restored"].includes(String(input?.state)) ? input.state : input?.injected ? "injected" : "read"),
        discoveredAt: String(input?.discoveredAt || ""),
        readAt: String(input?.readAt || ""),
        injectedAt: String(input?.injectedAt || ""),
        usedAt: String(input?.usedAt || ""),
        promotedAt: String(input?.promotedAt || ""),
        promotionEvidence: (Array.isArray(input?.promotionEvidence) ? input.promotionEvidence : []).map((item) => ({
            memoryKind: item?.memoryKind === "group_typed_memory" ? "group_typed_memory" : "project_durable_memory",
            memoryId: String(item?.memoryId || "").slice(0, 500),
            admissionChecksum: String(item?.admissionChecksum || "").slice(0, 300),
            sourceRefChecksum: String(item?.sourceRefChecksum || "").slice(0, 300),
            promotedAt: String(item?.promotedAt || ""),
        })).filter((item) => item.memoryId && item.sourceRefChecksum).slice(-100),
        restoredAt: String(input?.restoredAt || ""),
        injected: input?.injected === true,
        used: input?.used === true,
        important: input?.important === true,
        truncated: input?.truncated === true,
        contentStored: false,
        checksumVersion: 1,
    };
    return { ...core, receiptChecksum: hash(core) };
}
function normalizeStore(value, expected) {
    if (!value || !["ccm-context-source-continuity-store-v1", "ccm-context-source-continuity-store-v2"].includes(value.schema))
        return emptyStore(expected);
    let identity;
    try {
        identity = normalizeIdentity(value.identity);
    }
    catch {
        return emptyStore(expected);
    }
    if (identity.agentKind !== expected.agentKind || identity.scopeId !== expected.scopeId || identity.exactSessionId !== expected.exactSessionId)
        return emptyStore(expected);
    const effectiveIdentity = { ...identity, generation: expected.generation };
    return {
        ...emptyStore(effectiveIdentity),
        receipts: (Array.isArray(value.receipts) ? value.receipts : []).map((row) => sanitizeReceipt(row, effectiveIdentity)).slice(-500),
        latestRestore: value.latestRestore?.schema === "ccm-post-compact-source-restore-receipt-v1" ? { ...value.latestRestore, contentStored: false } : null,
        budget: { ...EMPTY_BUDGET, ...(value.budget || {}) },
        updatedAt: String(value.updatedAt || ""),
        checksum: String(value.checksum || ""),
    };
}
function readStore(identityInput) {
    const identity = normalizeIdentity(identityInput);
    const file = storeFile(identity);
    for (const candidate of [file, `${file}.bak`]) {
        try {
            if (!fs.existsSync(candidate))
                continue;
            const value = JSON.parse(fs.readFileSync(candidate, "utf8"));
            const { checksum, ...core } = value && typeof value === "object" ? value : {};
            if (!checksum || checksum !== hash({ ...core, checksum: undefined }))
                continue;
            return normalizeStore(value, identity);
        }
        catch { }
    }
    return emptyStore(identity);
}
function writeStore(store) {
    const core = { ...store, updatedAt: new Date().toISOString(), contentStored: false, checksum: "" };
    const next = { ...core, checksum: hash({ ...core, checksum: undefined }) };
    (0, atomic_json_file_1.writeJsonAtomic)(storeFile(store.identity), next);
    return next;
}
function mutateStore(identityInput, operation) {
    const identity = normalizeIdentity(identityInput);
    return (0, atomic_json_file_1.withFileLock)(storeFile(identity), () => {
        const store = readStore(identity);
        operation(store);
        store.identity = identity;
        return writeStore(store);
    }, { timeoutMs: 30_000 });
}
function calculateContextSourceBudget(input) {
    const contextWindow = Math.max(32_000, Math.floor(Number(input.contextWindow || 200_000)));
    const catalogTargetTokens = Math.floor(contextWindow * Math.max(0.001, Number(input.catalogPercent ?? 1) / 100));
    const nominalHydration = Math.floor(contextWindow * Math.max(0.01, Number(input.hydrationPercent ?? 10) / 100));
    const remainingSafeTokens = Math.max(0, Math.floor(Number(input.remainingSafeTokens ?? contextWindow)));
    return {
        catalogTargetTokens,
        catalogUsedTokens: Math.max(0, Math.floor(Number(input.catalogUsedTokens || 0))),
        hydrationTargetTokens: Math.min(nominalHydration, remainingSafeTokens),
        hydrationUsedTokens: Math.max(0, Math.floor(Number(input.hydrationUsedTokens || 0))),
        knowledgeTokens: Math.max(0, Math.floor(Number(input.knowledgeTokens || 0))),
        sharedFileTokens: Math.max(0, Math.floor(Number(input.sharedFileTokens || 0))),
        restoredTokens: Math.max(0, Math.floor(Number(input.restoredTokens || 0))),
        remainingSafeTokens,
    };
}
function recordContextSourceReceipts(identityInput, inputs, budget) {
    const now = new Date().toISOString();
    return mutateStore(identityInput, store => {
        for (const raw of Array.isArray(inputs) ? inputs : []) {
            const receipt = sanitizeReceipt({ ...raw, readAt: raw.readAt || now, injectedAt: raw.injected ? raw.injectedAt || now : raw.injectedAt }, store.identity);
            if (!receipt.sourceId || !receipt.documentName)
                continue;
            const key = hash([receipt.sourceKind, receipt.sourceId, receipt.revision, receipt.checksum, receipt.chunkIds]);
            const index = store.receipts.findIndex(row => hash([row.sourceKind, row.sourceId, row.revision, row.checksum, row.chunkIds]) === key);
            if (index < 0)
                store.receipts.push(receipt);
            else
                store.receipts[index] = sanitizeReceipt({
                    ...store.receipts[index],
                    ...receipt,
                    used: store.receipts[index].used || receipt.used,
                    important: store.receipts[index].important || receipt.important,
                    promotionEvidence: [...store.receipts[index].promotionEvidence, ...receipt.promotionEvidence],
                }, store.identity);
        }
        store.receipts = store.receipts.slice(-500);
        const injected = store.receipts.filter(row => row.injected);
        const knowledgeTokens = injected.filter(row => row.sourceKind === "knowledge").reduce((sum, row) => sum + row.tokenCount, 0);
        const sharedFileTokens = injected.filter(row => row.sourceKind === "shared_file").reduce((sum, row) => sum + row.tokenCount, 0);
        store.budget = { ...store.budget, ...(budget || {}), knowledgeTokens, sharedFileTokens, hydrationUsedTokens: knowledgeTokens + sharedFileTokens };
    });
}
function recordSharedFileProjection(identity, projection, budget) {
    const files = new Map((projection?.files || []).map((file) => [String(file.id), file]));
    return recordContextSourceReceipts(identity, (Array.isArray(projection?.selected_chunks) ? projection.selected_chunks : []).map((chunk) => {
        const sourceId = String(chunk.file_id || "");
        const file = files.get(sourceId) || {};
        return {
            sourceKind: "shared_file",
            sourceId,
            documentName: file.name || chunk.file_name || sourceId,
            chunkIds: [chunk.chunk_id],
            revision: String(file.revision || ""),
            checksum: String(file.checksum || ""),
            tokenCount: Number(chunk.token_count || 0),
            injected: true,
            state: "injected",
            truncated: projection?.complete === false,
        };
    }), {
        sharedFileTokens: Number(projection?.total_tokens || 0),
        hydrationUsedTokens: Number(projection?.total_tokens || 0),
        ...(budget || {}),
    });
}
function markContextSourcesFromOutput(identityInput, output, _legacyPromoted = false) {
    const text = String(output || "");
    const now = new Date().toISOString();
    return mutateStore(identityInput, store => {
        store.receipts = store.receipts.map(row => {
            const matched = [row.sourceId, row.documentName, ...row.chunkIds].some(value => value && text.includes(value));
            if (!matched)
                return row;
            return sanitizeReceipt({ ...row, state: "used", used: true, usedAt: row.usedAt || now }, store.identity);
        });
    });
}
function normalizeSourceReference(input) {
    const sourceKind = input?.sourceKind === "shared_file" || input?.source_kind === "shared_file" ? "shared_file" : "knowledge";
    const sourceId = String(input?.sourceId || input?.source_id || input?.documentName || input?.document_name || input?.file_id || "").trim();
    if (!sourceId)
        return null;
    const chunkIds = Array.from(new Set([
        ...(Array.isArray(input?.chunkIds) ? input.chunkIds : []),
        ...(Array.isArray(input?.chunk_ids) ? input.chunk_ids : []),
        input?.chunkId,
        input?.chunk_id,
        input?.citation,
    ].map(value => String(value || "").trim()).filter(Boolean))).slice(0, 100);
    return {
        receiptId: String(input?.receiptId || input?.receipt_id || "").trim() || undefined,
        sourceKind,
        sourceId,
        chunkIds,
        revision: String(input?.revision || "").trim() || undefined,
        checksum: String(input?.checksum || "").trim() || undefined,
    };
}
function extractStructuredContextSourceRefs(...values) {
    const refs = [];
    const visit = (value) => {
        if (value == null)
            return;
        if (Array.isArray(value)) {
            value.forEach(visit);
            return;
        }
        if (typeof value === "object") {
            const direct = normalizeSourceReference(value);
            if (direct && (value.sourceKind || value.source_kind || value.sourceId || value.source_id || value.file_id))
                refs.push(direct);
            for (const key of ["sourceRefs", "source_refs", "contextSourceRefs", "context_source_refs", "sources", "citations", "evidence", "memoryUsed"]) {
                if (value[key] !== undefined)
                    visit(value[key]);
            }
            return;
        }
        const text = String(value);
        for (const match of text.matchAll(/\[(?:source|shared-file):([^\]#/]+)(?:[\/#]([^\]]+))?\]/g)) {
            const shared = match[0].startsWith("[shared-file:");
            const sourceId = String(match[1] || "").trim();
            const chunkSuffix = String(match[2] || "").trim();
            const chunkId = shared ? chunkSuffix : chunkSuffix ? `${sourceId}#${chunkSuffix}` : "";
            if (sourceId)
                refs.push({ sourceKind: shared ? "shared_file" : "knowledge", sourceId, chunkIds: chunkId ? [chunkId] : [] });
        }
    };
    values.forEach(visit);
    const uniqueRefs = new Map();
    for (const ref of refs)
        uniqueRefs.set(hash([ref.receiptId || "", ref.sourceKind, ref.sourceId, ref.chunkIds || [], ref.revision || "", ref.checksum || ""]), ref);
    return [...uniqueRefs.values()];
}
function promoteContextSourceReceipts(input) {
    const refs = extractStructuredContextSourceRefs(input.sourceRefs);
    const memoryId = String(input.memoryId || "").trim();
    const admissionChecksum = String(input.admissionChecksum || "").trim();
    if (!memoryId || !admissionChecksum || !refs.length)
        throw new Error("context_source_promotion_evidence_required");
    const promotedAt = new Date().toISOString();
    let matched = 0;
    let alreadyPromoted = 0;
    const unmatched = [];
    const store = mutateStore(input.identity, next => {
        for (const ref of refs) {
            const sourceRefChecksum = hash(ref);
            let refMatched = false;
            next.receipts = next.receipts.map(row => {
                const sameGeneration = row.boundaryGeneration === next.identity.generation;
                const sameReceipt = sameGeneration && !!ref.receiptId && row.receiptId === ref.receiptId;
                const requestedChunks = ref.chunkIds || [];
                const sameChunks = !requestedChunks.length || requestedChunks.every(chunkId => row.chunkIds.includes(chunkId));
                const sameSource = row.sourceKind === ref.sourceKind && row.sourceId === ref.sourceId && sameChunks;
                const sameVersion = (!ref.revision || row.revision === ref.revision) && (!ref.checksum || row.checksum === ref.checksum);
                if (!(sameReceipt || (sameGeneration && sameSource && sameVersion)))
                    return row;
                refMatched = true;
                const duplicate = row.promotionEvidence.some(item => item.memoryId === memoryId && item.sourceRefChecksum === sourceRefChecksum);
                if (duplicate) {
                    alreadyPromoted += 1;
                    return row;
                }
                matched += 1;
                return sanitizeReceipt({
                    ...row,
                    state: "promoted",
                    used: true,
                    important: true,
                    usedAt: row.usedAt || promotedAt,
                    promotedAt: row.promotedAt || promotedAt,
                    promotionEvidence: [...row.promotionEvidence, { memoryKind: input.memoryKind, memoryId, admissionChecksum, sourceRefChecksum, promotedAt }],
                }, next.identity);
            });
            if (!refMatched)
                unmatched.push(ref);
        }
    });
    return { matched, alreadyPromoted, unmatched, storeChecksum: store.checksum, contentStored: false };
}
function finalizeContextSourceRun(identityInput) {
    return mutateStore(identityInput, store => {
        store.receipts = store.receipts.map(row => row.injected && !row.used && !row.important
            ? sanitizeReceipt({ ...row, state: "ignored" }, store.identity)
            : row);
    });
}
function readContextSourceContinuity(identityInput) {
    const store = readStore(identityInput);
    return { budget: store.budget, receipts: store.receipts.slice(-100).reverse(), latestRestore: store.latestRestore };
}
function buildContextSourceManifestReference(identityInput) {
    const store = readStore(identityInput);
    const core = {
        schema: "ccm-context-source-restore-manifest-reference-v1",
        storeChecksum: store.checksum,
        receiptIds: store.receipts.filter(row => row.injected || row.used || row.important).map(row => row.receiptId).slice(-200),
        receiptCount: store.receipts.length,
        contentStored: false,
    };
    return { ...core, checksum: hash(core) };
}
function buildContextSourceCatalog(input) {
    const explicit = String(input.explicitText || "").toLowerCase();
    const recent = new Map((input.recentReceipts || []).map((row, index) => [`${row.sourceKind}:${row.sourceId}`, index]));
    const sources = [...(input.sources || [])].filter(row => row?.sourceId && row?.documentName);
    sources.sort((a, b) => {
        const ae = explicit && explicit.includes(String(a.documentName).toLowerCase()) ? 0 : 1;
        const be = explicit && explicit.includes(String(b.documentName).toLowerCase()) ? 0 : 1;
        if (ae !== be)
            return ae - be;
        const ar = recent.get(`${a.sourceKind}:${a.sourceId}`) ?? Number.MAX_SAFE_INTEGER;
        const br = recent.get(`${b.sourceKind}:${b.sourceId}`) ?? Number.MAX_SAFE_INTEGER;
        return ar - br || String(a.sourceKind).localeCompare(String(b.sourceKind)) || String(a.documentName).localeCompare(String(b.documentName), "zh-CN");
    });
    const maxTokens = Math.max(1, Math.floor(Number(input.maxTokens || 1)));
    const lines = ["[CCM 可用上下文来源目录；正文按需读取]"];
    let usedTokens = (0, context_budget_1.estimateTextTokens)(lines[0]);
    let included = 0;
    const includedSources = [];
    for (const source of sources) {
        const line = `- ${source.sourceKind}:${source.sourceId} | ${String(source.documentName).slice(0, 250)} | revision=${source.revision || "unknown"}`;
        const tokens = (0, context_budget_1.estimateTextTokens)(line);
        if (usedTokens + tokens > maxTokens)
            continue;
        lines.push(line);
        usedTokens += tokens;
        included += 1;
        includedSources.push(source);
    }
    if (included < sources.length)
        lines.push(`- 其余 ${sources.length - included} 个来源已延迟；使用知识检索或共享文件读取工具按 ID 获取。`);
    return { context: lines.join("\n"), usedTokens: (0, context_budget_1.estimateTextTokens)(lines.join("\n")), included, deferred: sources.length - included, total: sources.length, includedSources, checksum: hash(sources.map(row => [row.sourceKind, row.sourceId, row.revision, row.checksum])) };
}
function recordContextSourceCatalog(identity, catalog, budget) {
    return recordContextSourceReceipts(identity, (catalog?.includedSources || []).map((source) => ({ ...source, state: "discovered", discoveredAt: new Date().toISOString(), injected: false, tokenCount: 0 })), { catalogUsedTokens: Number(catalog?.usedTokens || 0), ...(budget || {}) });
}
function truncatePreservingEdges(body, maxTokens) {
    if ((0, context_budget_1.estimateTextTokens)(body) <= maxTokens)
        return { body, tokens: (0, context_budget_1.estimateTextTokens)(body), truncated: false };
    const marker = "\n\n[来源内容已按 CCM 压缩后恢复预算截断]\n\n";
    let low = 0;
    let high = body.length;
    let selected = marker.trim();
    while (low <= high) {
        const keep = Math.floor((low + high) / 2);
        const head = Math.ceil(keep * 0.7);
        const candidate = `${body.slice(0, head).trimEnd()}${marker}${body.slice(-(keep - head)).trimStart()}`.trim();
        if ((0, context_budget_1.estimateTextTokens)(candidate) <= maxTokens) {
            selected = candidate;
            low = keep + 1;
        }
        else
            high = keep - 1;
    }
    return { body: selected, tokens: (0, context_budget_1.estimateTextTokens)(selected), truncated: true };
}
function restoreContextSources(input) {
    const store = readStore(input.identity);
    const explicit = String(input.explicitText || "").toLowerCase();
    const maxPerItem = Math.max(1, Math.floor(Number(input.maxPerItemTokens || 5_000)));
    const maxTotal = Math.max(0, Math.min(Number(input.maxTotalTokens || 25_000), Number(input.hydrationTargetTokens || 0), Number(input.remainingSafeTokens || 0)));
    const rawCandidates = store.identity.generation > 0
        ? store.receipts.filter(row => (row.injected || row.used || row.important) && row.boundaryGeneration < store.identity.generation)
        : [];
    const groupedCandidates = new Map();
    for (const row of rawCandidates) {
        const key = `${row.sourceKind}:${row.sourceId}`;
        const previous = groupedCandidates.get(key);
        groupedCandidates.set(key, previous ? sanitizeReceipt({
            ...(String(row.injectedAt || row.readAt).localeCompare(String(previous.injectedAt || previous.readAt)) >= 0 ? row : previous),
            chunkIds: [...previous.chunkIds, ...row.chunkIds],
            headings: [...previous.headings, ...row.headings],
            tokenCount: previous.tokenCount + row.tokenCount,
            injected: previous.injected || row.injected,
            used: previous.used || row.used,
            important: previous.important || row.important,
            truncated: previous.truncated || row.truncated,
        }, store.identity) : row);
    }
    const candidates = Array.from(groupedCandidates.values());
    candidates.sort((a, b) => {
        const ae = explicit && [a.documentName, a.sourceId, ...a.chunkIds].some(value => explicit.includes(String(value).toLowerCase())) ? 0 : 1;
        const be = explicit && [b.documentName, b.sourceId, ...b.chunkIds].some(value => explicit.includes(String(value).toLowerCase())) ? 0 : 1;
        return ae - be || Number(b.important) - Number(a.important) || Number(b.used) - Number(a.used) || String(b.injectedAt || b.readAt).localeCompare(String(a.injectedAt || a.readAt));
    });
    const restored = [];
    const dropped = [];
    const sections = [];
    let used = 0;
    const metadata = (0, knowledge_files_1.loadKnowledgeMetadata)();
    const indexGeneration = String((0, knowledge_index_1.getKnowledgeIndexStatus)()?.activeGeneration || "");
    for (const candidate of candidates) {
        if (used >= maxTotal) {
            dropped.push({ sourceKind: candidate.sourceKind, sourceId: candidate.sourceId, documentName: candidate.documentName, reason: "total_budget_exhausted" });
            continue;
        }
        let body = "";
        let currentRevision = "";
        let currentChecksum = "";
        let drift = "none";
        try {
            if (candidate.sourceKind === "knowledge") {
                const current = metadata[candidate.documentName];
                if (!current || !input.knowledgeContext || !(0, knowledge_access_1.isKnowledgeDocumentAllowed)(current, input.knowledgeContext))
                    throw new Error("authorization_or_source_missing");
                currentRevision = String(current.version || "");
                currentChecksum = String(current.content_hash || "");
                const chunks = (0, knowledge_index_1.getKnowledgeDocumentChunks)(candidate.documentName);
                let selected = chunks.filter(chunk => candidate.chunkIds.includes(String(chunk.id)));
                if (!selected.length && candidate.headings.length)
                    selected = chunks.filter(chunk => candidate.headings.includes(String(chunk.heading || "")));
                if (!selected.length)
                    throw new Error("knowledge_chunk_missing");
                body = selected.map(chunk => `[source:${chunk.id}]\n文件：${candidate.documentName}${chunk.heading ? `；章节：${chunk.heading}` : ""}\n${chunk.text}`).join("\n\n");
                if (candidate.indexGeneration && indexGeneration && candidate.indexGeneration !== indexGeneration)
                    drift = "index_generation";
            }
            else {
                const scope = candidate.identity.scope;
                const file = (0, shared_files_v2_1.readSharedFileV2)(scope, candidate.identity.scopeId, candidate.sourceId);
                if (!file)
                    throw new Error("authorization_or_source_missing");
                currentRevision = String(file.revision || "");
                currentChecksum = String(file.checksum || "");
                const selected = candidate.chunkIds.map(chunkId => (0, shared_files_v2_1.readSharedFileChunkV2)(scope, candidate.identity.scopeId, candidate.sourceId, chunkId)).filter(Boolean);
                body = selected.length ? selected.map(item => `[shared-file:${item.file_id}/${item.chunk.id}]\n文件：${item.file_name}\n${item.content}`).join("\n\n") : String(file.content || "");
                if (!body)
                    throw new Error("shared_file_content_missing");
            }
            if (currentRevision !== candidate.revision)
                drift = "revision";
            else if (currentChecksum !== candidate.checksum)
                drift = "checksum";
            const clipped = truncatePreservingEdges(body, Math.min(maxPerItem, maxTotal - used));
            if (!clipped.tokens)
                throw new Error("item_budget_exhausted");
            sections.push(`## 恢复来源：${candidate.documentName}\n${clipped.body}`);
            used += clipped.tokens;
            restored.push({ sourceKind: candidate.sourceKind, sourceId: candidate.sourceId, documentName: candidate.documentName, tokens: clipped.tokens, truncated: clipped.truncated, drift });
        }
        catch (error) {
            dropped.push({ sourceKind: candidate.sourceKind, sourceId: candidate.sourceId, documentName: candidate.documentName, reason: String(error?.message || error) });
        }
    }
    const status = !candidates.length ? "not_required" : restored.length === candidates.length ? "restored" : restored.length ? "partial" : "rejected";
    const receiptCore = { schema: "ccm-post-compact-source-restore-receipt-v1", version: 1, identity: normalizeIdentity(input.identity), status, budget: { maxPerItemTokens: maxPerItem, maxTotalTokens: maxTotal, hydrationTargetTokens: Math.max(0, Number(input.hydrationTargetTokens || 0)), restoredTokens: used, remainingSafeTokens: Math.max(0, Number(input.remainingSafeTokens || 0) - used) }, restored, dropped, restoredAt: new Date().toISOString(), contentStored: false };
    const receipt = { ...receiptCore, checksum: hash(receiptCore) };
    mutateStore(input.identity, next => {
        next.latestRestore = receipt;
        next.budget = { ...next.budget, restoredTokens: used, remainingSafeTokens: receipt.budget.remainingSafeTokens };
        next.receipts = next.receipts.map(row => restored.some(item => item.sourceKind === row.sourceKind && item.sourceId === row.sourceId)
            ? sanitizeReceipt({ ...row, boundaryGeneration: next.identity.generation, state: "restored", restoredAt: receipt.restoredAt, readAt: receipt.restoredAt, injectedAt: receipt.restoredAt, injected: true }, next.identity)
            : row);
    });
    return { context: sections.join("\n\n"), receipt };
}
function listContextSourceCatalogEntries(input) {
    const shared = input.sharedScope && input.sharedScopeId
        ? (0, shared_files_v2_1.listSharedFilesV2)(input.sharedScope, input.sharedScopeId).map((file) => ({ sourceKind: "shared_file", sourceId: file.id, documentName: file.name, revision: String(file.revision || ""), checksum: file.checksum || "", readable: file.readable === true }))
        : [];
    const metadata = (0, knowledge_files_1.loadKnowledgeMetadata)();
    const knowledge = input.knowledgeContext ? Object.entries(metadata).filter(([, value]) => (0, knowledge_access_1.isKnowledgeDocumentAllowed)(value, input.knowledgeContext)).map(([filename, value]) => ({ sourceKind: "knowledge", sourceId: filename, documentName: filename, revision: String(value.version || ""), checksum: value.content_hash || "", readable: value.parse_status !== "failed" })) : [];
    return [...shared, ...knowledge];
}
function clearContextSourceContinuity(identityInput) {
    const file = storeFile(identityInput);
    return (0, atomic_json_file_1.withFileLock)(file, () => {
        let removed = false;
        for (const candidate of [file, `${file}.bak`]) {
            try {
                if (fs.existsSync(candidate)) {
                    fs.unlinkSync(candidate);
                    removed = true;
                }
            }
            catch { }
        }
        return removed;
    }, { timeoutMs: 30_000 });
}
function runContextSourceContinuitySelfTest() {
    const suffix = crypto.randomBytes(5).toString("hex");
    const identity = { agentKind: "project", scope: "project", scopeId: `source-selftest-${suffix}`, exactSessionId: `session-${suffix}`, generation: 1 };
    const budgets = [32_000, 200_000, 516_000].map(contextWindow => calculateContextSourceBudget({ contextWindow, catalogPercent: 1, hydrationPercent: 10, remainingSafeTokens: contextWindow }));
    const catalog = buildContextSourceCatalog({
        maxTokens: budgets[1].catalogTargetTokens,
        explicitText: "beta.md",
        sources: [
            { sourceKind: "knowledge", sourceId: "alpha.md", documentName: "alpha.md", revision: "1", checksum: "a" },
            { sourceKind: "shared_file", sourceId: "file-beta", documentName: "beta.md", revision: "2", checksum: "b" },
        ],
    });
    const preCompactIdentity = { ...identity, generation: 0 };
    const sharedName = `source-selftest-${suffix}.txt`;
    let sharedId = "";
    try {
        recordContextSourceReceipts(preCompactIdentity, [{ sourceKind: "knowledge", sourceId: "alpha.md", documentName: "alpha.md", chunkIds: ["alpha.md#0"], revision: "1", checksum: "a", tokenCount: 120, injected: true, state: "injected", content: "MUST_NOT_PERSIST", text: "MUST_NOT_PERSIST" }], budgets[1]);
        recordContextSourceReceipts(preCompactIdentity, [{ sourceKind: "knowledge", sourceId: "alpha.md", documentName: "alpha.md", chunkIds: ["alpha.md#0"], revision: "1", checksum: "a", tokenCount: 120, injected: true, state: "injected", body: "MUST_NOT_PERSIST" }]);
        markContextSourcesFromOutput(preCompactIdentity, "结论来自 [source:alpha.md#0]");
        const shared = (0, shared_files_v2_1.upsertSharedTextV2)("project", identity.scopeId, sharedName, "OLD_AUTHORITATIVE_SOURCE");
        sharedId = shared.id;
        const projection = (0, shared_files_v2_1.buildSharedFilesContextV2)("project", identity.scopeId, { maxTokens: 5_000 });
        recordSharedFileProjection(preCompactIdentity, projection, budgets[1]);
        const firstRestore = restoreContextSources({ identity, knowledgeContext: { role: "project-agent", project: identity.scopeId }, maxPerItemTokens: 5_000, maxTotalTokens: 25_000, hydrationTargetTokens: 20_000, remainingSafeTokens: 20_000 });
        (0, shared_files_v2_1.upsertSharedTextV2)("project", identity.scopeId, sharedName, "NEW_AUTHORITATIVE_SOURCE");
        const driftIdentity = { ...identity, generation: 2 };
        const driftRestore = restoreContextSources({ identity: driftIdentity, knowledgeContext: { role: "project-agent", project: identity.scopeId }, maxPerItemTokens: 5_000, maxTotalTokens: 25_000, hydrationTargetTokens: 20_000, remainingSafeTokens: 20_000 });
        finalizeContextSourceRun(driftIdentity);
        const continuity = readContextSourceContinuity(driftIdentity);
        const reference = buildContextSourceManifestReference(driftIdentity);
        const serialized = JSON.stringify({ continuity, reference });
        const result = {
            pass: budgets[0].catalogTargetTokens === 320
                && budgets[0].hydrationTargetTokens === 3_200
                && budgets[1].catalogTargetTokens === 2_000
                && budgets[2].hydrationTargetTokens === 51_600
                && catalog.context.indexOf("beta.md") < catalog.context.indexOf("alpha.md")
                && continuity.receipts.length === 2
                && continuity.receipts.some(row => row.sourceId === "alpha.md" && row.used === true)
                && continuity.receipts.every(row => row.contentStored === false)
                && !serialized.includes("MUST_NOT_PERSIST")
                && reference.contentStored === false
                && firstRestore.context.includes("OLD_AUTHORITATIVE_SOURCE")
                && driftRestore.context.includes("NEW_AUTHORITATIVE_SOURCE")
                && !driftRestore.context.includes("OLD_AUTHORITATIVE_SOURCE")
                && driftRestore.receipt.restored.some(row => row.sourceId === sharedId && ["revision", "checksum"].includes(row.drift)),
            budgets,
            catalog: { included: catalog.included, deferred: catalog.deferred, usedTokens: catalog.usedTokens },
            continuity,
            reference,
        };
        return result;
    }
    finally {
        if (sharedId)
            (0, shared_files_v2_1.deleteSharedFileV2)("project", identity.scopeId, sharedId);
        clearContextSourceContinuity(identity);
    }
}
//# sourceMappingURL=main-agent-context-source-continuity.js.map