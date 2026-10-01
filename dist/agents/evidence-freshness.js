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
exports.repoStateFingerprint = repoStateFingerprint;
exports.evaluateEvidenceFreshness = evaluateEvidenceFreshness;
exports.operationFingerprint = operationFingerprint;
const crypto = __importStar(require("crypto"));
function repoStateFingerprint(input) { return crypto.createHash("sha256").update(JSON.stringify(input || {})).digest("hex"); }
function evaluateEvidenceFreshness(evidence, current) { if (!evidence || evidence.status === "INVALID")
    return "INVALID"; const oldState = String(evidence.repoStateFingerprint || evidence.repo_state_fingerprint || ""); const currentState = String(current?.repoStateFingerprint || current?.repo_state_fingerprint || ""); if (oldState && currentState && oldState !== currentState)
    return "STALE"; if (Number(evidence.generation || 0) && Number(current?.generation || 0) && Number(evidence.generation) !== Number(current.generation))
    return "STALE"; return "VALID"; }
function operationFingerprint(input) { const normalized = { operationType: String(input?.operationType || input?.type || ""), workItemId: String(input?.workItemId || ""), generation: Number(input?.generation || 0), repoStateFingerprint: String(input?.repoStateFingerprint || ""), arguments: input?.arguments || input?.args || {}, scope: String(input?.scope || "") }; return crypto.createHash("sha256").update(JSON.stringify(normalized, Object.keys(normalized).sort())).digest("hex"); }
//# sourceMappingURL=evidence-freshness.js.map