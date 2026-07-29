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
exports.REQUIREMENT_SOURCE_EVIDENCE_SCHEMA = exports.REQUIREMENT_SOURCE_COVERAGE_SCHEMA = exports.REQUIREMENT_SOURCE_MANIFEST_SCHEMA = void 0;
exports.sourceHash = sourceHash;
exports.chunkRequirementSource = chunkRequirementSource;
exports.buildRequirementSourceManifest = buildRequirementSourceManifest;
exports.evidenceForSource = evidenceForSource;
exports.buildRequirementCoverageReceipt = buildRequirementCoverageReceipt;
exports.attachSourceManifests = attachSourceManifests;
exports.validateSourceEvidence = validateSourceEvidence;
exports.assertRequirementPlanEvidence = assertRequirementPlanEvidence;
const crypto = __importStar(require("crypto"));
const context_budget_1 = require("../../system/context-budget");
exports.REQUIREMENT_SOURCE_MANIFEST_SCHEMA = "ccm-requirement-source-manifest-v2";
exports.REQUIREMENT_SOURCE_COVERAGE_SCHEMA = "ccm-requirement-source-coverage-receipt-v2";
exports.REQUIREMENT_SOURCE_EVIDENCE_SCHEMA = "ccm-requirement-source-evidence-v2";
function sourceHash(value) {
    const payload = Buffer.isBuffer(value) ? value : typeof value === "string" ? value : JSON.stringify(value);
    return crypto.createHash("sha256").update(payload).digest("hex");
}
function paragraphUnits(content) {
    const normalized = String(content || "").replace(/\r\n/g, "\n");
    const paragraphs = normalized.split(/\n{2,}/).map(value => value.trim()).filter(Boolean);
    if (paragraphs.length > 1)
        return paragraphs;
    return normalized.split(/\n/).map(value => value.trim()).filter(Boolean);
}
function chunkRequirementSource(content, sourceId, targetTokens = 4_000) {
    const units = paragraphUnits(content);
    const chunks = [];
    let current = "";
    for (const unit of units) {
        const unitTokens = (0, context_budget_1.estimateTextTokens)(unit);
        if (unitTokens > targetTokens) {
            if (current) {
                chunks.push(current);
                current = "";
            }
            const maxChars = Math.max(2_000, targetTokens * 3);
            for (let offset = 0; offset < unit.length; offset += maxChars)
                chunks.push(unit.slice(offset, offset + maxChars));
            continue;
        }
        const candidate = current ? `${current}\n\n${unit}` : unit;
        if (current && (0, context_budget_1.estimateTextTokens)(candidate) > targetTokens) {
            chunks.push(current);
            current = unit;
        }
        else
            current = candidate;
    }
    if (current)
        chunks.push(current);
    if (!chunks.length && content)
        chunks.push(content);
    return chunks.map((value, index) => ({
        id: `${sourceId}:chunk:${index + 1}`,
        index,
        checksum: sourceHash(value),
        token_count: (0, context_budget_1.estimateTextTokens)(value),
        char_count: value.length,
        content: value,
    }));
}
function buildRequirementSourceManifest(source) {
    const content = String(source?.content || "");
    const checksum = sourceHash(content || `${source?.status || "unknown"}:${source?.error || ""}`);
    const chunks = source?.readable && content ? chunkRequirementSource(content, String(source.id || "source")) : [];
    return {
        schema: exports.REQUIREMENT_SOURCE_MANIFEST_SCHEMA,
        version: 2,
        source_id: String(source?.id || ""),
        source_type: String(source?.source_type || "file"),
        name: String(source?.name || "附件"),
        kind: String(source?.kind || "file"),
        parser: String(source?.parser || "unknown"),
        status: String(source?.status || "failed"),
        required: source?.required !== false,
        source_checksum: checksum,
        byte_count: Math.max(0, Number(source?.size || 0)),
        char_count: content.length,
        token_count: chunks.reduce((sum, row) => sum + row.token_count, 0),
        chunk_count: chunks.length,
        chunks: chunks.map(({ content: _content, ...row }) => row),
        coverage_state: source?.readable && chunks.length ? "complete" : "blocked",
        snapshot_at: String(source?.snapshot_at || new Date().toISOString()),
        final_url: String(source?.url || ""),
        error: String(source?.error || ""),
        checksum: "",
    };
}
function evidenceForSource(source) {
    const manifest = source.manifest || buildRequirementSourceManifest(source);
    const chunkIds = (manifest.chunks || []).map((row) => String(row.id || "")).filter(Boolean);
    const base = {
        schema: exports.REQUIREMENT_SOURCE_EVIDENCE_SCHEMA,
        source_id: manifest.source_id,
        source_checksum: manifest.source_checksum,
        chunk_ids: chunkIds,
    };
    return { ...base, evidence_checksum: sourceHash(base) };
}
function buildRequirementCoverageReceipt(sources, extractionFailures = []) {
    const rows = (sources || []).map(source => {
        const manifest = source.manifest || buildRequirementSourceManifest(source);
        const failedChunks = extractionFailures.filter(id => id.startsWith(`${manifest.source_id}:chunk:`));
        const complete = manifest.coverage_state === "complete" && failedChunks.length === 0;
        return {
            source_id: manifest.source_id,
            source_checksum: manifest.source_checksum,
            required: manifest.required !== false,
            chunk_count: manifest.chunk_count,
            covered_chunk_count: complete ? manifest.chunk_count : Math.max(0, manifest.chunk_count - failedChunks.length),
            coverage_state: complete ? "complete" : manifest.chunk_count ? "partial" : "blocked",
            failed_chunk_ids: failedChunks,
        };
    });
    const blocking = rows.filter(row => row.required && row.coverage_state !== "complete");
    const base = {
        schema: exports.REQUIREMENT_SOURCE_COVERAGE_SCHEMA,
        version: 2,
        generated_at: new Date().toISOString(),
        required_source_count: rows.filter(row => row.required).length,
        covered_source_count: rows.filter(row => row.required && row.coverage_state === "complete").length,
        total_tokens: (sources || []).reduce((sum, source) => sum + Number(source?.manifest?.token_count || 0), 0),
        complete: blocking.length === 0,
        blocking_sources: blocking.map(row => row.source_id),
        sources: rows,
    };
    return { ...base, checksum: sourceHash(base) };
}
function attachSourceManifests(sources) {
    return (sources || []).map(source => {
        const manifest = buildRequirementSourceManifest(source);
        manifest.checksum = sourceHash({ ...manifest, checksum: undefined });
        return { ...source, checksum: manifest.source_checksum, manifest, evidence_v2: evidenceForSource({ ...source, manifest }) };
    });
}
function validateSourceEvidence(evidence, sources) {
    const byId = new Map((sources || []).map(source => [String(source.id || ""), source]));
    const valid = [];
    const errors = [];
    for (const row of Array.isArray(evidence) ? evidence : []) {
        const source = byId.get(String(row?.source_id || row?.sourceId || ""));
        if (!source) {
            errors.push("来源证据引用了不存在的资料");
            continue;
        }
        const expected = evidenceForSource(source);
        const chunkIds = Array.isArray(row?.chunk_ids || row?.chunkIds)
            ? (row.chunk_ids || row.chunkIds).map((value) => String(value))
            : [];
        const known = new Set(expected.chunk_ids);
        if (String(row?.source_checksum || row?.sourceChecksum || "") !== expected.source_checksum) {
            errors.push(`${source.name} 的来源checksum已失效`);
            continue;
        }
        if (!chunkIds.length || chunkIds.some((id) => !known.has(id))) {
            errors.push(`${source.name} 的来源分片证据无效`);
            continue;
        }
        const normalized = { ...expected, chunk_ids: [...new Set(chunkIds)] };
        normalized.evidence_checksum = sourceHash({ schema: normalized.schema, source_id: normalized.source_id, source_checksum: normalized.source_checksum, chunk_ids: normalized.chunk_ids });
        valid.push(normalized);
    }
    return { valid, errors, complete: errors.length === 0 };
}
function assertRequirementPlanEvidence(plan, manifests, coverageReceipt) {
    if (coverageReceipt?.complete !== true)
        throw new Error("必需资料尚未完整覆盖，不能确认执行计划");
    const byId = new Map((manifests || []).map(manifest => [String(manifest?.source_id || ""), manifest]));
    const submitted = [
        ...(Array.isArray(plan?.source_evidence_v2) ? plan.source_evidence_v2 : []),
        ...(Array.isArray(plan?.items) ? plan.items.flatMap((item) => Array.isArray(item?.source_evidence_v2) ? item.source_evidence_v2 : []) : []),
    ];
    if (byId.size && !submitted.length)
        throw new Error("执行计划缺少可核验的来源证据");
    const covered = new Set();
    for (const row of submitted) {
        const sourceId = String(row?.source_id || row?.sourceId || "");
        const manifest = byId.get(sourceId);
        if (!manifest)
            throw new Error("执行计划引用了不属于当前任务的资料");
        if (String(row?.source_checksum || row?.sourceChecksum || "") !== String(manifest.source_checksum || ""))
            throw new Error(`${manifest.name || sourceId} 的来源证据已失效`);
        const known = new Set((manifest.chunks || []).map((chunk) => String(chunk.id || "")));
        const chunkIds = Array.isArray(row?.chunk_ids || row?.chunkIds) ? (row.chunk_ids || row.chunkIds).map(String) : [];
        if (!chunkIds.length || chunkIds.some((id) => !known.has(id)))
            throw new Error(`${manifest.name || sourceId} 的分片证据无效`);
        covered.add(sourceId);
    }
    const missing = [...byId.values()].filter((manifest) => manifest.required !== false && !covered.has(String(manifest.source_id || "")));
    if (missing.length)
        throw new Error(`执行计划未引用全部必需资料：${missing.map((row) => row.name || row.source_id).join("、")}`);
    return { valid: true, covered_source_ids: [...covered], checksum: sourceHash(submitted) };
}
//# sourceMappingURL=source-evidence-v2.js.map