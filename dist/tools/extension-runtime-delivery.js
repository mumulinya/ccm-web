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
exports.recordExtensionRuntimeDelivery = recordExtensionRuntimeDelivery;
exports.extensionRuntimeDelivery = extensionRuntimeDelivery;
exports.retryExtensionRuntimeDelivery = retryExtensionRuntimeDelivery;
exports.deferredInstalledRuntimeDelivery = deferredInstalledRuntimeDelivery;
const path = __importStar(require("path"));
const atomic_json_file_1 = require("../core/atomic-json-file");
const credential_store_1 = require("../core/credential-store");
const extension_state_1 = require("./extension-state");
const installed_tool_catalog_1 = require("./installed-tool-catalog");
const internal_skill_catalog_1 = require("../skills/internal-skill-catalog");
const extension_runtime_bindings_1 = require("./extension-runtime-bindings");
const file = path.join(extension_state_1.EXTENSIONS_ROOT, "runtime-delivery.json");
function rows() { return (0, atomic_json_file_1.readJsonWithBackup)(file, {}); }
function recordExtensionRuntimeDelivery(input) {
    const key = (0, extension_state_1.extensionHash)([input.audit.runtime, input.workDir]);
    (0, atomic_json_file_1.withFileLock)(file, () => {
        const all = rows();
        all[key] = (0, credential_store_1.protectCredential)(`extension-delivery:${key}`, "snapshot", JSON.stringify(input));
        (0, atomic_json_file_1.writeJsonAtomic)(file, all);
    });
    const bound = Object.values(input.options?.internalMcpServers || {}).find(server => server.env?.CCM_INTERNAL_MCP_CONTEXT);
    if (bound) {
        const token = bound.env.CCM_INTERNAL_MCP_CONTEXT;
        const context = require("../integrations/internal-mcp-runtime").openInternalMcpTaskContext(token);
        if (["project-child-agent", "project-agent"].includes(context.role))
            (0, extension_runtime_bindings_1.registerExtensionRuntimeBinding)({
                snapshotId: input.audit.snapshotId, configuredTools: input.allowedTools?.configuredTools || input.allowedTools,
                internalContextHash: (0, extension_state_1.extensionHash)(token), scopeIdentity: { taskId: context.taskId, projectName: context.project,
                    taskAgentSessionId: context.taskAgentSessionId, nativeGeneration: context.nativeGeneration || 0 },
            });
    }
}
function extensionRuntimeDelivery(members) {
    return Object.entries(rows()).map(([key, ref]) => {
        const input = JSON.parse((0, credential_store_1.resolveCredential)(ref));
        const audit = input.audit;
        const included = members.every(member => (audit.requested?.[member.kind] || []).includes(member.name));
        return { id: key, runtime: audit.runtime, state: !included ? "pending" : audit.dispatch_gate?.dispatchReady === false ? "failed" : "delivered",
            updatedAt: audit.timestamp, snapshotId: audit.snapshotId,
            message: !included ? "下次派发时自动交付" : audit.dispatch_gate?.dispatchReady === false ? "配置交付失败，可重试" : "配置已交付，实际使用以工具回执为准" };
    });
}
function retryExtensionRuntimeDelivery(id) {
    const ref = rows()[id];
    if (!ref)
        throw new Error("运行时交付记录不存在");
    const input = JSON.parse((0, credential_store_1.resolveCredential)(ref));
    const active = require("../agents/execution-kernel").listActiveAgentRuns();
    if (active.some((run) => path.resolve(run.cwd || ".") === path.resolve(input.workDir)))
        throw new Error("该工作区正在执行任务，请在任务结束后重试，或等待下次派发");
    for (const config of Object.values(input.options?.internalMcpServers || {})) {
        if (!config.env?.CCM_INTERNAL_MCP_CONTEXT)
            continue;
        require("../integrations/internal-mcp-runtime").openInternalMcpTaskContext(config.env.CCM_INTERNAL_MCP_CONTEXT);
    }
    const current = (0, installed_tool_catalog_1.installedToolGrants)();
    const selection = { mcp: current.mcp, skill: [...new Set([...current.skill, ...(input.allowedTools?.skill || []).filter(internal_skill_catalog_1.isCcmInternalSkillName)])] };
    const authorizationReadiness = require("./tool-authorization").buildToolAuthorizationPayload(selection).authorization_readiness;
    const audit = require("./runtime-tool-sync").syncRuntimeToolsWithCatalog(input.workDir, input.agentType, selection, {}, { ...input.options, authorizationReadiness });
    return { runtime: audit.runtime, state: audit.dispatch_gate?.dispatchReady ? "delivered" : "failed", snapshotId: audit.snapshotId };
}
function deferredInstalledRuntimeDelivery() {
    return { schema: "ccm-runtime-tool-resync-v1", success: true, state: "deferred", requestedAt: new Date().toISOString(),
        message: "扩展在下次派发或恢复时交付；运行中的任务保持当前配置", summary: { scanned: 0, selected: 0, resynced: 0, skipped: 0, failed: 0 }, items: [] };
}
//# sourceMappingURL=extension-runtime-delivery.js.map