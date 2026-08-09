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
exports.isContextSourceToolResult = isContextSourceToolResult;
exports.buildContextSourceToolResultReference = buildContextSourceToolResultReference;
exports.projectContextSourceToolResultForPersistence = projectContextSourceToolResultForPersistence;
exports.contextSourceToolResultProjectionSelfTest = contextSourceToolResultProjectionSelfTest;
const crypto = __importStar(require("crypto"));
const context_budget_1 = require("./context-budget");
const SOURCE_TOOL_NAMES = new Set([
    "query_knowledge",
    "search_knowledge",
    "read_knowledge_document",
    "read_shared_files",
    "read_global_shared_files",
    "web_fetch",
    "web_search",
]);
function checksum(value) {
    return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value ?? null)).digest("hex");
}
function clean(value, max = 500) {
    return String(value || "").trim().slice(0, max);
}
function unique(values, max = 200) {
    return [...new Set(values.map(value => clean(value)).filter(Boolean))].slice(0, max);
}
function parseValue(value) {
    if (typeof value !== "string")
        return value;
    const text = value.trim();
    if (!text || !["{", "["].includes(text[0]))
        return value;
    try {
        return JSON.parse(text);
    }
    catch {
        return value;
    }
}
function nestedCandidates(value) {
    const root = parseValue(value);
    if (!root || typeof root !== "object")
        return [root];
    return [
        root,
        parseValue(root.observation),
        parseValue(root.result),
        parseValue(root.output),
        parseValue(root.rawOutput || root.raw_output),
        parseValue(root.result?.result),
    ].filter(candidate => candidate != null);
}
function detectedToolName(toolName, value) {
    const direct = clean(toolName, 240);
    if (SOURCE_TOOL_NAMES.has(direct))
        return direct;
    const candidates = nestedCandidates(value);
    for (const candidate of candidates) {
        const names = [candidate?.toolName, candidate?.tool_name, candidate?.name, candidate?.canonicalName, candidate?.canonical_name, candidate?.tool]
            .map(item => clean(item, 240));
        const matched = names.find(name => SOURCE_TOOL_NAMES.has(name) || /(?:^|__)(search_knowledge|read_knowledge_document)$/.test(name));
        if (matched)
            return matched.includes("search_knowledge") ? "search_knowledge" : matched.includes("read_knowledge_document") ? "read_knowledge_document" : matched;
    }
    return "";
}
function knowledgeSources(candidates) {
    const rows = [];
    for (const candidate of candidates) {
        const results = [
            ...(Array.isArray(candidate?.results) ? candidate.results : []),
            ...(Array.isArray(candidate?.sourceReferences) ? candidate.sourceReferences : []),
            ...(Array.isArray(candidate?.source_references) ? candidate.source_references : []),
            ...(Array.isArray(candidate?.contextSourceRefs) ? candidate.contextSourceRefs : []),
            ...(Array.isArray(candidate?.context_source_refs) ? candidate.context_source_refs : []),
        ];
        for (const result of results) {
            const sourceKind = clean(result?.sourceKind || result?.source_kind);
            if (sourceKind && sourceKind !== "knowledge")
                continue;
            const sourceId = clean(result?.filename || result?.documentName || result?.document_name || result?.sourceId || result?.source_id);
            if (!sourceId)
                continue;
            const citation = clean(result?.citation || result?.chunkId || result?.chunk_id);
            rows.push({
                sourceKind: "knowledge",
                sourceId,
                documentName: sourceId,
                chunkIds: unique([citation]),
                revision: clean(result?.revision),
                checksum: clean(result?.checksum, 300),
                citations: unique([citation]),
                tokenCount: Math.max(0, Math.floor(Number(result?.tokenCount || result?.token_count || 0))),
            });
        }
        const filename = clean(candidate?.filename);
        if (filename) {
            const citations = unique(Array.isArray(candidate?.citations) ? candidate.citations : []);
            rows.push({
                sourceKind: "knowledge",
                sourceId: filename,
                documentName: filename,
                chunkIds: citations,
                revision: clean(candidate?.revision),
                checksum: clean(candidate?.checksum, 300),
                citations,
                tokenCount: Math.max(0, Math.floor(Number(candidate?.tokenCount || candidate?.token_count || 0))),
            });
        }
    }
    return rows;
}
function sharedFileSources(candidates) {
    const rows = [];
    for (const candidate of candidates) {
        const files = new Map((Array.isArray(candidate?.files) ? candidate.files : []).map((file) => [clean(file?.id), file]));
        for (const selected of Array.isArray(candidate?.selected_chunks) ? candidate.selected_chunks : []) {
            const sourceId = clean(selected?.file_id);
            const file = files.get(sourceId) || {};
            if (!sourceId)
                continue;
            const chunkId = clean(selected?.chunk_id);
            rows.push({
                sourceKind: "shared_file",
                sourceId,
                documentName: clean(selected?.file_name || file?.name || sourceId),
                chunkIds: unique([chunkId]),
                revision: clean(file?.revision),
                checksum: clean(file?.checksum || selected?.checksum, 300),
                citations: unique([chunkId]),
                tokenCount: Math.max(0, Math.floor(Number(selected?.token_count || 0))),
            });
        }
        const sourceId = clean(candidate?.file_id);
        if (sourceId) {
            const chunkId = clean(candidate?.chunk?.id || candidate?.chunk_id);
            rows.push({
                sourceKind: "shared_file",
                sourceId,
                documentName: clean(candidate?.file_name || sourceId),
                chunkIds: unique([chunkId]),
                revision: clean(candidate?.revision),
                checksum: clean(candidate?.checksum || candidate?.chunk?.checksum, 300),
                citations: unique([chunkId]),
                tokenCount: Math.max(0, Math.floor(Number(candidate?.tokenCount || candidate?.token_count || candidate?.chunk?.token_count || 0))),
            });
        }
        const references = [
            ...(Array.isArray(candidate?.sourceReferences) ? candidate.sourceReferences : []),
            ...(Array.isArray(candidate?.source_references) ? candidate.source_references : []),
            ...(Array.isArray(candidate?.contextSourceRefs) ? candidate.contextSourceRefs : []),
            ...(Array.isArray(candidate?.context_source_refs) ? candidate.context_source_refs : []),
        ];
        for (const reference of references) {
            const sourceKind = clean(reference?.sourceKind || reference?.source_kind);
            if (sourceKind && sourceKind !== "shared_file")
                continue;
            const referenceSourceId = clean(reference?.sourceId || reference?.source_id || reference?.file_id);
            if (!referenceSourceId || sourceKind !== "shared_file")
                continue;
            const chunkIds = unique([
                ...(Array.isArray(reference?.chunkIds) ? reference.chunkIds : []),
                ...(Array.isArray(reference?.chunk_ids) ? reference.chunk_ids : []),
                reference?.chunkId,
                reference?.chunk_id,
            ]);
            rows.push({
                sourceKind: "shared_file",
                sourceId: referenceSourceId,
                documentName: clean(reference?.documentName || reference?.document_name || reference?.file_name || referenceSourceId),
                chunkIds,
                revision: clean(reference?.revision),
                checksum: clean(reference?.checksum, 300),
                citations: unique([...(Array.isArray(reference?.citations) ? reference.citations : []), ...chunkIds]),
                tokenCount: Math.max(0, Math.floor(Number(reference?.tokenCount || reference?.token_count || 0))),
            });
        }
    }
    return rows;
}
function webSources(candidates) {
    const rows = [];
    for (const candidate of candidates) {
        const results = [candidate, ...(Array.isArray(candidate?.results) ? candidate.results : [])];
        for (const result of results) {
            const url = clean(result?.finalUrl || result?.final_url || result?.citation || result?.url, 2000);
            if (!/^https:\/\//i.test(url))
                continue;
            rows.push({ sourceKind: "web", sourceId: url, documentName: clean(result?.title || url), chunkIds: [], revision: clean(result?.publishedAt || result?.published_at), checksum: clean(result?.contentChecksum || result?.content_checksum || result?.resultChecksum, 300), citations: [url], tokenCount: Math.max(0, Math.floor(Number(result?.tokenCount || result?.token_count || 0))) });
        }
    }
    return rows;
}
function mergeSources(rows) {
    const merged = new Map();
    for (const row of rows) {
        const key = `${row.sourceKind}\0${row.sourceId}\0${row.revision}\0${row.checksum}`;
        const previous = merged.get(key);
        if (!previous)
            merged.set(key, row);
        else
            merged.set(key, {
                ...previous,
                chunkIds: unique([...(previous.chunkIds || []), ...(row.chunkIds || [])]),
                citations: unique([...(previous.citations || []), ...(row.citations || [])]),
                tokenCount: Math.max(Number(previous.tokenCount || 0), Number(row.tokenCount || 0)),
            });
    }
    return [...merged.values()].slice(0, 200);
}
function isContextSourceToolResult(toolName, value) {
    return !!detectedToolName(toolName, value);
}
function buildContextSourceToolResultReference(toolNameInput, value, query = "") {
    const toolName = detectedToolName(toolNameInput, value);
    if (!toolName)
        return null;
    const candidates = nestedCandidates(value);
    const sources = mergeSources([...knowledgeSources(candidates), ...sharedFileSources(candidates), ...webSources(candidates)]);
    let serialized = "";
    try {
        serialized = JSON.stringify(value ?? null);
    }
    catch {
        serialized = String(value ?? "");
    }
    const complete = candidates.every(candidate => candidate?.complete !== false && candidate?.has_more !== true);
    const truncated = candidates.some(candidate => candidate?.truncated === true || candidate?.complete === false || candidate?.has_more === true);
    return {
        schema: "ccm-context-source-tool-result-reference-v1",
        version: 1,
        toolName,
        sourceKinds: unique(sources.map(row => row.sourceKind), 3),
        sources,
        queryChecksum: query ? checksum(String(query)) : "",
        resultChecksum: checksum(serialized),
        tokenCount: (0, context_budget_1.estimateTextTokens)(serialized),
        truncated,
        complete,
        contentStored: false,
    };
}
function projectContextSourceToolResultForPersistence(toolName, value, query = "") {
    return buildContextSourceToolResultReference(toolName, value, query) || value;
}
function contextSourceToolResultProjectionSelfTest() {
    const sentinel = "CONTEXT_SOURCE_BODY_MUST_NOT_PERSIST";
    const knowledge = projectContextSourceToolResultForPersistence("query_knowledge", {
        context: sentinel,
        results: [{ filename: "guide.md", citation: "guide.md#0", text: sentinel, revision: "2", checksum: "abc", tokenCount: 42 }],
        citations: ["guide.md#0"],
    });
    const shared = projectContextSourceToolResultForPersistence("read_shared_files", {
        context: sentinel,
        files: [{ id: "file-1", name: "shared.md", revision: 3, checksum: "def" }],
        selected_chunks: [{ file_id: "file-1", file_name: "shared.md", chunk_id: "file-1#0", checksum: "ghi", token_count: 12 }],
        complete: true,
    });
    const ordinary = { content: sentinel };
    return {
        pass: JSON.stringify(knowledge).includes(sentinel) === false
            && JSON.stringify(shared).includes(sentinel) === false
            && projectContextSourceToolResultForPersistence("read_file", ordinary) === ordinary
            && knowledge?.contentStored === false
            && shared?.contentStored === false,
        knowledge,
        shared,
    };
}
//# sourceMappingURL=context-source-tool-result-projection.js.map