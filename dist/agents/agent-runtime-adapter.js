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
exports.getAgentRuntimeRegistry = getAgentRuntimeRegistry;
exports.createCommandRuntimeAdapter = createCommandRuntimeAdapter;
exports.getAgentRuntimeAdapter = getAgentRuntimeAdapter;
const runtime_1 = require("./runtime");
const fs = __importStar(require("fs"));
const native_continuation_1 = require("./native-continuation");
const agent_run_workspace_1 = require("./agent-run-workspace");
const agent_run_secrets_1 = require("./agent-run-secrets");
class DefaultAgentRuntimeRegistry {
    adapters = new Map();
    probes = new Map();
    register(adapter) {
        const id = (0, runtime_1.normalizeAgentRuntimeId)(adapter.describe().id);
        this.adapters.set(id, adapter);
        this.probes.delete(id);
    }
    unregister(runtimeId) {
        const id = (0, runtime_1.normalizeAgentRuntimeId)(runtimeId);
        this.adapters.delete(id);
        this.probes.delete(id);
    }
    resolve(runtimeId, deps = {}) {
        const id = (0, runtime_1.normalizeAgentRuntimeId)(runtimeId);
        const registered = this.adapters.get(id);
        return registered || createCommandRuntimeAdapter(id, deps);
    }
    describe(runtimeId) {
        return this.resolve(runtimeId).describe();
    }
    async probe(runtimeId) {
        const id = (0, runtime_1.normalizeAgentRuntimeId)(runtimeId);
        const previous = this.probes.get(id);
        if (previous && Date.now() - Date.parse(previous.checkedAt) < 30_000)
            return previous;
        const descriptor = this.describe(id);
        const snapshot = (0, runtime_1.captureAgentRuntimeVersionSnapshot)(id);
        const result = {
            runtimeId: id,
            available: snapshot.status === "ok" || snapshot.status === "version_probe_failed",
            executablePath: snapshot.executablePaths?.[0] || "",
            version: snapshot.semanticVersion || snapshot.versionText || "",
            capabilities: Object.entries(descriptor.capabilities || {}).filter(([, value]) => value === true).map(([key]) => key),
            sessionResumeSupported: descriptor.capabilities.sessionResume === true,
            workspaceEditingSupported: descriptor.capabilities.nativeWorkspaceEditing === true,
            externalRunnerSupported: descriptor.capabilities.externalRunner === true,
            reason: snapshot.status === "ok" ? "runtime_available" : snapshot.status,
            checkedAt: new Date().toISOString(),
        };
        this.probes.set(id, result);
        return result;
    }
    list() {
        const ids = new Set();
        for (const id of ["codex", "claudecode", "cursor", "gemini", "opencode", "qoder"])
            ids.add(id);
        for (const id of this.adapters.keys())
            ids.add(id);
        return [...ids].map(id => this.describe(id));
    }
}
const runtimeRegistry = new DefaultAgentRuntimeRegistry();
function getAgentRuntimeRegistry() { return runtimeRegistry; }
/**
 * Command construction stays in runtime.ts. This adapter is the stable
 * boundary used by persisted AgentRun records and future remote runtimes.
 */
