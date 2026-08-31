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
exports.TRUSTED_MEMORY_PROMPT_ENVELOPE_SCHEMA = void 0;
exports.trustedMemorySourceChecksum = trustedMemorySourceChecksum;
exports.renderTrustedMemoryPromptEnvelope = renderTrustedMemoryPromptEnvelope;
exports.verifyTrustedMemoryPromptEnvelope = verifyTrustedMemoryPromptEnvelope;
const crypto = __importStar(require("crypto"));
exports.TRUSTED_MEMORY_PROMPT_ENVELOPE_SCHEMA = "ccm-trusted-memory-prompt-envelope-v1";
function serialize(value) {
    if (typeof value === "string")
        return value;
    const seen = new WeakSet();
    return JSON.stringify(value || {}, (_key, item) => {
        if (!item || typeof item !== "object")
            return item;
        if (seen.has(item))
            return "[Circular]";
        seen.add(item);
        return item;
    });
}
function checksum(value) {
    return crypto.createHash("sha256").update(serialize(value)).digest("hex");
}
function trustedMemorySourceChecksum(memoryContext) {
    return checksum(memoryContext || {});
}
function renderTrustedMemoryPromptEnvelope(contentInput, sourceMemoryContext = contentInput) {
    const content = String(contentInput || "");
    if (!content)
        return "";
    const contentChecksum = checksum(content);
    const sourceChecksum = trustedMemorySourceChecksum(sourceMemoryContext);
    return [
        `<<<CCM_TRUSTED_MEMORY_BEGIN schema=${exports.TRUSTED_MEMORY_PROMPT_ENVELOPE_SCHEMA} checksum=${contentChecksum} source_checksum=${sourceChecksum} chars=${content.length}>>>`,
        content,
        `<<<CCM_TRUSTED_MEMORY_END checksum=${contentChecksum}>>>`,
    ].join("\n");
}
function verifyTrustedMemoryPromptEnvelope(renderedPrompt, expected = {}) {
    const prompt = String(renderedPrompt || "");
    const beginPattern = /<<<CCM_TRUSTED_MEMORY_BEGIN schema=([^\s>]+) checksum=([a-f0-9]{64}) source_checksum=([a-f0-9]{64}) chars=(\d+)>>>/g;
    const endPattern = /<<<CCM_TRUSTED_MEMORY_END checksum=([a-f0-9]{64})>>>/g;
    const begins = Array.from(prompt.matchAll(beginPattern));
    const ends = Array.from(prompt.matchAll(endPattern));
    const rawBeginCount = prompt.split("<<<CCM_TRUSTED_MEMORY_BEGIN").length - 1;
    const rawEndCount = prompt.split("<<<CCM_TRUSTED_MEMORY_END").length - 1;
    const issues = [];
    if (rawBeginCount === 0)
        issues.push("trusted_memory_envelope_missing");
    if (rawBeginCount > 1)
        issues.push("trusted_memory_envelope_begin_duplicate");
    if (rawEndCount === 0)
        issues.push("trusted_memory_envelope_end_missing");
    if (rawEndCount > 1)
        issues.push("trusted_memory_envelope_end_duplicate");
    if (rawBeginCount !== begins.length)
        issues.push("trusted_memory_envelope_begin_malformed");
    if (rawEndCount !== ends.length)
        issues.push("trusted_memory_envelope_end_malformed");
    const begin = rawBeginCount === 1 && begins.length === 1 ? begins[0] : null;
    const end = rawEndCount === 1 && ends.length === 1 ? ends[0] : null;
    let content = "";
    let contentChecksum = "";
    let sourceChecksum = "";
    let contentChars = 0;
    let startOffset = -1;
    let endOffset = -1;
    let envelopeStartOffset = -1;
    let envelopeEndOffset = -1;
    let envelopeText = "";
    if (begin && end) {
        if (String(begin[1] || "") !== exports.TRUSTED_MEMORY_PROMPT_ENVELOPE_SCHEMA)
            issues.push("trusted_memory_envelope_schema_invalid");
        const beginEnd = Number(begin.index || 0) + begin[0].length;
        const endStart = Number(end.index || 0);
        if (endStart <= beginEnd) {
            issues.push("trusted_memory_envelope_order_invalid");
        }
        else {
            startOffset = beginEnd;
            endOffset = endStart;
            envelopeStartOffset = Number(begin.index || 0);
            envelopeEndOffset = endStart + end[0].length;
            envelopeText = prompt.slice(envelopeStartOffset, envelopeEndOffset);
            content = prompt.slice(beginEnd, endStart).replace(/^\r?\n/, "").replace(/\r?\n$/, "");
            contentChecksum = checksum(content);
            sourceChecksum = String(begin[3] || "");
            contentChars = content.length;
            if (String(begin[2] || "") !== String(end[1] || ""))
                issues.push("trusted_memory_envelope_marker_checksum_mismatch");
            if (contentChecksum !== String(begin[2] || ""))
                issues.push("trusted_memory_envelope_content_checksum_invalid");
            if (Number(begin[4] || 0) !== contentChars)
                issues.push("trusted_memory_envelope_char_count_invalid");
            if (!content)
                issues.push("trusted_memory_envelope_content_missing");
            if (expected.projection !== undefined && !content.includes(String(expected.projection || "")))
                issues.push("trusted_memory_envelope_projection_mismatch");
            if (expected.sourceChecksum !== undefined && sourceChecksum !== String(expected.sourceChecksum || ""))
                issues.push("trusted_memory_envelope_source_checksum_mismatch");
        }
    }
    return {
        schema: exports.TRUSTED_MEMORY_PROMPT_ENVELOPE_SCHEMA,
        present: rawBeginCount > 0 || rawEndCount > 0,
        valid: issues.length === 0,
        issues: [...new Set(issues)],
        content,
        contentChecksum,
        sourceChecksum,
        contentChars,
        startOffset,
        endOffset,
        envelopeStartOffset,
        envelopeEndOffset,
        envelopeText,
        beginCount: begins.length,
        endCount: ends.length,
        rawBeginCount,
        rawEndCount,
    };
}
//# sourceMappingURL=trusted-memory-prompt-envelope.js.map