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
exports.buildAgentHeartbeatContext = buildAgentHeartbeatContext;
const crypto = __importStar(require("crypto"));
const agent_governance_store_1 = require("./agent-governance-store");
function text(value) { return String(value ?? "").trim(); }
function checksum(value) { return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
function estimateTokens(value) { return Math.max(0, Math.ceil(Buffer.byteLength(JSON.stringify(value), "utf8") / 4)); }
/**
 * Builds a redacted, checksum-only context delta. Bodies and provider payloads are
 * deliberately excluded; the runtime receives the actual context through its
 * existing execution path, while the ledger stores only evidence of reuse.
 */
function buildAgentHeartbeatContext(input) {
    const previous = (0, agent_governance_store_1.getLatestAgentHeartbeatContext)(input.run.runId);
    const previousCursor = text(input.contextCursor || previous?.contextCursor);
    const activities = (0, agent_governance_store_1.listAgentActivity)({ taskId: input.run.taskId, limit: 200 })
        .filter(item => !previousCursor || item.createdAt > previousCursor)
        .map(item => ({ eventId: item.eventId, eventType: item.eventType, createdAt: item.createdAt, checksum: item.checksum }));
    const comments = (0, agent_governance_store_1.listAgentComments)({ taskId: input.run.taskId, limit: 200 })
        .filter(item => !previousCursor || item.createdAt > previousCursor)
        .map(item => ({ commentId: item.commentId, bodyChecksum: item.bodyChecksum, createdAt: item.createdAt }));
    const approvals = (0, agent_governance_store_1.listAgentApprovals)(input.run.runId)
        .filter(item => !previousCursor || item.decidedAt > previousCursor || item.requestedAt > previousCursor)
        .map(item => ({ approvalId: item.approvalId, status: item.status, actionFingerprint: item.actionFingerprint, decidedAt: item.decidedAt, requestedAt: item.requestedAt }));
    const artifacts = (0, agent_governance_store_1.listAgentRunArtifacts)(input.run.runId)
        .filter(item => !previousCursor || item.createdAt > previousCursor)
        .map(item => ({ artifactId: item.artifactId, kind: item.kind, checksum: item.checksum, createdAt: item.createdAt }));
    const dependencies = (0, agent_governance_store_1.listAgentTaskDependencies)(input.run.taskId)
        .map(item => ({ dependencyId: item.dependencyId, dependsOnTaskId: item.dependsOnTaskId, status: item.status, relation: item.relation }));
    const delta = {
        task: { taskId: input.run.taskId, runId: input.run.runId, traceId: input.run.traceId, attemptId: input.run.attemptId, status: input.run.status, updatedAt: input.run.updatedAt },
        workspace: { workspacePath: input.run.workspacePath, worktreeId: input.run.worktreeId, evidence: input.run.workspaceEvidence || {} },
        activities, comments, approvals, artifacts, dependencies,
    };
    const capturedAt = new Date().toISOString();
    const cursor = capturedAt;
    const deltaChecksum = checksum(delta);
    const baseContextChecksum = checksum({ taskId: input.run.taskId, traceId: input.run.traceId, attemptId: input.run.attemptId, runtimeId: input.run.runtimeId });
    const promptFingerprint = checksum({ previousCursor, deltaChecksum });
    const hasNativeSession = !!text(input.nativeSessionId || input.run.nativeSessionId);
    const reuseMode = hasNativeSession && input.runtimeSupportsResume !== false
        ? "native_session_delta"
        : previous && input.runtimeSupportsResume !== false
            ? "native_session_full"
            : "fresh_session";
    return (0, agent_governance_store_1.saveAgentHeartbeatContext)({
        wakeId: input.wakeId,
        runId: input.run.runId,
        nativeSessionId: text(input.nativeSessionId || input.run.nativeSessionId),
        baseContextChecksum,
        contextCursor: cursor,
        contextDeltaChecksum: deltaChecksum,
        promptFingerprint,
        promptInputTokens: Number(input.promptInputTokens ?? estimateTokens(delta)),
        promptOutputTokens: Number(input.promptOutputTokens || 0),
        reuseMode,
        capturedAt,
    });
}
//# sourceMappingURL=agent-heartbeat-context.js.map