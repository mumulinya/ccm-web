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
exports.createScopeExpansionRequest = createScopeExpansionRequest;
exports.approvedScopePaths = approvedScopePaths;
exports.scopeExpansionPolicy = scopeExpansionPolicy;
const crypto = __importStar(require("crypto"));
function clean(value, max = 800) { return String(value ?? "").trim().slice(0, max); }
function safePath(value) { const p = clean(value, 500).replace(/\\/g, "/"); return p && !p.startsWith("/") && !p.split("/").includes("..") && !/[<>:\"|?*]/.test(p) ? p : ""; }
function checksum(value) { return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 24); }
function createScopeExpansionRequest(input) {
    const path = safePath(input?.path);
    if (!path)
        throw new Error("范围扩展路径无效");
    const base = { path, reason: clean(input?.reason, 1000), allowedChanges: Array.isArray(input?.allowedChanges) ? input.allowedChanges.map((v) => clean(v, 300)).filter(Boolean).slice(0, 12) : [], requestedBy: clean(input?.requestedBy || "project-agent", 120), status: "pending", requestedAt: new Date().toISOString() };
    if (!base.reason)
        throw new Error("范围扩展必须说明原因");
    return { id: `scope_${checksum(base)}`, ...base };
}
function approvedScopePaths(task) {
    const requests = Array.isArray(task?.scope_expansion_requests) ? task.scope_expansion_requests : [];
    return requests.filter((r) => r?.status === "approved").map((r) => safePath(r.path)).filter(Boolean);
}
function scopeExpansionPolicy(task) {
    const policy = task?.file_change_policy || {};
    const initial = Array.isArray(policy.editablePaths) ? policy.editablePaths : (Array.isArray(policy.initialEditablePaths) ? policy.initialEditablePaths : []);
    return { ...policy, initialEditablePaths: initial, approvedExpansionPaths: (Array.isArray(task?.scope_expansion_requests) ? task.scope_expansion_requests : []).filter((r) => r?.status === "approved") };
}
//# sourceMappingURL=scope-expansion.js.map