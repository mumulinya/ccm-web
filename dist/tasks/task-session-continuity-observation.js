"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.observeTaskSessionContinuity = observeTaskSessionContinuity;
const agent_run_store_1 = require("../agents/agent-run-store");
const acceptance_user_projection_1 = require("../agents/acceptance-user-projection");
const native_continuation_1 = require("../agents/native-continuation");
/** Called after a real turn has returned; planned CLI arguments are not proof. */
function observeTaskSessionContinuity(session, result, next) {
    if (!session.taskId || !result.nativeContinuationEvidence)
        return;
    const verified = (0, native_continuation_1.verifyNativeSessionContinuationEvidence)(result.nativeContinuationEvidence, { provider: session.agentType, requestedNativeSessionId: session.nativeSessionId });
    if (!verified.valid || result.success === false)
        return;
    const evidence = result.nativeContinuationEvidence;
    if (evidence.runnerSuccess !== true)
        return;
    const observedAt = Date.parse(evidence.observedAt || "");
    const run = (0, agent_run_store_1.listAgentRuns)({ taskId: session.taskId, limit: 100 }).find(r => r.taskAgentSessionId === session.id
        && r.runtimeId === evidence.provider && Date.parse(r.startedAt || "") <= observedAt
        && !["failed", "cancelled"].includes(r.status)
        && (!r.finishedAt || observedAt <= Date.parse(r.finishedAt) + 10000));
    if (!run)
        return;
    if (evidence.effectiveNativeSessionId !== next.nativeSessionId)
        return;
    const runtimeIdentity = run.runtimeVersionSnapshot?.executableIdentityChecksum;
    if (runtimeIdentity && runtimeIdentity !== evidence.providerRuntimeVersionSnapshot?.executableIdentityChecksum)
        return;
    if (next.nativeSessionId)
        (0, agent_run_store_1.updateAgentRunBindings)(run.runId, { nativeSessionId: next.nativeSessionId });
    const requestedReuse = result.nativeContinuationEvidence.nativeResumeRequested === true;
    const reused = requestedReuse && result.nativeContinuationEvidence.nativeContinuationAcknowledged === true
        && session.nativeSessionId === result.nativeContinuationEvidence.effectiveNativeSessionId;
    const fresh = !requestedReuse && !!next.nativeSessionId && evidence.providerContractCurrentEvidenceVerified === true;
    (0, agent_run_store_1.appendAgentRunEvent)(run.runId, { eventType: "runtime.continuity_observed",
        payload: { reuse: reused ? "reused" : fresh ? "fresh_session" : "unverified", reason: (0, acceptance_user_projection_1.acceptanceDisplayText)(session.taskSessionContinuation?.reason), evidenceChecksum: result.nativeContinuationEvidence.evidenceChecksum },
        idempotencyKey: `continuity:${run.runId}:${result.nativeContinuationEvidence.evidenceChecksum}` });
}
//# sourceMappingURL=task-session-continuity-observation.js.map