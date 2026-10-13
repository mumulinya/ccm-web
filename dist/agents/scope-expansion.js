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
const credential_store_1 = require("../core/credential-store");
const crypto = __importStar(require("crypto"));
const dispatch_profile_1 = require("./dispatch-profile");
function clean(value, max = 800) { return String(value ?? "").trim().slice(0, max); }
const safePath = dispatch_profile_1.normalizeDispatchPath;
function checksum(value) { return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 24); }
function createScopeExpansionRequest(input) {
    const rawPaths = Array.isArray(input?.requestedPaths) ? input.requestedPaths : [input?.path];
    const requestedPaths = rawPaths.map((value) => (0, dispatch_profile_1.canonicalDispatchPath)(String(value || ""), input?.workspacePath));
    if (requestedPaths.some(p => !p))
        throw new Error("范围扩展路径无效");
    const path = requestedPaths[0] || "";
    if (!path)
        throw new Error("范围扩展路径无效");
    const forbidden = (Array.isArray(input?.forbiddenPaths) ? input.forbiddenPaths : []).map((value) => safePath(value)).filter(Boolean);
    if (requestedPaths.some(p => !(0, dispatch_profile_1.evaluateDispatchPath)(p, { recommendedPaths: [], protectedPaths: [], forbiddenPaths: forbidden }, "light", input?.workspacePath).allowed))
        throw new Error("禁止路径不能申请范围扩展");
    const expiresMs = input?.expiresAt ? Date.parse(input.expiresAt) : Date.now() + 86400000;
    if (!Number.isFinite(expiresMs))
        throw new Error("范围申请过期时间无效");
    const now = new Date().toISOString();
    const identity = {
        taskId: clean(input?.taskId, 120), runId: clean(input?.runId, 120), traceId: clean(input?.traceId, 120),
        requestedPaths: [...new Set(requestedPaths)], reason: clean((0, credential_store_1.redactSensitiveText)(input?.reason), 1000),
        idempotencyKey: clean(input?.idempotencyKey, 300),
    };
    const base = { ...identity, path, impactSummary: clean((0, credential_store_1.redactSensitiveText)(input?.impactSummary), 1000), allowedChanges: Array.isArray(input?.allowedChanges) ? input.allowedChanges.map((v) => clean((0, credential_store_1.redactSensitiveText)(v), 300)).filter(Boolean).slice(0, 12) : [], requestedBy: clean(input?.requestedBy || "project-agent", 120), status: "pending", requestedAt: now, createdAt: now, contractRevision: Math.max(1, Math.floor(Number(input?.contractRevision || 1))) };
    if (!base.reason)
        throw new Error("范围扩展必须说明原因");
    const id = `scope_${checksum({ taskId: identity.taskId, runId: identity.runId, attemptId: input?.attemptId || "", workItemId: input?.workItemId || "", key: identity.idempotencyKey || identity })}`;
    return { id, requestId: id, ...base, attemptId: clean(input?.attemptId, 120), workItemId: clean(input?.workItemId, 120), actionFingerprint: checksum({ requestedPaths: identity.requestedPaths, allowedChanges: base.allowedChanges, contractRevision: base.contractRevision }), expiresAt: new Date(Math.min(expiresMs, Date.now() + 86400000)).toISOString(), applicationState: "pending" };
}
function approvedScopePaths(task) {
    return (0, dispatch_profile_1.resolveDispatchScope)(task).approvedPaths || [];
}
function scopeExpansionPolicy(task) {
    const policy = task?.file_change_policy || {};
    const initial = Array.isArray(policy.editablePaths) ? policy.editablePaths : (Array.isArray(policy.initialEditablePaths) ? policy.initialEditablePaths : []);
    return { ...policy, initialEditablePaths: initial, approvedExpansionPaths: (Array.isArray(task?.scope_expansion_requests) ? task.scope_expansion_requests : []).filter((r) => r?.status === "approved") };
}
//# sourceMappingURL=scope-expansion.js.map