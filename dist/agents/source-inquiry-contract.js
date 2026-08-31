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
exports.buildSourceInquiryProjectReceipt = buildSourceInquiryProjectReceipt;
exports.buildSourceInquiryReceipt = buildSourceInquiryReceipt;
exports.sourceAccessRouteForScope = sourceAccessRouteForScope;
const crypto = __importStar(require("crypto"));
function uniqueStrings(value, max, itemMax = 800) {
    return Array.from(new Set((Array.isArray(value) ? value : [])
        .map(item => String(item || "").replace(/[\0\r\n\t]+/g, " ").trim().slice(0, itemMax))
        .filter(Boolean))).slice(0, max);
}
function stableChecksum(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}
function safeRelativePaths(value) {
    return uniqueStrings(value, 40, 500)
        .map(item => item.replace(/\\/g, "/").replace(/^\.\/+/, ""))
        .filter(item => !!item && !item.startsWith("/") && !/^[a-z]:\//i.test(item) && !item.split("/").includes(".."));
}
function buildSourceInquiryProjectReceipt(input) {
    const core = {
        project: String(input.project || "").trim(),
        projectSessionId: String(input.projectSessionId || "").trim(),
        readDepth: input.readDepth === "broad" ? "broad" : "focused",
        evidenceIds: uniqueStrings(input.evidenceIds, 40, 180),
        paths: safeRelativePaths(input.paths),
        findings: uniqueStrings(input.findings, 12, 1200),
        sufficient: input.sufficient === true,
        repoStateChecksum: String(input.repoStateChecksum || "").trim().slice(0, 128),
    };
    return { ...core, checksum: stableChecksum(core) };
}
function buildSourceInquiryReceipt(input) {
    const targetProjects = uniqueStrings(input.targetProjects, 12, 80);
    const projectReceipts = (Array.isArray(input.projectReceipts) ? input.projectReceipts : [])
        .filter(receipt => receipt && targetProjects.includes(String(receipt.project || "")))
        .slice(0, 12)
        .map(receipt => buildSourceInquiryProjectReceipt(receipt));
    const core = {
        schema: "ccm-source-inquiry-receipt-v1",
        requestScope: input.requestScope,
        accessRoute: input.accessRoute,
        scope: input.scope || (input.requestScope === "project" ? "project" : input.requestScope === "group" ? "group" : "global"),
        scopeId: String(input.scopeId || (input.requestScope === "global" || input.requestScope === "feishu" ? "global" : targetProjects[0] || "")).trim(),
        exactSessionId: String(input.exactSessionId || "").trim(),
        generation: Math.max(0, Math.floor(Number(input.generation || 0))),
        targetProjects,
        projectReceipts,
        sufficient: input.sufficient === true && targetProjects.length > 0
            && targetProjects.every(project => projectReceipts.some(receipt => receipt.project === project && receipt.sufficient)),
        reason: String(input.reason || "").replace(/[\0\r\n\t]+/g, " ").trim().slice(0, 1200),
        contentStored: false,
    };
    return { ...core, checksum: stableChecksum(core) };
}
function sourceAccessRouteForScope(scope) {
    if (scope === "project")
        return "project_local_tools";
    if (scope === "group")
        return "group_project_coordination";
    if (scope === "global" || scope === "feishu")
        return "global_project_delegation";
    return "none";
}
//# sourceMappingURL=source-inquiry-contract.js.map