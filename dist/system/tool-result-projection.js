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
exports.TOOL_RESULT_PROJECTION_SCHEMA = void 0;
exports.projectCompletedToolResult = projectCompletedToolResult;
exports.runToolResultProjectionSelfTest = runToolResultProjectionSelfTest;
const crypto = __importStar(require("crypto"));
const context_budget_1 = require("./context-budget");
exports.TOOL_RESULT_PROJECTION_SCHEMA = "ccm-tool-result-projection-v1";
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
/** Content-only, deterministic projection for completed historical evidence. */
function projectCompletedToolResult(value, options = {}) {
    const source = typeof value === "string" ? value : JSON.stringify(value ?? null);
    const maxChars = Math.max(512, Math.floor(Number(options.maxChars || 2_000)));
    const originalTokens = (0, context_budget_1.estimateTextTokens)(source);
    if (source.length <= maxChars)
        return { value, projected: false, originalTokens, projectedTokens: originalTokens, savedTokens: 0, sourceChecksum: hash(source), projectionVersion: 1 };
    const head = Math.max(256, Math.floor(maxChars * 0.68));
    const tail = Math.max(128, maxChars - head);
    const compactRuns = (input) => input.replace(/(.{3,80})\1{1,}/g, "$1[repeated]");
    const headText = compactRuns(source.slice(0, head));
    const tailText = compactRuns(source.slice(-tail));
    const projected = JSON.stringify({
        schema: exports.TOOL_RESULT_PROJECTION_SCHEMA,
        projection_version: 1,
        source: String(options.source || "tool_result").slice(0, 80),
        source_checksum: hash(source),
        original_tokens: originalTokens,
        omitted_chars: Math.max(0, source.length - head - tail),
        head: headText,
        tail: tailText === source.slice(0, tail) ? "[same-as-head]" : tailText,
        contentStored: false,
    });
    const projectedTokens = (0, context_budget_1.estimateTextTokens)(projected);
    return { value: projected, projected: true, originalTokens, projectedTokens, savedTokens: Math.max(0, originalTokens - projectedTokens), sourceChecksum: hash(source), projectionVersion: 1 };
}
function runToolResultProjectionSelfTest() {
    const result = projectCompletedToolResult("x".repeat(20_000), { source: "terminal" });
    return { pass: result.projected && result.savedTokens > 0 && !String(result.value).includes("contentStored: true"), result };
}
//# sourceMappingURL=tool-result-projection.js.map