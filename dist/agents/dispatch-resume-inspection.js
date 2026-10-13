"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inspectDispatchResume = inspectDispatchResume;
const db_1 = require("../core/db");
const agent_runtime_adapter_1 = require("./agent-runtime-adapter");
const agent_sessions_1 = require("../tasks/agent-sessions");
const dispatch_native_session_evidence_1 = require("./dispatch-native-session-evidence");
const child_process_1 = require("child_process");
/** Frozen dispatches require captured Provider evidence, not an arbitrary
 * nonempty Session string. Legacy runtime inspection remains compatible. */
async function inspectDispatchResume(run) {
    const inspection = await inspectResumeEvidence(run);
    const store = require("./agent-run-store");
    const persisted = run.runId && store.getAgentRun(run.runId);
    if (persisted && persisted.taskId === run.taskId && persisted.runtimeId === run.runtimeId)
        store.appendAgentRunEvent(run.runId, { eventType: "runtime.resume_inspected",
            payload: { resumable: inspection.resumable, nativeSessionValid: inspection.nativeSessionValid, workspaceValid: inspection.workspaceValid,
                runtimeVersionCompatible: inspection.runtimeVersionCompatible, reason: inspection.reason },
            idempotencyKey: `resume-inspection:${run.runId}:${run.leaseVersion}:${run.updatedAt}:${inspection.reason}` });
    return inspection;
}
async function inspectResumeEvidence(run) {
    const task = (0, db_1.loadTasks)().find(row => row.id === run.taskId);
    if (!task?.dispatch_profile_snapshot)
        return (0, agent_runtime_adapter_1.getAgentRuntimeAdapter)(run.runtimeId).inspectResume(run);
    const session = (0, agent_sessions_1.listTaskAgentSessions)({ taskId: run.taskId }).find(row => row.id === run.taskAgentSessionId && row.nativeSessionId === run.nativeSessionId);
    const receipt = session && (0, agent_sessions_1.readTaskAgentMemoryContextDeliveryReceipt)(session.memoryContextDeliveryReceiptPath || "");
    const evidence = (0, dispatch_native_session_evidence_1.readDispatchNativeSessionEvidence)(session?.nativeResumeEvidenceRef || "") || (receipt?.checksumValid ? receipt.nativeContinuationEvidence : null);
    const version = run.runtimeVersionSnapshot;
    const reason = !session || session.resumeMode !== "native" || !session.turnCount ? "native_session_unverified" : !evidence ? "provider_session_evidence_missing" : !version?.executableIdentityChecksum && !version?.semanticVersion ? "runtime_version_evidence_missing" : !run.workspaceEvidence ? "workspace_evidence_missing" : "";
    if (reason)
        return { resumable: false, nativeSessionValid: false, workspaceValid: false, runtimeVersionCompatible: false, reason };
    if (run.source === "startup_recovery") {
        const git = (0, child_process_1.spawnSync)("git", ["-C", run.workspacePath, "rev-parse", "--git-dir", "--git-common-dir"], { encoding: "utf8", windowsHide: true });
        const paths = String(git.stdout || "").trim().split(/\r?\n/);
        if (git.status !== 0 || paths.length !== 2 || paths[0] === paths[1])
            return { resumable: false, nativeSessionValid: true, workspaceValid: false, runtimeVersionCompatible: true, reason: "shared_workspace_auto_resume_disabled" };
    }
    return (0, agent_runtime_adapter_1.getAgentRuntimeAdapter)(run.runtimeId).inspectResume({ ...run, nativeContinuationEvidence: evidence, options: { ...(run.options || {}), mcpConfigPath: run.options?.mcpConfigPath || session.mcpConfigPath || "" } });
}
//# sourceMappingURL=dispatch-resume-inspection.js.map