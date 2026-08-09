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
exports.buildTestAgentCompletionGate = buildTestAgentCompletionGate;
exports.validateTestAgentCompletionGate = validateTestAgentCompletionGate;
exports.publicTestAgentVerificationHardening = publicTestAgentVerificationHardening;
exports.runTestAgentCompletionGateSelfTest = runTestAgentCompletionGateSelfTest;
const crypto = __importStar(require("crypto"));
const hardening_policy_1 = require("./hardening-policy");
const hardening_metrics_1 = require("./hardening-metrics");
function hash(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}
function status(value) {
    return String(value || "").trim().toLowerCase();
}
function passCheck(id, pass, detail, options = {}) {
    return {
        id,
        pass,
        status: options.waived ? "waived" : options.missing ? "missing" : pass ? "passed" : "failed",
        detail: String(detail || "").slice(0, 600),
    };
}
function hardeningPolicy(input) {
    const supplied = input?.policy?.hardening || input?.hardeningPolicy || input?.hardening_policy;
    const validation = (0, hardening_policy_1.validateTestAgentHardeningPolicy)(supplied);
    return validation.valid && validation.policy
        ? validation.policy
        : (0, hardening_policy_1.buildTestAgentHardeningPolicy)({ task: input?.task, reviewPolicy: input?.reviewPolicy || input?.review_policy });
}
function hardeningActive(input, review) {
    const supplied = input?.policy?.hardening || input?.hardeningPolicy || input?.hardening_policy;
    return (0, hardening_policy_1.validateTestAgentHardeningPolicy)(supplied).valid
        || review?.verificationHardening?.version === 2
        || review?.verification_hardening?.version === 2;
}
function planningReceipt(review) {
    const report = review?.report || review?.invocation?.report || {};
    return review?.planningReceipt
        || review?.planning_receipt
        || report?.metadata?.verificationHardening?.planningReceipt
        || report?.metadata?.verification_hardening?.planning_receipt
        || report?.metadata?.agenticPlanning?.receipt
        || null;
}
function isolationReceipt(review) {
    const report = review?.report || review?.invocation?.report || {};
    return review?.isolationReceipt
        || review?.isolation_receipt
        || report?.metadata?.verificationHardening?.isolationReceipt
        || report?.metadata?.verification_hardening?.isolation_receipt
        || null;
}
function surfaceAudit(review) {
    const report = review?.report || review?.invocation?.report || {};
    return review?.surfaceAudit
        || review?.surface_audit
        || report?.metadata?.verificationHardening?.surfaceAudit
        || report?.metadata?.verification_hardening?.surface_audit
        || null;
}
function runtimeBinding(review) {
    const runner = review?.runner || review?.runnerRecord || review?.invocationRun?.record || {};
    return review?.runtimeBinding || review?.runtime_binding || runner?.runtimeAfter || runner?.runtime_after || runner?.sourceAfter?.runtime || null;
}
function runnerRuntimeStable(runner) {
    const before = Array.isArray(runner?.sourceBefore?.projects) ? runner.sourceBefore.projects : [];
    const after = Array.isArray(runner?.sourceAfter?.projects) ? runner.sourceAfter.projects : [];
    if (!before.length || before.length !== after.length)
        return false;
    const afterByName = new Map(after.map((item) => [String(item?.name || ""), item]));
    return before.every((item) => {
        const current = afterByName.get(String(item?.name || ""));
        return !!current
            && !!item?.runtimeFingerprint?.checksum
            && item.runtimeFingerprint.checksum === current?.runtimeFingerprint?.checksum;
    });
}
function buildTestAgentCompletionGate(input) {
    const review = input.review || {};
    const report = review?.report || review?.invocation?.report || {};
    const invocation = review?.invocation || {};
    const runner = review?.runner || review?.runnerRecord || review?.invocationRun?.record || {};
    const policy = hardeningPolicy(input);
    const strictV2 = hardeningActive(input, review);
    const planning = planningReceipt(review);
    const planningStatus = status(planning?.status || report?.metadata?.agenticPlanning?.status || "");
    const planningPass = ["applied", "model_applied", "degraded", "deterministic_fallback", "not_required"].includes(planningStatus);
    const isolation = isolationReceipt(review);
    const isolationStatus = status(isolation?.status || isolation?.cleanupStatus || isolation?.cleanup_status || "");
    const isolationPass = !strictV2 || (["ready", "passed", "cleanup_passed", "strict_allowlist", "waived_read_only"].includes(isolationStatus)
        && isolation?.sideEffectState !== "unknown"
        && isolation?.side_effect_state !== "unknown");
    const audit = review?.surfaceAuditAfter || review?.surface_audit_after || surfaceAudit(review);
    const auditStatus = status(audit?.status || "");
    const auditPass = !strictV2 || auditStatus === "passed" || auditStatus === "waived" || (policy.surfaceAuditMode === "warn" && ["warning", "warn"].includes(auditStatus));
    const sourceStable = runner?.sourceStable === true || review?.sourceStable === true;
    const runtime = runtimeBinding(review);
    const runtimeStable = !strictV2 || runtime?.stable === true || runner?.runtimeStable === true || review?.runtimeStable === true || runnerRuntimeStable(runner);
    const evidenceGate = report?.acceptanceEvidenceGateSummary || report?.acceptance_evidence_gate_summary || {};
    const evidencePass = evidenceGate.canAccept === true || evidenceGate.pass === true;
    const outputValid = invocation?.outputValidation?.valid === true || review?.outputValidation?.valid === true;
    const artifactPass = invocation?.artifactVerification?.status === "passed" || review?.artifactVerification?.status === "passed";
    const verdictPass = review?.canAccept === true || invocation?.canAccept === true;
    const spot = input.spotCheck
        || review?.post_review_spot_check_summary
        || review?.postReviewSpotCheckSummary
        || review?.post_review_spot_check
        || null;
    const spotStatus = status(spot?.status || spot?.verdict || "");
    const spotPass = !policy.requiresSpotCheck || spot?.pass === true || ["passed", "pass", "accepted"].includes(spotStatus);
    const capability = report?.metadata?.verificationHardening?.readonlyCapabilityManifest
        || report?.metadata?.verification_hardening?.readonly_capability_manifest
        || review?.readonlyCapabilityManifest
        || null;
    const capabilityPass = !strictV2 || !policy.readonlyCapabilityInjection || !!(capability?.checksum || capability?.signature || capability?.manifestChecksum);
    const checks = [
        passCheck("planning_receipt", planningPass, planningPass ? `规划状态：${planningStatus}` : `规划回执缺失或阻断：${planningStatus || "missing"}`, { missing: !planning }),
        passCheck("isolation_receipt", isolationPass, isolationPass ? (strictV2 ? `隔离状态：${isolationStatus}` : "v1任务沿用旧隔离记录") : `隔离或清理未通过：${isolationStatus || "missing"}`, { missing: strictV2 && !isolation, waived: !strictV2 }),
        passCheck("source_freshness", sourceStable, sourceStable ? "源码指纹前后一致" : "源码指纹缺失或已漂移"),
        passCheck("runtime_freshness", !strictV2 || !policy.requiresRuntimeFingerprint || runtimeStable, !strictV2 ? "v1任务沿用旧源码新鲜度门禁" : !policy.requiresRuntimeFingerprint ? "当前风险策略不强制运行时指纹" : runtimeStable ? "运行时指纹前后一致" : "运行时指纹缺失或已漂移", { waived: !strictV2 || !policy.requiresRuntimeFingerprint }),
        passCheck("surface_audit", !strictV2 || !policy.requiresSurfaceAudit || auditPass, !strictV2 ? "v1任务沿用旧变更面门禁" : !policy.requiresSurfaceAudit ? "当前风险策略不强制变更面审计" : auditPass ? `变更面审计：${auditStatus}` : `变更面审计缺失或失败：${auditStatus || "missing"}`, { missing: strictV2 && policy.requiresSurfaceAudit && !audit, waived: !strictV2 || !policy.requiresSurfaceAudit }),
        passCheck("acceptance_evidence", evidencePass, evidencePass ? "所有验收标准具有匹配执行证据" : "验收证据门禁未通过", { missing: !report?.acceptanceEvidenceGateSummary && !report?.acceptance_evidence_gate_summary }),
        passCheck("invocation_contract", outputValid && artifactPass && verdictPass, outputValid && artifactPass && verdictPass ? "输出、制品和 verdict 合法" : "TestAgent invocation 合同未完整通过"),
        passCheck("readonly_capabilities", capabilityPass, capabilityPass ? "只读能力清单有效或未要求" : "只读能力清单缺失", { waived: !strictV2 }),
        passCheck("post_review_spot_check", !strictV2 || spotPass, !strictV2 ? "v1任务沿用原入口抽查策略" : spotPass ? (policy.requiresSpotCheck ? "完成前抽查已通过" : "当前策略不强制抽查") : "完成前抽查缺失或失败", { missing: strictV2 && policy.requiresSpotCheck && !spot, waived: !strictV2 || !policy.requiresSpotCheck }),
    ];
    const blockedReasons = checks.filter(check => !check.pass).map(check => `${check.id}:${check.detail}`);
    if (!isolationPass)
        (0, hardening_metrics_1.recordTestAgentHardeningMetric)("test_agent_isolation_blocked_total");
    if (strictV2 && policy.requiresRuntimeFingerprint && !runtimeStable)
        (0, hardening_metrics_1.recordTestAgentHardeningMetric)("test_agent_runtime_drift_total");
    if (strictV2 && !spotPass)
        (0, hardening_metrics_1.recordTestAgentHardeningMetric)("test_agent_spot_check_failed_total");
    if (!capabilityPass)
        (0, hardening_metrics_1.recordTestAgentHardeningMetric)("test_agent_readonly_capability_rejected_total");
    const core = {
        schema: "ccm-test-agent-completion-gate-v2",
        version: 2,
        taskId: String(input.task?.id || review?.taskId || ""),
        workItemId: String(input.workItemId || review?.workItemId || review?.work_item_id || ""),
        exactSessionId: String(input.exactSessionId || input.task?.exact_session_id || input.task?.exactSessionId || input.task?.project_session_id || input.task?.group_session_id || ""),
        generation: Math.max(0, Math.floor(Number(input.generation ?? input.task?.generation ?? 0))),
        attempt: Math.max(1, Math.floor(Number(input.attempt ?? review?.attempt ?? 1))),
        sourceFingerprint: String(runner?.sourceAfter?.fingerprint || runner?.sourceBefore?.fingerprint || review?.sourceFingerprint || ""),
        runtimeFingerprint: String(runtime?.fingerprint || runner?.runtimeAfter?.fingerprint || runner?.sourceAfter?.projects?.[0]?.runtimeFingerprint?.checksum || ""),
        policyChecksum: policy.checksum,
        checks,
        pass: blockedReasons.length === 0,
        blockedReasons,
        decidedAt: new Date().toISOString(),
        contentStored: false,
    };
    return { ...core, checksum: hash(core) };
}
function validateTestAgentCompletionGate(value) {
    if (!value || value.schema !== "ccm-test-agent-completion-gate-v2" || value.version !== 2)
        return { valid: false, reason: "completion_gate_missing" };
    const { checksum, ...core } = value;
    if (!checksum || hash(core) !== checksum)
        return { valid: false, reason: "completion_gate_checksum_mismatch" };
    if (value.pass !== true || !Array.isArray(value.checks) || value.checks.some((item) => item?.pass !== true))
        return { valid: false, reason: "completion_gate_failed" };
    return { valid: true, reason: "ok" };
}
function publicTestAgentVerificationHardening(value) {
    if (!value || typeof value !== "object")
        return null;
    const cleanCheck = (item) => ({ id: String(item?.id || ""), pass: item?.pass === true, status: String(item?.status || ""), detail: String(item?.detail || "").slice(0, 300) });
    return {
        schema: String(value.schema || ""),
        pass: value.pass === true,
        policyChecksum: String(value.policyChecksum || ""),
        sourceFingerprint: String(value.sourceFingerprint || ""),
        runtimeFingerprint: String(value.runtimeFingerprint || ""),
        checks: Array.isArray(value.checks) ? value.checks.slice(0, 20).map(cleanCheck) : [],
        blockedReasons: Array.isArray(value.blockedReasons) ? value.blockedReasons.slice(0, 20).map((item) => String(item).slice(0, 300)) : [],
        metrics: (0, hardening_metrics_1.readTestAgentHardeningMetrics)(),
        decidedAt: String(value.decidedAt || ""),
        contentStored: false,
        checksum: String(value.checksum || ""),
    };
}
function runTestAgentCompletionGateSelfTest() {
    const policy = (0, hardening_policy_1.buildTestAgentHardeningPolicy)({
        config: { testAgentPostReviewSpotCheckMode: "off", testAgentReadonlyCapabilityInjection: false },
        riskTier: "lightweight",
    });
    const review = {
        canAccept: true,
        planningReceipt: { status: "degraded" },
        isolationReceipt: { status: "strict_allowlist", sideEffectState: "none" },
        surfaceAudit: { status: "passed" },
        runtimeStable: true,
        runner: { sourceStable: true, sourceAfter: { fingerprint: "source" } },
        invocation: {
            outputValidation: { valid: true },
            artifactVerification: { status: "passed" },
            report: { acceptanceEvidenceGateSummary: { canAccept: true } },
        },
    };
    const gate = buildTestAgentCompletionGate({ task: { id: "self" }, policy: { hardening: policy }, review });
    return { pass: gate.pass && validateTestAgentCompletionGate(gate).valid, gate };
}
//# sourceMappingURL=completion-gate.js.map