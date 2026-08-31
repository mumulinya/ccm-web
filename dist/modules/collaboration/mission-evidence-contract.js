"use strict";
/**
 * 全局任务交付证据契约：生产端（buildDeliverySummary）在组装交付摘要时，
 * 把已经结构化的门禁结论压成一份带版本号的契约；消费端（global-mission 门禁）
 * 优先消费契约字段做判定，只有旧数据（无契约）才回退到文本正则启发式。
 * 契约字段全部为布尔/计数，禁止依赖自由文本匹配。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUBSTANTIVE_GATE_CHECK_IDS = exports.MISSION_EVIDENCE_CONTRACT_VERSION = void 0;
exports.buildMissionEvidenceContract = buildMissionEvidenceContract;
exports.readMissionEvidenceContract = readMissionEvidenceContract;
exports.missionEvidenceContractStrong = missionEvidenceContractStrong;
exports.missionEvidenceContractGatePassed = missionEvidenceContractGatePassed;
exports.runMissionEvidenceContractSelfTest = runMissionEvidenceContractSelfTest;
exports.MISSION_EVIDENCE_CONTRACT_VERSION = 1;
/** 与 global-mission 门禁共用的"实质性检查项"集合：命中其一才算有真实交付证据。 */
exports.SUBSTANTIVE_GATE_CHECK_IDS = new Set([
    "actual_changes",
    "actual_diff",
    "verification",
    "required_verification",
    "verification_source",
    "independent_review",
    "final_review",
    "worker_receipt",
    "receipt_quality",
    "work_items",
    "team_shutdown",
]);
function toCount(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}
function listLength(value) {
    return Array.isArray(value) ? value.length : 0;
}
/** 由交付摘要的结构化字段生成契约，不读取任何自由文本。 */
function buildMissionEvidenceContract(summary) {
    const gate = summary?.acceptance_gate || {};
    const gateChecks = Array.isArray(gate?.checks) ? gate.checks : (Array.isArray(gate?.items) ? gate.items : []);
    const failedCount = toCount(gate?.failed_count)
        || listLength(gate?.failed_checks)
        || gateChecks.filter((item) => item?.ok === false || item?.pass === false).length;
    const substantivePassed = gateChecks.length > 0
        && failedCount === 0
        && gateChecks.every((item) => item?.ok !== false && item?.pass !== false)
        && gateChecks.some((item) => exports.SUBSTANTIVE_GATE_CHECK_IDS.has(String(item?.id || "")) && (item?.detail || item?.label || item?.title));
    const independentReviewGate = summary?.independent_review_gate || {};
    return {
        version: exports.MISSION_EVIDENCE_CONTRACT_VERSION,
        generated_at: String(summary?.generated_at || new Date().toISOString()),
        acceptance_gate_passed: summary?.acceptance_gate_passed === true || gate?.pass === true,
        gate_check_count: gateChecks.length,
        gate_failed_count: failedCount,
        substantive_gate_check_passed: substantivePassed,
        verification_executed_count: listLength(summary?.verification_executed),
        verification_failed_count: listLength(summary?.verification_failed),
        external_runner_verification_count: toCount(summary?.external_runner_verification_count) || listLength(summary?.external_runner_verification),
        verification_source_gate_passed: summary?.verification_source_gate_passed === true,
        verification_required_gate_passed: summary?.verification_required_gate_passed !== false,
        independent_review_required: summary?.independent_review_required === true,
        independent_review_gate_passed: summary?.independent_review_gate_passed === true,
        independent_review_evidence_count: toCount(independentReviewGate?.evidence_count) || listLength(summary?.independent_review_evidence),
        actual_file_change_count: toCount(summary?.actual_file_change_count) || listLength(summary?.actual_file_changes),
    };
}
/** 读取任务交付摘要上的契约；缺失或版本不兼容时返回 null（消费端回退旧文本路径）。 */
function readMissionEvidenceContract(task) {
    const summary = task?.delivery_summary || task?.deliverySummary || {};
    const raw = summary?.evidence_contract || summary?.evidenceContract || null;
    if (!raw || typeof raw !== "object")
        return null;
    if (toCount(raw.version) !== exports.MISSION_EVIDENCE_CONTRACT_VERSION)
        return null;
    if (typeof raw.acceptance_gate_passed !== "boolean")
        return null;
    return {
        version: exports.MISSION_EVIDENCE_CONTRACT_VERSION,
        generated_at: String(raw.generated_at || ""),
        acceptance_gate_passed: raw.acceptance_gate_passed === true,
        gate_check_count: toCount(raw.gate_check_count),
        gate_failed_count: toCount(raw.gate_failed_count),
        substantive_gate_check_passed: raw.substantive_gate_check_passed === true,
        verification_executed_count: toCount(raw.verification_executed_count),
        verification_failed_count: toCount(raw.verification_failed_count),
        external_runner_verification_count: toCount(raw.external_runner_verification_count),
        verification_source_gate_passed: raw.verification_source_gate_passed === true,
        verification_required_gate_passed: raw.verification_required_gate_passed !== false,
        independent_review_required: raw.independent_review_required === true,
        independent_review_gate_passed: raw.independent_review_gate_passed === true,
        independent_review_evidence_count: toCount(raw.independent_review_evidence_count),
        actual_file_change_count: toCount(raw.actual_file_change_count),
    };
}
/** 契约版"强验收证据"判定：与旧文本路径同构，但只看结构化字段。 */
function missionEvidenceContractStrong(contract) {
    if (!contract.acceptance_gate_passed)
        return false;
    if (contract.substantive_gate_check_passed)
        return true;
    if (contract.verification_executed_count > 0 && contract.verification_failed_count === 0)
        return true;
    if (contract.verification_source_gate_passed && contract.external_runner_verification_count > 0)
        return true;
    if (contract.independent_review_gate_passed && contract.independent_review_evidence_count > 0)
        return true;
    return false;
}
/** 契约版子任务交付门禁：对应旧路径 globalMissionChildGatePassedFromEvidence 的结构化部分。 */
function missionEvidenceContractGatePassed(contract, requirements) {
    if (!missionEvidenceContractStrong(contract))
        return false;
    if (requirements.requiresCodeChanges && contract.actual_file_change_count <= 0)
        return false;
    if (requirements.requiresVerification && contract.verification_executed_count <= 0)
        return false;
    if (contract.verification_failed_count > 0)
        return false;
    if (!contract.verification_required_gate_passed)
        return false;
    if (requirements.requiresVerification && !contract.verification_source_gate_passed)
        return false;
    if (contract.independent_review_required && !contract.independent_review_gate_passed)
        return false;
    return true;
}
function runMissionEvidenceContractSelfTest() {
    const strongSummary = {
        acceptance_gate_passed: true,
        acceptance_gate: {
            pass: true,
            checks: [
                { id: "actual_changes", ok: true, label: "真实文件变更" },
                { id: "verification_source", ok: true, label: "外部 Runner 验证" },
            ],
        },
        actual_file_change_count: 2,
        verification_executed: ["npm test (exit 0)"],
        verification_failed: [],
        external_runner_verification_count: 1,
        verification_source_gate_passed: true,
        independent_review_required: true,
        independent_review_gate_passed: true,
        independent_review_gate: { evidence_count: 1 },
    };
    const strong = buildMissionEvidenceContract(strongSummary);
    // 关键反正则断言：文本声称验证通过，但结构化计数为 0，契约必须拒绝。
    const misleadingTextSummary = {
        acceptance_gate_passed: true,
        acceptance_gate: { pass: true, checks: [] },
        verification_executed: [],
        acceptance: ["外部 Runner 已验证 npm test 通过，可以接受本次交付"],
        verification: "npm test passed (exit 0)",
    };
    const misleading = buildMissionEvidenceContract(misleadingTextSummary);
    const failedVerificationSummary = {
        ...strongSummary,
        verification_failed: ["npm test failed (exit 1)"],
    };
    const failed = buildMissionEvidenceContract(failedVerificationSummary);
    const requirements = { requiresCodeChanges: true, requiresVerification: true };
    const checks = {
        contractStrongPasses: missionEvidenceContractStrong(strong) === true,
        contractGatePasses: missionEvidenceContractGatePassed(strong, requirements) === true,
        contractRejectsMisleadingText: missionEvidenceContractStrong(misleading) === false,
        contractRejectsFailedVerification: missionEvidenceContractGatePassed(failed, requirements) === false,
        contractRoundTripsThroughRead: readMissionEvidenceContract({ delivery_summary: { evidence_contract: strong } })?.verification_executed_count === 1,
        contractIgnoresUnknownVersion: readMissionEvidenceContract({ delivery_summary: { evidence_contract: { ...strong, version: 99 } } }) === null,
        contractIgnoresMalformedPayload: readMissionEvidenceContract({ delivery_summary: { evidence_contract: { version: 1 } } }) === null,
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=mission-evidence-contract.js.map