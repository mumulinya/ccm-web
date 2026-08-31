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
exports.buildSafeGroupSourceInquiryReceipt = buildSafeGroupSourceInquiryReceipt;
const crypto = __importStar(require("crypto"));
function checksum(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
function parseOutput(value) {
    if (value && typeof value === "object")
        return value;
    try {
        return JSON.parse(String(value || ""));
    }
    catch {
        return null;
    }
}
function collectPlanningEvidence(value, rows = []) {
    if (!value || typeof value !== "object")
        return rows;
    if (value.planningEvidence?.evidenceId)
        rows.push(value.planningEvidence);
    if (Array.isArray(value))
        value.forEach(item => collectPlanningEvidence(item, rows));
    else
        Object.values(value).forEach(item => collectPlanningEvidence(item, rows));
    return rows;
}
function buildSafeGroupSourceInquiryReceipt(input) {
    const authorized = new Set((input.authorizedProjectIds || []).map(String));
    const evidence = (input.toolResults || [])
        .flatMap(row => collectPlanningEvidence(parseOutput(row?.output)))
        .filter(item => authorized.has(String(item?.project || "")))
        .map(item => ({
        evidenceId: String(item.evidenceId || ""),
        project: String(item.project || ""),
        path: String(item.path || ""),
        checksum: String(item.checksum || ""),
        from: Math.max(1, Number(item.from || 1)),
        to: Math.max(1, Number(item.to || item.from || 1)),
        contentStored: false,
    }))
        .filter(item => item.evidenceId && item.project && item.path && item.checksum);
    const unique = [...new Map(evidence.map(item => [item.evidenceId, item])).values()];
    const core = {
        schema: "ccm-group-source-inquiry-receipt-v1",
        groupId: String(input.group?.id || ""),
        exactSessionId: String(input.exactSessionId || ""),
        readDepth: input.readDepth,
        targetProjects: [...authorized].sort(),
        evidence: unique,
        findings: (input.findings || []).map(value => String(value || "").trim()).filter(Boolean).slice(0, 12),
        sufficient: unique.length > 0,
        contentStored: false,
    };
    return { ...core, checksum: checksum(core) };
}
//# sourceMappingURL=group-source-evidence-receipt.js.map