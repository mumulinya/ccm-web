"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.injectAgentRunSecrets = injectAgentRunSecrets;
exports.revokeAgentRunSecrets = revokeAgentRunSecrets;
const credential_store_1 = require("../core/credential-store");
const agent_governance_store_1 = require("./agent-governance-store");
function envName(value) {
    const name = String(value || "").trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name))
        throw Object.assign(new Error("Run Secret 环境变量名无效"), { code: "CCM_SECRET_ENV_INVALID" });
    return name;
}
/** Resolve only short lived environment values. The returned object must never be persisted. */
function injectAgentRunSecrets(runId) {
    const environment = {};
    const injected = [];
    for (const binding of (0, agent_governance_store_1.listAgentRunSecrets)(runId)) {
        if (binding.status === "revoked")
            continue;
        try {
            environment[envName(binding.envName)] = (0, credential_store_1.resolveCredential)(binding.secretRef);
            (0, agent_governance_store_1.updateAgentRunSecret)(binding.bindingId, "injected");
            injected.push(binding.bindingId);
        }
        catch (error) {
            (0, agent_governance_store_1.updateAgentRunSecret)(binding.bindingId, "failed");
            for (const bindingId of injected)
                (0, agent_governance_store_1.updateAgentRunSecret)(bindingId, "revoked");
            throw Object.assign(new Error(`Run Secret 注入失败：${binding.envName}`), { code: "CCM_SECRET_INJECTION_FAILED", cause: error });
        }
    }
    return { environment, bindingIds: injected };
}
function revokeAgentRunSecrets(runId) {
    const revoked = [];
    for (const binding of (0, agent_governance_store_1.listAgentRunSecrets)(runId)) {
        if (binding.status === "injected" || binding.status === "requested") {
            (0, agent_governance_store_1.updateAgentRunSecret)(binding.bindingId, "revoked");
            revoked.push(binding.bindingId);
        }
    }
    return revoked;
}
//# sourceMappingURL=agent-run-secrets.js.map