function createCommandRuntimeAdapter(runtimeId, deps = {}) {
    const normalized = (0, runtime_1.normalizeAgentRuntimeId)(runtimeId);
    const descriptor = (0, runtime_1.getAgentRuntime)(normalized);
    const start = async (input) => {
        const command = (0, runtime_1.buildAgentCommand)(normalized, input.messageFile, input.options || {});
        let secretEnvironment = {};
        if (input.runId)
            secretEnvironment = (0, agent_run_secrets_1.injectAgentRunSecrets)(String(input.runId)).environment;
        if (typeof deps.start !== "function") {
            return { id: `handle_${Date.now().toString(36)}`, runId: String(input.runId || ""), provider: normalized, command, secretEnvironment };
        }
        return deps.start({ ...input, command, runtimeId: normalized, secretEnvironment, options: { ...(input.options || {}), env: { ...((input.options || {}).env || {}), ...secretEnvironment } } });
    };
    return {
        describe: () => descriptor,
        buildCommand: (messageFile, options = {}) => (0, runtime_1.buildAgentCommand)(normalized, messageFile, options),
        start,
        async resume(input) {
            return start({ ...input, options: { ...(input.options || {}), resumeSession: true } });
        },
        async inspectResume(input) {
            // `taskAgentSessionId` is CCM's execution binding. It is not a Provider
            // continuation handle and must never make a native resume look safe.
            const nativeSessionValid = !!String(input.nativeSessionId || "").trim();
            const workspacePath = String(input.workspacePath || "").trim();
            const workspaceValid = !!workspacePath && fs.existsSync(workspacePath);
            const profile = (0, native_continuation_1.getNativeContinuationCapabilityProfile)(normalized);
            const expectedVersion = input.runtimeVersionSnapshot || {};
            const hasVersionEvidence = !!expectedVersion?.provider
                || !!expectedVersion?.executableIdentityChecksum
                || !!expectedVersion?.semanticVersion;
            const currentVersion = hasVersionEvidence ? (0, runtime_1.captureAgentRuntimeVersionSnapshot)(normalized) : null;
            const versionMismatch = !!expectedVersion?.provider
                && !!currentVersion
                && String(expectedVersion.provider) !== String(currentVersion.provider)
                || !!expectedVersion?.executableIdentityChecksum
                    && !!currentVersion
                    && !!currentVersion.executableIdentityChecksum
                    && String(expectedVersion.executableIdentityChecksum) !== String(currentVersion.executableIdentityChecksum)
                || !!expectedVersion?.semanticVersion
                    && !!currentVersion
                    && !!currentVersion.semanticVersion
                    && String(expectedVersion.semanticVersion) !== String(currentVersion.semanticVersion);
            const runtimeVersionCompatible = !versionMismatch;
            const expectedEvidence = input.workspaceEvidence || null;
            const workspaceEvidenceResult = expectedEvidence && workspaceValid
                ? await (0, agent_run_workspace_1.verifyAgentRunWorkspaceEvidence)({
                    runId: String(input.runId || ""),
                    workspacePath,
                    worktreeId: String(input.worktreeId || ""),
                    workspaceEvidence: expectedEvidence,
                }, expectedEvidence)
                : { valid: true, reason: expectedEvidence ? "workspace_missing" : "workspace_evidence_unobserved" };
            const continuationEvidence = input.nativeContinuationEvidence
                || input.options?.nativeContinuationEvidence
                || null;
            const providerContractValid = continuationEvidence
                ? (0, native_continuation_1.verifyNativeSessionContinuationEvidence)(continuationEvidence, {
                    provider: normalized,
                    requestedNativeSessionId: input.nativeSessionId,
                }).valid === true
                : true;
            const workspaceEvidenceValid = workspaceEvidenceResult.valid !== false;
            const resumable = nativeSessionValid
                && workspaceValid
                && workspaceEvidenceValid
                && runtimeVersionCompatible
                && providerContractValid
                && descriptor.capabilities.sessionResume !== false
                && profile.sessionResume === true;
            const reason = resumable
                ? "resume_evidence_ok"
                : !profile.sessionResume || descriptor.capabilities.sessionResume === false
                    ? "runtime_session_resume_unsupported"
                    : !nativeSessionValid
                        ? "native_session_missing"
                        : !workspaceValid
                            ? "workspace_missing"
                            : !runtimeVersionCompatible
                                ? "runtime_version_incompatible"
                                : !workspaceEvidenceValid
                                    ? workspaceEvidenceResult.reason
                                    : !providerContractValid
                                        ? "provider_contract_evidence_invalid"
                                        : "resume_evidence_insufficient";
            return {
                resumable,
                nativeSessionValid,
                workspaceValid,
                runtimeVersionCompatible,
                workspaceEvidenceValid,
                providerContractValid,
                reason,
                evidence: {
                    capabilityProfile: profile,
                    expectedRuntimeVersion: expectedVersion,
                    currentRuntimeVersion: currentVersion,
                    workspace: workspaceEvidenceResult.actual || null,
                },
            };
        },
        async cancel(input) {
            if (typeof deps.cancel === "function")
                await deps.cancel(input);
            else
                await input.handle?.cancel?.();
        },
        subscribe(handle, onEvent) {
            if (typeof deps.subscribe === "function")
                deps.subscribe(handle, onEvent);
        },
        collectUsage(result) {
            return result?.usage && typeof result.usage === "object" ? result.usage : null;
        },
    };
}
function getAgentRuntimeAdapter(runtimeId, deps = {}) {
    return runtimeRegistry.resolve(runtimeId, deps);
}
//# sourceMappingURL=agent-runtime-adapter.js.map