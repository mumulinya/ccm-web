"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareAcceptanceReverification = prepareAcceptanceReverification;
const crypto_1 = require("crypto");
const atomic_json_file_1 = require("../core/atomic-json-file");
const acceptance_ledger_1 = require("./acceptance-ledger");
const acceptance_contract_1 = require("./acceptance-contract");
const acceptance_workspace_1 = require("./acceptance-workspace");
/** Only the server ledger supplies passed observations and their source state.
 * Reused evidence gets a current observation with explicit provenance, never
 * an old Attempt receipt inserted as this Attempt's result. */
function prepareAcceptanceReverification(context, configurationChecksum) {
    return (0, atomic_json_file_1.withFileLock)((0, acceptance_ledger_1.acceptanceLedgerLocation)(context.taskId), () => {
        const ledger = (0, acceptance_ledger_1.readAcceptanceLedger)(context.taskId), run = ledger?.executions.find(row => row.id === context.executionId);
        const full = (reason) => ({ mode: "full", fallbackReasons: [reason], selectedCheckIds: [], reusedEvidence: [] });
        if (!ledger || !run || context.contractChecksum !== ledger.contract.checksum || !(0, acceptance_contract_1.validateAcceptanceContract)(ledger.contract).valid)
            return full("验收合同或执行身份不足");
        const previous = run.verificationHistory?.slice(-1)[0];
        const previousConfiguration = run.verificationConfigurationChecksum;
        run.verificationConfigurationChecksum = configurationChecksum;
        (0, atomic_json_file_1.writeJsonAtomic)((0, acceptance_ledger_1.acceptanceLedgerLocation)(context.taskId), ledger);
        if (!previous)
            return full("初验或缺少可信的上轮源码状态");
        if (!configurationChecksum || previous.configurationChecksum !== configurationChecksum || previousConfiguration !== configurationChecksum)
            return full("Runtime、测试目标、认证或环境配置已变化");
        if (ledger.contract.level === "strict")
            return full("严格风险任务执行完整验收");
        const current = (0, acceptance_workspace_1.captureAcceptanceSnapshot)(run.root, ledger.contract, run.projectId);
        if (current.error || previous.snapshot.error || current.fingerprint !== run.verificationSource?.fingerprint)
            return full("源码证据已失效");
        const checks = ledger.contract.checks.filter(check => check.workItemId === run.workItemId);
        if (!checks.length || checks.some(check => !check.sourcePaths?.length || check.sourcePaths.some(file => !(0, acceptance_contract_1.relativeAcceptancePath)(file))) || !checks.some(check => check.coreRegression === true))
            return full("变更影响映射或核心回归声明不完整");
        const changed = [...new Set([...Object.keys(current.files), ...Object.keys(previous.snapshot.files)])].filter(file => current.files[file] !== previous.snapshot.files[file]);
        if (changed.some(file => !checks.some(check => check.sourcePaths.includes(file))))
            return full("存在未映射的可信文件变化");
        const selectedCheckIds = [], reusable = [];
        for (const check of checks) {
            // Read the last observation for the previous source state. A replay of
            // this preparation must not treat its own provenance copy as new proof.
            const row = ledger.observations.filter(row => row.verificationId === check.id && row.executionSessionId === run.executionSessionId
                && row.attempt === run.attempt && row.repoStateFingerprint === previous.snapshot.fingerprint).slice(-1)[0];
            const age = Date.now() - Date.parse(row?.observedAt || "");
            const applicable = row?.status === "passed" && row.taskId === context.taskId && row.contractChecksum === context.contractChecksum
                && row.generation === ledger.contract.generation && row.exactSessionId === ledger.contract.exactSessionId
                && row.environmentFingerprint === run.environmentFingerprint && row.repoStateFingerprint === previous.snapshot.fingerprint
                && row.gitFingerprint === previous.snapshot.gitFingerprint
                && row.producer === "test_agent" && Number.isFinite(age) && age >= 0 && age <= 30 * 60_000
                && check.sourcePaths.every(file => previous.snapshot.files[file] && previous.snapshot.files[file] === current.files[file]);
            // Browser, HTTP, safety/scope and mandatory checks always run this round.
            if (check.kind !== "command" || check.coreRegression || !applicable)
                selectedCheckIds.push(check.id);
            else
                reusable.push({ check, row });
        }
        if (!reusable.length)
            return full("所有检查均需要本轮执行");
        const reusedEvidence = reusable.map(({ check, row }) => {
            const sourceRecordId = `reuse:${run.id}:${current.fingerprint}:${row.id}`;
            const replay = ledger.observations.find(item => item.sourceRecordId === sourceRecordId && item.verificationId === check.id);
            if (replay)
                return { checkId: check.id, evidenceId: replay.id, originEvidenceId: row.id };
            const observation = { ...row, id: `ae_${(0, crypto_1.randomUUID)()}`, sourceRecordId, originEvidenceId: row.id,
                observedAt: new Date().toISOString(), repoStateFingerprint: current.fingerprint, gitFingerprint: current.gitFingerprint || "",
                reason: "unchanged_bound_sources_revalidated", sourceChecksum: (0, acceptance_contract_1.acceptanceHash)({ context, configurationChecksum, sourceRecordId }) };
            ledger.observations.push(observation);
            return { checkId: check.id, evidenceId: observation.id, originEvidenceId: row.id };
        });
        (0, atomic_json_file_1.writeJsonAtomic)((0, acceptance_ledger_1.acceptanceLedgerLocation)(context.taskId), ledger);
        return { mode: "incremental", fallbackReasons: [], selectedCheckIds, reusedEvidence };
    });
}
//# sourceMappingURL=acceptance-reverification.js.map