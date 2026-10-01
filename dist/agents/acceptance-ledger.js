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
exports.readAcceptanceLedger = readAcceptanceLedger;
exports.registerAcceptanceExecution = registerAcceptanceExecution;
exports.beginAcceptanceVerification = beginAcceptanceVerification;
exports.recordAcceptanceObservation = recordAcceptanceObservation;
exports.prepareAcceptanceCommand = prepareAcceptanceCommand;
exports.evaluateAcceptanceLedger = evaluateAcceptanceLedger;
const path = __importStar(require("path"));
const crypto_1 = require("crypto");
const utils_1 = require("../core/utils");
const atomic_json_file_1 = require("../core/atomic-json-file");
const acceptance_contract_1 = require("./acceptance-contract");
const acceptance_workspace_1 = require("./acceptance-workspace");
const location = (taskId) => path.join(process.env.CCM_ACCEPTANCE_STORE_DIR || path.join(process.env.CCM_TASK_STORE_DIR || utils_1.CCM_DIR, "acceptance"), `${(0, acceptance_contract_1.acceptanceHash)(taskId)}.json`);
function readAcceptanceLedger(taskId) {
    return (0, atomic_json_file_1.readJsonWithBackup)(location(taskId), null);
}
const environmentFingerprint = () => (0, acceptance_contract_1.acceptanceHash)({ node: process.version, platform: process.platform, arch: process.arch });
function registerAcceptanceExecution(contract, input) {
    const validation = (0, acceptance_contract_1.validateAcceptanceContract)(contract);
    if (!validation.valid)
        throw new Error(`acceptance_contract_invalid:${validation.issues.join(",")}`);
    if (!input.executionSessionId || !Number.isInteger(input.attempt) || input.attempt < 1)
        throw new Error("acceptance_execution_identity_missing");
    if (!contract.workItems.some(w => w.id === input.workItemId && w.projectId === input.projectId))
        throw new Error("acceptance_project_mismatch");
    return (0, atomic_json_file_1.withFileLock)(location(contract.taskId), () => {
        const old = readAcceptanceLedger(contract.taskId);
        if (old && old.contract.checksum !== contract.checksum)
            throw new Error("acceptance_contract_revision_requires_new_generation");
        const ledger = old || { contract: JSON.parse(JSON.stringify(contract)), executions: [], observations: [] };
        const existing = ledger.executions.find(r => r.workItemId === input.workItemId && r.projectId === input.projectId && r.executionSessionId === input.executionSessionId && r.attempt === input.attempt);
        if (existing)
            return existing;
        const baseline = (0, acceptance_workspace_1.captureAcceptanceSnapshot)(input.root, contract, input.projectId);
        if (baseline.error)
            throw new Error(`acceptance_baseline_blocked:${baseline.error}`);
        const execution = { ...input, id: `ax_${(0, crypto_1.randomUUID)()}`, root: baseline.root, baseline, environmentFingerprint: environmentFingerprint() };
        ledger.executions.push(execution);
        (0, atomic_json_file_1.writeJsonAtomic)(location(contract.taskId), ledger);
        return execution;
    });
}
function beginAcceptanceVerification(taskId, executionId) {
    return (0, atomic_json_file_1.withFileLock)(location(taskId), () => {
        const ledger = readAcceptanceLedger(taskId), run = ledger?.executions.find(r => r.id === executionId);
        if (!run)
            throw new Error("acceptance_execution_missing");
        const current = (0, acceptance_workspace_1.captureAcceptanceSnapshot)(run.root, ledger.contract, run.projectId);
        if (current.error)
            throw new Error(`acceptance_snapshot_blocked:${current.error}`);
        run.verificationSource = current;
        (0, atomic_json_file_1.writeJsonAtomic)(location(taskId), ledger);
        return { taskId, executionId, contractChecksum: ledger.contract.checksum };
    });
}
function assertionPassed(check, result) {
    const assertion = check.assertion;
    if (assertion.kind === "exit_code")
        return result.exitCode === assertion.value;
    let actual = result.actual;
    if (assertion.kind === "json_equals") {
        try {
            actual = JSON.parse(result.output || "");
        }
        catch {
            return false;
        }
        for (const p of (assertion.pointer || "").split("/").slice(1).map(p => p.replace(/~1/g, "/").replace(/~0/g, "~"))) {
            if (actual === null || typeof actual !== "object" || !Object.prototype.hasOwnProperty.call(actual, p))
                return false;
            actual = actual[p];
        }
    }
    return actual !== undefined && (0, acceptance_contract_1.acceptanceHash)(actual) === (0, acceptance_contract_1.acceptanceHash)(assertion.value);
}
/** Called only by trusted execution adapters, never from model receipt/report ingestion. */
function recordAcceptanceObservation(context, checkId, input) {
    return (0, atomic_json_file_1.withFileLock)(location(context.taskId), () => {
        const ledger = readAcceptanceLedger(context.taskId);
        const run = ledger?.executions.find(r => r.id === context.executionId);
        const check = ledger?.contract.checks.find(c => c.id === checkId);
        if (!ledger || !run || !check || ledger.contract.checksum !== context.contractChecksum || check.projectId !== run.projectId || check.workItemId !== run.workItemId)
            throw new Error("acceptance_observation_binding_invalid");
        if (!input.sourceRecordId || !run.verificationSource)
            throw new Error("acceptance_observation_source_missing");
        const existing = ledger.observations.find(r => r.sourceRecordId === input.sourceRecordId && r.verificationId === check.id);
        const sourceChecksum = (0, acceptance_contract_1.acceptanceHash)({ context, checkId, input });
        if (existing) {
            if (existing.sourceChecksum !== sourceChecksum)
                throw new Error("acceptance_source_record_conflict");
            return existing;
        }
        const stable = !run.verificationSource.error && run.verificationSource.fingerprint === input.beforeFingerprint
            && input.beforeFingerprint === input.afterFingerprint && run.environmentFingerprint === environmentFingerprint();
        const exitPresent = check.kind !== "command" || Number.isInteger(input.exitCode);
        const commandMatches = check.kind !== "command" || input.command === check.command;
        const independent = !check.independent || input.producer === "test_agent" || (input.producer === "ccm" && check.kind === "scope_audit");
        let cwdMatches = false;
        try {
            cwdMatches = path.resolve(input.cwd) === (0, acceptance_workspace_1.pathInside)(input.executionRoot || run.root, check.cwd);
        }
        catch { }
        const observable = input.status === "passed" && assertionPassed(check, input);
        const blocked = !stable || !exitPresent || !commandMatches || !independent || !cwdMatches || !["passed", "failed"].includes(input.status);
        const row = {
            id: `ae_${(0, crypto_1.randomUUID)()}`, taskId: ledger.contract.taskId, contractChecksum: context.contractChecksum,
            exactSessionId: ledger.contract.exactSessionId, generation: ledger.contract.generation,
            workItemId: check.workItemId, projectId: check.projectId, executionSessionId: run.executionSessionId, attempt: run.attempt,
            verificationId: check.id, producer: input.producer, sourceRecordId: input.sourceRecordId, sourceChecksum,
            repoStateFingerprint: input.afterFingerprint, environmentFingerprint: run.environmentFingerprint,
            gitFingerprint: run.verificationSource.gitFingerprint || "",
            observedAt: new Date().toISOString(), status: blocked ? "blocked" : observable ? "passed" : "failed",
            ...(Number.isInteger(input.exitCode) ? { exitCode: input.exitCode } : {}),
            ...(check.kind === "command" ? { command: check.command } : {}), cwd: check.cwd,
            outputChecksum: (0, acceptance_contract_1.acceptanceHash)({ output: input.output || "", actual: input.actual ?? null }),
            reason: !stable ? "source_or_environment_changed" : !exitPresent ? "exit_code_missing" : !commandMatches ? "command_mismatch"
                : !independent ? "independent_verification_required" : !cwdMatches ? "working_directory_mismatch" : blocked ? "verification_not_executed" : observable ? "expected_result_observed" : "expected_result_mismatch",
        };
        ledger.observations.push(row);
        (0, atomic_json_file_1.writeJsonAtomic)(location(context.taskId), ledger);
        return row;
    });
}
function prepareAcceptanceCommand(context, projectId, command, executionRoot) {
    const ledger = readAcceptanceLedger(context.taskId), run = ledger?.executions.find(r => r.id === context.executionId);
    if (!run || ledger.contract.checksum !== context.contractChecksum || run.projectId !== projectId)
        throw new Error("acceptance_command_scope_mismatch");
    const checks = ledger.contract.checks.filter(c => c.workItemId === run.workItemId && c.projectId === projectId && c.kind === "command" && c.command === command);
    if (!checks.length)
        throw new Error("command_not_in_acceptance_contract");
    const snapshot = (0, acceptance_workspace_1.captureAcceptanceSnapshot)(executionRoot, ledger.contract, projectId);
    if (snapshot.error || snapshot.fingerprint !== run.verificationSource?.fingerprint)
        throw new Error("acceptance_copy_not_current");
    const cwds = [...new Set(checks.map(c => (0, acceptance_workspace_1.pathInside)(executionRoot, c.cwd)))];
    if (cwds.length !== 1)
        throw new Error("acceptance_command_has_multiple_workdirs");
    return { checks, cwd: cwds[0], snapshot, contract: ledger.contract };
}
function evaluateAcceptanceLedger(task) {
    const ledger = readAcceptanceLedger(String(task?.id || ""));
    if (!ledger)
        return { canComplete: false, status: "blocked", issues: ["acceptance_ledger_missing"], criteria: [], evidenceIds: [] };
    const contract = ledger.contract;
    const issues = [...(0, acceptance_contract_1.validateAcceptanceContract)(contract).issues];
    if (task.generation !== contract.generation)
        issues.push("generation_mismatch");
    const taskContract = task.acceptance_contract || task.plan_dispatch_contract?.acceptanceContract || task.workflow_meta?.plan_dispatch_contract?.acceptanceContract;
    if (!taskContract || taskContract.checksum !== contract.checksum)
        issues.push("contract_binding_mismatch");
    else if (!(0, acceptance_contract_1.validateAcceptanceContract)(taskContract).valid)
        issues.push("contract_invalid");
    const requiresIndependent = contract.level === "strict" || task.acceptance_actual_route === "independent_test_agent"
        || task.acceptance_route === "independent_test_agent" || task.requires_independent_review === true;
    const validByCheck = new Map();
    const observedByCheck = new Map();
    const scopes = [];
    for (const work of contract.workItems) {
        const projectId = work.projectId;
        const run = ledger.executions.filter(r => r.workItemId === work.id).slice(-1)[0];
        if (!run) {
            issues.push(`execution_missing:${projectId}`);
            continue;
        }
        const current = (0, acceptance_workspace_1.captureAcceptanceSnapshot)(run.root, contract, projectId);
        const audit = (0, acceptance_workspace_1.auditAcceptanceScope)(contract, projectId, run.baseline, current);
        scopes.push({ projectId, ...audit });
        if (audit.status !== "passed")
            issues.push(`scope_audit_${audit.status}:${projectId}`);
        for (const check of contract.checks.filter(c => c.workItemId === work.id)) {
            const row = ledger.observations.filter(e => e.verificationId === check.id && e.executionSessionId === run.executionSessionId && e.attempt === run.attempt).slice(-1)[0];
            const fresh = !!row && row.contractChecksum === contract.checksum && row.repoStateFingerprint === current.fingerprint
                && row.taskId === task.id && row.workItemId === work.id && row.generation === contract.generation && row.exactSessionId === contract.exactSessionId
                && row.projectId === work.projectId && !current.error && row.environmentFingerprint === environmentFingerprint()
                && row.gitFingerprint === current.gitFingerprint
                && (!(check.independent || requiresIndependent) || row.producer === "test_agent" || (row.producer === "ccm" && check.kind === "scope_audit"));
            if (row)
                observedByCheck.set(check.id, { row, current: fresh });
            if (row?.status === "passed" && fresh)
                validByCheck.set(check.id, row);
        }
    }
    const criteria = contract.criteria.map(c => {
        const satisfied = c.verificationGroups.every(g => g.some(id => validByCheck.has(id)));
        const observations = c.verificationGroups.flatMap(g => g.map(id => observedByCheck.get(id)).filter(Boolean));
        const evidence = observations.map(o => o.row);
        const failed = c.verificationGroups.some(g => g.every(id => {
            const o = observedByCheck.get(id);
            return o?.current && o.row.status === "failed";
        }));
        const stale = observations.some(o => !o.current);
        if (!satisfied)
            issues.push(`criterion_not_verified:${c.id}`);
        return { criterionId: c.id, description: c.description, expected: c.expected,
            verificationIds: c.verificationGroups.flat(), status: satisfied ? "satisfied" : failed ? "failed" : stale ? "stale" : "not_run",
            freshness: stale ? "stale" : observations.length ? "current" : "unknown", evidenceIds: [...new Set(evidence.map(e => e.id))],
            verifier: requiresIndependent || c.verificationGroups.flat().some(id => contract.checks.find(check => check.id === id)?.independent) ? "独立 TestAgent" : "主 Agent",
            reason: satisfied ? "预期结果已验证" : failed ? "实际结果不符合冻结的预期" : stale ? "代码、环境或验收身份已变化，需要重新验证" : "必需检查缺失或执行受阻" };
    });
    return { canComplete: issues.length === 0, status: issues.length ? "blocked" : "passed", issues: [...new Set(issues)], criteria, scopes,
        evidenceIds: [...new Set([...validByCheck.values()].map(row => row.id))], contractChecksum: contract.checksum };
}
//# sourceMappingURL=acceptance-ledger.js.map