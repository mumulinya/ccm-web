"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectCanonicalSessionMemoryTokenBasis = selectCanonicalSessionMemoryTokenBasis;
function selectCanonicalSessionMemoryTokenBasis(receipt, expected) {
    const issues = [];
    if (receipt?.schema !== "ccm-canonical-context-accounting-receipt-v2")
        issues.push("canonical_receipt_missing");
    if (receipt?.scope !== expected.scope)
        issues.push("scope_mismatch");
    if (expected.scopeId && receipt?.scopeId !== expected.scopeId)
        issues.push("scope_id_mismatch");
    if (String(receipt?.exactSessionId || "") !== String(expected.exactSessionId || ""))
        issues.push("session_mismatch");
    if (expected.generation !== undefined && Number(receipt?.generation || 0) !== Number(expected.generation || 0))
        issues.push("generation_mismatch");
    if (expected.boundaryGeneration !== undefined && Number(receipt?.boundaryGeneration || 0) !== Number(expected.boundaryGeneration || 0))
        issues.push("boundary_generation_mismatch");
    if (expected.payloadChecksum && String(receipt?.payloadChecksum || "") !== String(expected.payloadChecksum))
        issues.push("payload_checksum_mismatch");
    if (!String(receipt?.payloadChecksum || ""))
        issues.push("payload_checksum_missing");
    if (!['provider_reported', 'canonical_payload_estimate'].includes(String(receipt?.measurementSource || "")))
        issues.push("measurement_unavailable");
    if (receipt?.contentStored !== false)
        issues.push("content_storage_boundary_invalid");
    const providerTokens = Math.max(0, Math.floor(Number(receipt?.providerObservedInputTokens || 0)));
    const estimatedTokens = Math.max(0, Math.floor(Number(receipt?.estimatedInputTokens || 0)));
    const source = receipt?.measurementSource === "provider_reported" && providerTokens > 0
        ? "provider_reported"
        : "canonical_payload_estimate";
    const tokens = source === "provider_reported" ? providerTokens : estimatedTokens;
    if (tokens <= 0)
        issues.push("token_measurement_missing");
    if (issues.length)
        return { valid: false, issues, basis: null };
    const basis = {
        schema: "ccm-session-memory-token-basis-v1",
        scope: expected.scope,
        scopeId: String(expected.scopeId || receipt?.scopeId || (expected.scope === "global" ? "global" : "")),
        exactSessionId: expected.exactSessionId,
        generation: Math.max(0, Math.floor(Number(receipt?.generation || 0))),
        boundaryGeneration: Math.max(0, Math.floor(Number(receipt?.boundaryGeneration || 0))),
        payloadChecksum: String(receipt?.payloadChecksum || ""),
        tokens,
        source,
        measuredAt: String(receipt?.recordedAt || new Date().toISOString()),
        contentStored: false,
    };
    return { valid: true, issues: [], basis };
}
//# sourceMappingURL=session-memory-token-basis.js.map