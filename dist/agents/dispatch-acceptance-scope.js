"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditDispatchAcceptanceScope = auditDispatchAcceptanceScope;
const dispatch_profile_1 = require("./dispatch-profile");
const agent_run_store_1 = require("./agent-run-store");
const crypto_1 = require("crypto");
const acceptance_workspace_1 = require("./acceptance-workspace");
/** Scope authorization extends paths, never acceptance outcomes/checks. The
 * immutable approval event must attest the exact request fingerprint. */
function auditDispatchAcceptanceScope(task, contract, projectId, workItemId, before, after, original) {
    if (!task.dispatch_profile_snapshot)
        return original;
    const item = contract.workItems.find(row => row.id === workItemId && row.projectId === projectId);
    if (!item)
        return original;
    const approved = (task.scope_expansion_requests || []).filter((request) => {
        if (request.workItemId !== workItemId || request.taskAttempt !== Number(task.execution_attempt || task.attempt || 1))
            return false;
        const run = (0, agent_run_store_1.getAgentRun)(request.runId);
        if (!run || run.taskId !== task.id || run.traceId !== task.trace_id || run.attemptId !== request.attemptId)
            return false;
        const fingerprint = (0, crypto_1.createHash)("sha256").update(JSON.stringify({ requestedPaths: request.requestedPaths, allowedChanges: request.allowedChanges, contractRevision: request.contractRevision })).digest("hex").slice(0, 24);
        return fingerprint === request.actionFingerprint && (0, agent_run_store_1.listAgentRunEvents)(run.runId).some(event => event.eventType === "scope.expansion_approved" && event.payload?.requestId === request.id && event.payload?.actionFingerprint === fingerprint && event.payload?.appliedRevision === request.appliedRevision);
    });
    const scope = (0, dispatch_profile_1.resolveDispatchScope)({ ...task, scope_expansion_requests: approved });
    scope.recommendedPaths = [...new Set([...scope.recommendedPaths, ...item.editablePaths])];
    scope.forbiddenPaths = [...new Set([...scope.forbiddenPaths, ...item.forbiddenPaths, ...item.readOnlyPaths])];
    const profile = (0, dispatch_profile_1.resolveDispatchProfileSnapshot)(task).profile;
    const violations = original.changedFiles.filter((file) => {
        const decision = (0, dispatch_profile_1.evaluateDispatchPath)(file, scope, profile, after.root);
        // Fixture synchronization is a scope exemption, never permission to write
        // credentials, dependency trees, another repository, or an invalid path.
        if (["invalid_path", "forbidden_path"].includes(decision.reason))
            return true;
        return !decision.allowed && !item.synchronizedFixturePaths.some(f => (0, acceptance_workspace_1.coveredPath)(file, f.path));
    });
    return { ...original, outOfScopeFiles: violations,
        status: before.error || after.error ? "blocked" : violations.length || original.fixtureViolations.length ? "failed" : before.mode === "git" && after.mode === "git" ? "passed" : "snapshot_only" };
}
//# sourceMappingURL=dispatch-acceptance-scope.js.map