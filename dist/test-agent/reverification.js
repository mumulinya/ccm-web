"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareTestAgentReverification = prepareTestAgentReverification;
const acceptance_contract_1 = require("../agents/acceptance-contract");
const acceptance_reverification_1 = require("../agents/acceptance-reverification");
function prepareTestAgentReverification(original, execution, runtime) {
    const contract = original.metadata?.acceptanceContract;
    const contexts = original.metadata?.acceptanceExecutions;
    if (!contract || !Array.isArray(contexts) || !contexts.length)
        return { workOrder: execution, summary: { mode: "full", fallbackReasons: ["历史工作单缺少权威合同与执行证据"], reusedEvidence: [] } };
    const configurationChecksum = (0, acceptance_contract_1.acceptanceHash)({ node: process.version, platform: process.platform,
        projects: original.projects.map(project => ({ name: project.name, commands: project.verificationCommands, targetUrl: project.targetUrl, startupUrl: project.startupUrl,
            devServerCommand: project.devServerCommand, httpChecks: project.httpChecks, browserChecks: project.browserChecks,
            adversarialHttpChecks: project.adversarialHttpChecks, adversarialBrowserChecks: project.adversarialBrowserChecks,
            // Only the digest is persisted; credentials never enter the projection.
            environmentChecksum: (0, acceptance_contract_1.acceptanceHash)({ ...project.env, ...runtime.runtimeProjectEnvironments?.[project.name] }) })),
        browserProvider: runtime.browserProvider || original.options.browserProvider,
        capabilities: original.metadata?.readonlyCapabilityManifest?.checksum || original.metadata?.verificationHardening?.readonlyCapabilityManifest?.checksum,
        runtimeVersion: original.metadata?.runtimeVersion || null,
        targetRevision: original.metadata?.testTargetRevision || null,
        authenticationRevision: original.metadata?.authenticationRevision || null,
        browserPreflight: original.metadata?.environmentPreflight?.slice(-1)[0]?.providers?.map((provider) => ({
            id: provider.id, available: provider.available, version: provider.version || null, capabilities: provider.capabilities || null,
        })) || null,
    });
    const decisions = contexts.map(context => (0, acceptance_reverification_1.prepareAcceptanceReverification)(context, configurationChecksum));
    const selected = new Set(decisions.flatMap(decision => decision.selectedCheckIds));
    const reused = new Set(decisions.flatMap(decision => decision.reusedEvidence.map(row => row.checkId)));
    const checks = contract.checks;
    const workOrder = { ...execution, projects: execution.projects.map(project => ({ ...project,
            verificationCommands: project.verificationCommands.filter(command => {
                const bound = checks.filter(check => check.projectId === project.name && check.kind === "command" && check.command === command);
                return !bound.length || bound.some(check => selected.has(check.id) || !reused.has(check.id));
            }) })) };
    return { workOrder, summary: { mode: decisions.some(decision => decision.mode === "incremental") ? "incremental" : "full",
            fallbackReasons: [...new Set(decisions.flatMap(decision => decision.fallbackReasons))], configurationChecksum,
            selectedCheckIds: [...selected], reusedEvidence: decisions.flatMap(decision => decision.reusedEvidence) } };
}
//# sourceMappingURL=reverification.js.map