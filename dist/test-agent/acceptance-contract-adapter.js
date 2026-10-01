"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareContractCommand = prepareContractCommand;
exports.recordContractCommand = recordContractCommand;
exports.contractAcceptanceCoverage = contractAcceptanceCoverage;
const crypto_1 = require("crypto");
const acceptance_ledger_1 = require("../agents/acceptance-ledger");
const acceptance_workspace_1 = require("../agents/acceptance-workspace");
function prepareContractCommand(workOrder, project, command) {
    const contexts = workOrder.metadata?.acceptanceExecutions || [];
    const preparations = [];
    for (const context of contexts) {
        const ledger = (0, acceptance_ledger_1.readAcceptanceLedger)(context.taskId), run = ledger?.executions.find(r => r.id === context.executionId);
        if (!run || !ledger.contract.checks.some(c => c.workItemId === run.workItemId && c.command === command))
            continue;
        const preparation = (0, acceptance_ledger_1.prepareAcceptanceCommand)(context, project.name, command, project.workDir);
        preparations.push({ ...preparation, context, sourceRecordId: `command_${(0, crypto_1.randomUUID)()}`, root: project.workDir, projectId: project.name });
    }
    if (contexts.length && !preparations.length)
        throw new Error("验证命令不属于已冻结验收合同");
    return preparations;
}
function recordContractCommand(preparations, result, producer = "test_agent") {
    const evidenceIds = [];
    for (const prepared of preparations) {
        const current = (0, acceptance_workspace_1.captureAcceptanceSnapshot)(prepared.root, prepared.contract, prepared.projectId);
        for (const check of prepared.checks) {
            const row = (0, acceptance_ledger_1.recordAcceptanceObservation)(prepared.context, check.id, { producer, sourceRecordId: prepared.sourceRecordId,
                cwd: result.cwd, executionRoot: prepared.root, command: result.command, exitCode: result.exitCode, output: result.stdout,
                status: current.error || (prepared.snapshot.mode === "git" && prepared.snapshot.gitFingerprint !== current.gitFingerprint) ? "blocked" : result.status,
                beforeFingerprint: prepared.snapshot.fingerprint, afterFingerprint: current.fingerprint });
            evidenceIds.push(row.id);
        }
    }
    return evidenceIds;
}
/** Explicit frozen ID bindings only. The legacy UI shape is a read-only projection. */
function contractAcceptanceCoverage(input) {
    const contract = input.workOrder.metadata?.acceptanceContract;
    if (!contract)
        return null;
    const evaluated = (0, acceptance_ledger_1.evaluateAcceptanceLedger)({ id: contract.taskId, generation: contract.generation, acceptance_contract: contract });
    return contract.criteria.map((criterion) => {
        const row = evaluated.criteria.find(r => r.criterionId === criterion.id);
        const complete = row?.status === "satisfied";
        const failed = row?.status === "failed";
        const evidence = row?.evidenceIds || [];
        return { criterion: criterion.description, status: complete ? "verified" : failed ? "not_verified" : "unknown",
            evidence, matchStrength: evidence.length ? "direct" : "none",
            evidenceSource: evidence.length ? "matched_evidence" : "none", matchScore: complete ? 1 : 0 };
    });
}
//# sourceMappingURL=acceptance-contract-adapter.js.map