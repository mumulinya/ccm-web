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
exports.captureDispatchReworkEvidenceSync = captureDispatchReworkEvidenceSync;
exports.captureDispatchReworkEvidence = captureDispatchReworkEvidence;
const execution_kernel_1 = require("../../agents/execution-kernel");
const unified_evidence_registry_1 = require("../../system/unified-evidence-registry");
const agent_governance_store_1 = require("../../agents/agent-governance-store");
const agent_run_store_1 = require("../../agents/agent-run-store");
const dispatch_profile_1 = require("../../agents/dispatch-profile");
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto_1 = require("crypto");
function verifiedArtifactIdentity(task, workspace) {
    const rows = (0, agent_governance_store_1.listAgentRunArtifacts)("", task.id).flatMap(artifact => {
        const run = (0, agent_run_store_1.getAgentRun)(artifact.runId);
        if (!run || run.taskId !== task.id || run.traceId !== task.trace_id || artifact.retentionStatus !== "active" || !artifact.path || !/^[a-f0-9]{64}$/.test(artifact.checksum))
            return [];
        try {
            const relative = path.relative(workspace, path.resolve(artifact.path)).replace(/\\/g, "/");
            if (!(0, dispatch_profile_1.canonicalDispatchPath)(relative, workspace))
                return [];
            const actual = (0, crypto_1.createHash)("sha256").update(fs.readFileSync(artifact.path)).digest("hex");
            return actual === artifact.checksum ? [{ kind: artifact.kind, path: relative, checksum: actual }] : [];
        }
        catch {
            return [];
        }
    });
    // IDs and creation times cannot manufacture progress by duplicating a record.
    return [...new Map(rows.map(row => [JSON.stringify(row), row])).values()].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}
function captureDispatchReworkEvidenceSync(task, workspacePath = "") {
    const execution = (0, execution_kernel_1.listExecutions)({ taskId: task.id })[0];
    const workspace = workspacePath || execution?.workspace?.worktreePath || execution?.packet?.workDir || task.worktree_path || task.workspace_path;
    if (!workspace)
        return { available: false, reason: "workspace_unobserved" };
    try {
        const git = (args) => (0, child_process_1.execFileSync)("git", ["-C", workspace, ...args], { encoding: "utf8", windowsHide: true, timeout: 5000, maxBuffer: 1024 * 1024 });
        git(["rev-parse", "HEAD"]);
        const files = [...new Set(`${git(["ls-files", "-z", "--modified", "--others", "--exclude-standard"])}${git(["diff", "--cached", "--name-only", "-z"])}`.split("\0").filter(Boolean))].sort();
        if (files.length > 200)
            return { available: false, reason: "workspace_evidence_limit" };
        const identity = (0, unified_evidence_registry_1.captureRepoStateIdentity)(workspace, files);
        const rows = files.map(file => {
            const absolute = path.resolve(workspace, file);
            const relative = path.relative(workspace, absolute);
            if (relative.startsWith("..") || path.isAbsolute(relative))
                throw new Error("文件证据越界");
            try {
                return { file, content: (0, crypto_1.createHash)("sha256").update(fs.readFileSync(absolute)).digest("hex") };
            }
            catch (error) {
                if (error.code === "ENOENT")
                    return { file, missing: true };
                throw error;
            }
        });
        // Evidence registry freshness includes mtime. Rework progress deliberately does not.
        const contentChecksum = (0, crypto_1.createHash)("sha256").update(JSON.stringify(rows)).digest("hex");
        return { available: true, ...identity, declaredFileHash: contentChecksum, contentChecksum, artifacts: verifiedArtifactIdentity(task, workspace) };
    }
    catch {
        return { available: false, reason: "workspace_evidence_unavailable" };
    }
}
/** Recompute content, including untracked files. Timestamps and model reports
 * are deliberately excluded from the no-progress identity. */
async function captureDispatchReworkEvidence(task, workspacePath = "") {
    // Every caller must hash the same representation. Switching from a Main
    // Agent review to TestAgent must not look like new workspace evidence.
    return captureDispatchReworkEvidenceSync(task, workspacePath);
}
//# sourceMappingURL=dispatch-rework-evidence.js.map