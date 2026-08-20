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
exports.CCM_PLAN_REVIEW_RECEIPT_SCHEMA = exports.CCM_PLANNING_SESSION_SCHEMA = void 0;
exports.resolvePlanningIntensity = resolvePlanningIntensity;
exports.planningAgentLimits = planningAgentLimits;
exports.buildPlanningEvidenceManifest = buildPlanningEvidenceManifest;
exports.planningEvidenceManifestFromToolResults = planningEvidenceManifestFromToolResults;
exports.planningPromptForTurn = planningPromptForTurn;
exports.openPlanningSession = openPlanningSession;
exports.updatePlanningSession = updatePlanningSession;
exports.latestPlanningSession = latestPlanningSession;
exports.confirmPlanningSession = confirmPlanningSession;
exports.buildPlanReviewReceipt = buildPlanReviewReceipt;
exports.planningReviewPrompt = planningReviewPrompt;
exports.planningRepairPrompt = planningRepairPrompt;
exports.runPlanningOrchestratorSelfTest = runPlanningOrchestratorSelfTest;
const crypto = __importStar(require("crypto"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const atomic_json_file_1 = require("../core/atomic-json-file");
const implementation_plan_1 = require("./implementation-plan");
exports.CCM_PLANNING_SESSION_SCHEMA = "ccm-planning-session-v1";
exports.CCM_PLAN_REVIEW_RECEIPT_SCHEMA = "ccm-plan-review-receipt-v1";
const STORE_FILE = path.join(os.homedir(), ".cc-connect", "planning-sessions.json");
function stable(value) {
    if (Array.isArray(value))
        return value.map(stable);
    if (!value || typeof value !== "object")
        return value;
    return Object.keys(value).sort().reduce((out, key) => { out[key] = stable(value[key]); return out; }, {});
}
function hash(value) {
    return crypto.createHash("sha256").update(JSON.stringify(stable(value ?? null))).digest("hex");
}
function clean(value, max = 500) {
    return String(value ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}
function readStore() {
    const fallback = { schema: "ccm-planning-session-store-v1", revision: 0, sessions: [] };
    const value = (0, atomic_json_file_1.readJsonWithBackup)(STORE_FILE, fallback);
    return { schema: fallback.schema, revision: Math.max(0, Number(value?.revision || 0)), sessions: Array.isArray(value?.sessions) ? value.sessions : [] };
}
function persistSession(session) {
    (0, atomic_json_file_1.withFileLock)(STORE_FILE, () => {
        const store = readStore();
        const index = store.sessions.findIndex(item => item.planningId === session.planningId);
        if (index >= 0)
            store.sessions[index] = session;
        else
            store.sessions.push(session);
        store.sessions = store.sessions.slice(-1000);
        store.revision += 1;
        (0, atomic_json_file_1.writeJsonAtomic)(STORE_FILE, store);
    });
    return session;
}
function resolvePlanningIntensity(input) {
    const previous = clean(input?.previousIntensity, 40);
    const projectCount = Math.max(1, Number(input?.projectCount || 1));
    const modules = Math.max(1, Number(input?.independentModuleCount || 1));
    const highRisk = String(input?.riskLevel || "").toLowerCase() === "high" || input?.hasArchitectureOrPublicContractChange === true;
    const next = highRisk || projectCount > 1 ? "critical" : modules > 1 || input?.scopeUncertain === true ? "coordinated" : "focused";
    const rank = { focused: 0, coordinated: 1, critical: 2 };
    return previous && rank[previous] > rank[next] ? previous : next;
}
function planningAgentLimits(intensity) {
    if (intensity === "critical")
        return { exploreAgents: 3, planCandidates: 2, independentReview: true };
    if (intensity === "coordinated")
        return { exploreAgents: 2, planCandidates: 1, independentReview: true };
    return { exploreAgents: 1, planCandidates: 1, independentReview: false };
}
function buildPlanningEvidenceManifest(rows) {
    const entries = (Array.isArray(rows) ? rows : []).map((row) => {
        const project = clean(row?.project || row?.scopeId || "", 180);
        const filePath = clean(row?.path || row?.file || row?.subject || "", 500).replace(/\\/g, "/").replace(/^\.\//, "");
        const checksum = clean(row?.checksum || row?.sourceChecksum || row?.resultChecksum || row?.result_checksum, 160);
        if (!filePath || !checksum)
            return null;
        const core = { project, path: filePath, checksum, from: Math.max(1, Number(row?.from || 1)), to: Math.max(1, Number(row?.to || row?.lines || 1)), source: row?.source === "tool_result" ? "tool_result" : "source_read" };
        return { evidenceId: clean(row?.evidenceId, 160) || `pev_${hash(core).slice(0, 24)}`, ...core, contentStored: false };
    }).filter(Boolean);
    const unique = [...new Map(entries.map(item => [item.evidenceId, item])).values()];
    const core = { schema: "ccm-planning-evidence-manifest-v1", entries: unique, contentStored: false };
    return { ...core, checksum: hash(core) };
}
function planningEvidenceManifestFromToolResults(rows) {
    const receipts = [];
    const visit = (value, depth = 0) => {
        if (!value || typeof value !== "object" || depth > 5)
            return;
        if (value.planningEvidence && typeof value.planningEvidence === "object")
            receipts.push(value.planningEvidence);
        if (Array.isArray(value.files))
            for (const file of value.files)
                visit(file, depth + 1);
        if (value.output && typeof value.output === "object")
            visit(value.output, depth + 1);
        if (value.observation && typeof value.observation === "object")
            visit(value.observation, depth + 1);
    };
    for (const row of Array.isArray(rows) ? rows : [])
        if (row?.ok !== false)
            visit(row);
    return buildPlanningEvidenceManifest(receipts);
}
function planningPromptForTurn(promptTurn) {
    const turn = Math.max(1, Number(promptTurn || 1));
    const full = (turn - 1) % 5 === 0;
    return {
        kind: full ? "full" : "sparse",
        prompt: full ? implementation_plan_1.IMPLEMENTATION_PLAN_PROMPTS.planning_exploration : "Planning remains active. Stay read-only, update the current structured draft, ask only about business decisions that repository evidence cannot resolve, and submit for review when complete.",
    };
}
function openPlanningSession(input) {
    const store = readStore();
    const scope = String(input?.scope || "project");
    const scopeId = clean(input?.scopeId, 180);
    const exactSessionId = clean(input?.exactSessionId, 240);
    const existing = [...store.sessions].reverse().find(item => item.scope === scope && item.scopeId === scopeId && item.exactSessionId === exactSessionId && item.phase !== "confirmed");
    const intensity = resolvePlanningIntensity({ ...input, previousIntensity: existing?.intensity });
    const promptMismatch = !!existing && existing.promptVersion !== implementation_plan_1.CCM_IMPLEMENTATION_PLAN_PROMPT_VERSION;
    const requestedSourceManifest = clean(input?.sourceManifestChecksum, 160);
    const sourceDrift = !!existing?.sourceManifestChecksum && !!requestedSourceManifest
        && existing.sourceManifestChecksum !== requestedSourceManifest;
    const requestedRevision = Math.max(0, Number(input?.revision || 0));
    const userRevision = !!existing && existing.phase === "awaiting_user" && String(input?.phase || "") === "exploring";
    const revisionChanged = requestedRevision > Number(existing?.revision || 0) || userRevision;
    const now = new Date().toISOString();
    const base = existing && !promptMismatch ? existing : {
        schema: exports.CCM_PLANNING_SESSION_SCHEMA,
        planningId: `pln_${hash([scope, scopeId, exactSessionId, input?.planId || "plan", now]).slice(0, 24)}`,
        scope, scopeId, exactSessionId, intensity, phase: "exploring", planId: clean(input?.planId, 240), revision: Math.max(1, Number(input?.revision || 1)), planChecksum: "", sourceManifestChecksum: clean(input?.sourceManifestChecksum, 160), evidenceManifestChecksum: "", promptVersion: implementation_plan_1.CCM_IMPLEMENTATION_PLAN_PROMPT_VERSION, promptTurn: 0, updatedAt: now, contentStored: false,
    };
    return persistSession({
        ...base,
        intensity,
        phase: promptMismatch ? "invalidated" : sourceDrift ? "exploring" : (input?.phase || base.phase),
        revision: sourceDrift || revisionChanged ? Math.max(1, requestedRevision, Number(base.revision || 1) + 1) : base.revision,
        planChecksum: sourceDrift || revisionChanged ? "" : base.planChecksum,
        evidenceManifestChecksum: sourceDrift || revisionChanged ? "" : base.evidenceManifestChecksum,
        evidenceManifest: sourceDrift || revisionChanged ? undefined : base.evidenceManifest,
        reviewReceipt: sourceDrift || revisionChanged ? undefined : base.reviewReceipt,
        reviewReceiptChecksum: sourceDrift || revisionChanged ? undefined : base.reviewReceiptChecksum,
        sourceManifestChecksum: requestedSourceManifest || base.sourceManifestChecksum,
        promptTurn: Math.max(0, Number(base.promptTurn || 0)) + 1,
        updatedAt: now,
    });
}
function updatePlanningSession(session, patch) {
    return persistSession({ ...session, ...patch, schema: exports.CCM_PLANNING_SESSION_SCHEMA, contentStored: false, updatedAt: new Date().toISOString() });
}
function latestPlanningSession(scope, scopeId, exactSessionId) {
    const normalizedScopeId = clean(scopeId, 180);
    const normalizedSessionId = clean(exactSessionId, 240);
    return [...readStore().sessions].reverse().find(item => item.scope === scope && item.scopeId === normalizedScopeId && item.exactSessionId === normalizedSessionId) || null;
}
function confirmPlanningSession(input) {
    const session = latestPlanningSession(input.scope, input.scopeId, input.exactSessionId);
    if (!session)
        return { ok: false, code: "PLANNING_SESSION_NOT_FOUND" };
    if (Number(session.revision) !== Number(input.planRevision) || session.planChecksum !== clean(input.planChecksum, 160)) {
        return { ok: false, code: "PLANNING_SESSION_BINDING_CONFLICT", session };
    }
    if (session.reviewReceipt?.verdict !== "passed" || session.reviewReceiptChecksum !== session.reviewReceipt?.checksum) {
        return { ok: false, code: "PLANNING_REVIEW_NOT_PASSED", session };
    }
    return { ok: true, session: updatePlanningSession(session, { phase: "confirmed" }) };
}
function buildPlanReviewReceipt(input) {
    const deterministic = (0, implementation_plan_1.validateImplementationPlanV2)(input.plan);
    const issues = deterministic.issues.map((message, index) => ({ code: `structure_${index + 1}`, message }));
    const evidenceIds = new Set(input.evidenceManifest.entries.map(item => item.evidenceId));
    const files = Array.isArray(input.plan?.files) ? input.plan.files : [];
    let evidencedFiles = 0;
    for (const file of files) {
        const refs = Array.isArray(file?.sourceEvidenceIds) ? file.sourceEvidenceIds.map(String) : [];
        const filePath = clean(file?.path, 500).replace(/\\/g, "/").replace(/^\.\//, "");
        const project = clean(file?.project, 180);
        const exact = refs.length && refs.every((id) => {
            if (!evidenceIds.has(id))
                return false;
            const evidence = input.evidenceManifest.entries.find(item => item.evidenceId === id);
            return !!evidence
                && evidence.path.replace(/\\/g, "/").replace(/^\.\//, "") === filePath
                && (!project || evidence.project === project);
        });
        if (exact)
            evidencedFiles += 1;
        else
            issues.push({ code: "file_evidence_missing", message: `计划文件缺少同项目、同路径的真实读取证据：${filePath || "unknown"}` });
    }
    const steps = Array.isArray(input.plan?.steps) ? input.plan.steps : [];
    const acceptance = steps.flatMap((step) => Array.isArray(step?.acceptance) ? step.acceptance : []);
    const verification = Array.isArray(input.plan?.verification) ? input.plan.verification : [];
    const coveredAcceptance = acceptance.filter((criterion) => verification.some((row) => (Array.isArray(row?.acceptanceCriteria) ? row.acceptanceCriteria : []).includes(criterion))).length;
    if (acceptance.length && coveredAcceptance < acceptance.length)
        issues.push({ code: "acceptance_verification_gap", message: "部分验收标准没有映射到验证方式" });
    for (const issue of Array.isArray(input.reviewer?.issues) ? input.reviewer.issues : []) {
        const message = clean(issue?.message || issue, 800);
        if (message)
            issues.push({ code: clean(issue?.code || "independent_review", 100), message, ...(clean(issue?.stepId, 100) ? { stepId: clean(issue.stepId, 100) } : {}) });
    }
    const reviewerVerdict = clean(input.reviewer?.verdict, 40);
    if (["repair_required", "blocked"].includes(reviewerVerdict) && !Array.isArray(input.reviewer?.issues)) {
        issues.push({ code: "independent_review_rejected", message: "独立复核未通过，但未返回可修复的问题清单" });
    }
    const unique = [...new Map(issues.map(issue => [`${issue.code}:${issue.message}:${issue.stepId || ""}`, issue])).values()];
    const core = {
        schema: exports.CCM_PLAN_REVIEW_RECEIPT_SCHEMA,
        verdict: (input.blocked || reviewerVerdict === "blocked" ? "blocked" : unique.length || reviewerVerdict === "repair_required" ? "repair_required" : "passed"),
        issues: unique,
        evidenceCoverage: files.length ? evidencedFiles / files.length : 1,
        acceptanceCoverage: acceptance.length ? coveredAcceptance / acceptance.length : 0,
        verificationCoverage: acceptance.length ? coveredAcceptance / acceptance.length : (verification.length ? 1 : 0),
        reviewerBindingChecksum: hash({ planChecksum: input.plan?.checksum || (0, implementation_plan_1.implementationPlanChecksum)(input.plan), evidenceManifestChecksum: input.evidenceManifest.checksum, reviewer: input.reviewer?.reviewer || "deterministic" }),
        contentStored: false,
    };
    return { ...core, checksum: hash(core) };
}
function planningReviewPrompt(plan, evidenceManifest) {
    return [
        implementation_plan_1.IMPLEMENTATION_PLAN_PROMPTS.planning_review,
        "Return JSON only: {\"verdict\":\"passed|repair_required|blocked\",\"issues\":[{\"code\":\"\",\"message\":\"\",\"stepId\":\"\"}]}. Do not include hidden reasoning.",
        JSON.stringify({ plan, evidenceManifest }),
    ].join("\n\n");
}
function planningRepairPrompt(plan, receipt, evidenceManifest) {
    return [implementation_plan_1.IMPLEMENTATION_PLAN_PROMPTS.planning_repair, "Return one complete corrected ccm-implementation-plan-v2 JSON object.", JSON.stringify({ plan, issues: receipt.issues, evidenceManifest })].join("\n\n");
}
function runPlanningOrchestratorSelfTest() {
    const intensity = resolvePlanningIntensity({ projectCount: 2, riskLevel: "high" });
    const evidence = buildPlanningEvidenceManifest([{ project: "web", path: "src/a.ts", checksum: "abc", from: 1, to: 10 }]);
    const plan = { schema: "ccm-implementation-plan-v2", planId: "p", title: "计划", context: "原因", goal: "目标", approach: "方案", scope: ["web"], files: [{ project: "web", path: "src/a.ts", reason: "入口", sourceEvidenceIds: [evidence.entries[0].evidenceId] }], steps: [{ id: "a", title: "修改", objective: "修改入口", dependsOn: [], acceptance: ["结果可见"] }], verification: [{ expected: "结果可见", acceptanceCriteria: ["结果可见"] }], risks: [], exclusions: [], openQuestions: [], revision: 1, checksum: "", promptVersion: implementation_plan_1.CCM_IMPLEMENTATION_PLAN_PROMPT_VERSION, outputLanguage: "zh-CN", contentStored: false };
    plan.checksum = (0, implementation_plan_1.implementationPlanChecksum)(plan);
    const receipt = buildPlanReviewReceipt({ plan, evidenceManifest: evidence });
    return { pass: intensity === "critical" && planningAgentLimits(intensity).planCandidates === 2 && planningPromptForTurn(1).kind === "full" && planningPromptForTurn(2).kind === "sparse" && planningPromptForTurn(6).kind === "full" && receipt.verdict === "passed", checks: { intensity, evidence: evidence.entries.length, receipt: receipt.verdict } };
}
//# sourceMappingURL=planning-orchestrator.js.map