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
exports.registerExtensionRuntimeBinding = registerExtensionRuntimeBinding;
exports.assertExtensionRuntimeGeneration = assertExtensionRuntimeGeneration;
exports.revokeExtensionRuntimeBindings = revokeExtensionRuntimeBindings;
exports.extensionRuntimeRevocationCheck = extensionRuntimeRevocationCheck;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const extension_state_1 = require("./extension-state");
const atomic_json_file_1 = require("../core/atomic-json-file");
const root = path.join(extension_state_1.EXTENSIONS_ROOT, "runtime-bindings");
function registerExtensionRuntimeBinding(snapshot, execution = {}) {
    const identity = snapshot.scopeIdentity || {};
    if (!identity.taskId && !execution.executionId)
        return;
    fs.mkdirSync(root, { recursive: true });
    for (const entry of fs.readdirSync(root).filter(value => value.endsWith(".json"))) {
        const file = path.join(root, entry);
        const previous = JSON.parse(fs.readFileSync(file, "utf8"));
        if (previous.taskId === identity.taskId && previous.project === identity.projectName
            && (previous.taskAgentSessionId !== identity.taskAgentSessionId || previous.nativeGeneration !== identity.nativeGeneration
                || (snapshot.internalContextHash && previous.internalContextHash && previous.internalContextHash !== snapshot.internalContextHash))) {
            (0, atomic_json_file_1.writeJsonAtomic)(file, { ...previous, status: "recovery_required", revokedAt: Date.now(), reason: "任务会话已换代" });
        }
    }
    const target = path.join(root, `${(0, extension_state_1.extensionHash)([snapshot.snapshotId, identity.taskId, execution.executionId])}.json`);
    const existing = fs.existsSync(target) ? JSON.parse(fs.readFileSync(target, "utf8")) : null;
    (0, atomic_json_file_1.writeJsonAtomic)(target, {
        snapshotId: snapshot.snapshotId, taskId: identity.taskId, executionId: execution.executionId || execution.execution_id || "",
        project: identity.projectName, mcp: snapshot.configuredTools?.mcp || [], skill: snapshot.configuredTools?.skill || [],
        taskAgentSessionId: identity.taskAgentSessionId, nativeGeneration: identity.nativeGeneration,
        internalContextHash: snapshot.internalContextHash || existing?.internalContextHash || "",
        status: "ready", updatedAt: new Date().toISOString(),
    });
}
function assertExtensionRuntimeGeneration(context) {
    const bindings = fs.existsSync(root) ? fs.readdirSync(root).filter(file => file.endsWith(".json")).map(file => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"))) : [];
    if (!bindings.some(row => row.status === "ready" && row.taskId === context.taskId && row.project === context.project
        && row.taskAgentSessionId === context.taskAgentSessionId && Number(row.nativeGeneration || 0) === Number(context.nativeGeneration || 0)
        && row.internalContextHash === (0, extension_state_1.extensionHash)(String(process.env.CCM_INTERNAL_MCP_CONTEXT || "")))) {
        throw new Error("扩展代理执行会话已换代，需要重新派发");
    }
}
function revokeExtensionRuntimeBindings(members) {
    if (!fs.existsSync(root))
        return [];
    const affected = [];
    const { listActiveAgentRuns, cancelActiveAgentRun } = require("../agents/execution-kernel");
    const active = listActiveAgentRuns();
    for (const entry of fs.readdirSync(root).filter(name => name.endsWith(".json"))) {
        const file = path.join(root, entry);
        const binding = JSON.parse(fs.readFileSync(file, "utf8"));
        if (binding.status !== "ready" || !members.some(member => (binding[member.kind] || []).includes(member.name)))
            continue;
        const reason = "扩展已禁用、卸载或断开，运行配置需要重新交付";
        (0, atomic_json_file_1.writeJsonAtomic)(file, { ...binding, status: "recovery_required", revokedAt: Date.now(), reason, updatedAt: new Date().toISOString() });
        for (const run of active.filter((run) => binding.executionId ? run.executionId === binding.executionId : run.taskId === binding.taskId)) {
            cancelActiveAgentRun({ runId: run.id, cancelTask: false, reason, actor: "extension-center" });
            affected.push({ taskId: binding.taskId, executionId: run.executionId, status: "recovery_required" });
        }
    }
    return affected;
}
// File-based Runner processes observe the same persisted revocation as the server.
function extensionRuntimeRevocationCheck(taskId, executionId, meta = {}) {
    const startedAt = Date.now();
    let checkedAt = 0;
    let revoked = false;
    const prior = new Set((fs.existsSync(root) ? fs.readdirSync(root).filter(file => file.endsWith(".json")) : []).map(file => {
        const row = JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
        return `${file}:${row.revokedAt || 0}`;
    }));
    return () => {
        if (revoked || Date.now() - checkedAt < 750)
            return revoked;
        checkedAt = Date.now();
        const files = fs.existsSync(root) ? fs.readdirSync(root).filter(file => file.endsWith(".json")) : [];
        revoked = files.some(file => {
            const binding = JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
            return binding.status === "recovery_required" && Number(binding.revokedAt) >= startedAt && !prior.has(`${file}:${binding.revokedAt}`)
                && binding.taskId === taskId && (!binding.executionId || !executionId || binding.executionId === executionId)
                && (!meta.taskAgentSessionId || binding.taskAgentSessionId === meta.taskAgentSessionId)
                && (!(meta.project || meta.projectName) || binding.project === (meta.project || meta.projectName));
        });
        return revoked;
    };
}
//# sourceMappingURL=extension-runtime-bindings.js.map