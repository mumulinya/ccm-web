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
exports.IMPLEMENTATION_PLAN_LANGUAGE_CONTRACT = exports.IMPLEMENTATION_PLAN_PROMPTS = exports.CCM_IMPLEMENTATION_PLAN_PROMPT_VERSION = exports.CCM_IMPLEMENTATION_PLAN_SCHEMA = void 0;
exports.implementationPlanChecksum = implementationPlanChecksum;
exports.normalizeImplementationPlanV2 = normalizeImplementationPlanV2;
exports.reviseImplementationPlan = reviseImplementationPlan;
exports.validateImplementationPlanV2 = validateImplementationPlanV2;
exports.shouldRequireImplementationPlan = shouldRequireImplementationPlan;
exports.renderImplementationPlanMarkdown = renderImplementationPlanMarkdown;
exports.runImplementationPlanSelfTest = runImplementationPlanSelfTest;
const crypto = __importStar(require("crypto"));
exports.CCM_IMPLEMENTATION_PLAN_SCHEMA = "ccm-implementation-plan-v2";
exports.CCM_IMPLEMENTATION_PLAN_PROMPT_VERSION = "2026-08-18.en-v2";
const EMPTY_PLAN_PROMPT = `You are the CCM implementation planner.

Work in read-only mode. Do not modify project files, configuration, dependencies,
Git state, or external systems.

Phase 1: Inspect only the minimum relevant files.
Phase 2: Identify existing code, utilities, conventions, and tests to reuse.
Phase 3: Produce one recommended implementation approach.
Phase 4: Review scope, evidence, risks, acceptance criteria, and verification.
Phase 5: Submit the structured plan through ccm_present_plan.

Do not expose hidden reasoning.
Do not invent files, symbols, commands, projects, or test results.
Ask the user only about decisions that cannot be resolved from repository evidence.`;
exports.IMPLEMENTATION_PLAN_PROMPTS = {
    planning_exploration: `${EMPTY_PLAN_PROMPT}\n\nExplore before drafting. Keep the first pass narrow and cite only files actually read.`,
    planning_draft: `${EMPTY_PLAN_PROMPT}\n\nDraft a complete ccm-implementation-plan-v2 object. Every file and verification command must have evidence.`,
    planning_review: `${EMPTY_PLAN_PROMPT}\n\nAct as an independent reviewer. Reject invented paths, missing acceptance criteria, scope drift, and unverifiable claims.`,
    planning_repair: `${EMPTY_PLAN_PROMPT}\n\nRepair only the reported plan defects. Preserve confirmed scope and increment the plan revision.`,
    plan_to_dispatch: `Convert the confirmed ccm-implementation-plan-v2 into self-contained child-Agent work orders.\nEach order must include objective, project/file scope, dependencies, acceptance criteria, allowed permissions, forbidden scope, revision, and checksum.`,
};
exports.IMPLEMENTATION_PLAN_LANGUAGE_CONTRACT = `Generate all user-visible plan content in the language used by the user. For Chinese conversations, use natural Simplified Chinese. Keep schema keys, tool names, identifiers, checksums, and status enums in English.`;
function text(value, max = 4000) {
    return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}
function list(value, max = 40, itemMax = 800) {
    return (Array.isArray(value) ? value : [value])
        .map(item => text(item, itemMax)).filter(Boolean).slice(0, max);
}
function stable(value) {
    if (Array.isArray(value))
        return value.map(stable);
    if (!value || typeof value !== "object")
        return value;
    return Object.keys(value).sort().reduce((out, key) => {
        out[key] = stable(value[key]);
        return out;
    }, {});
}
function implementationPlanChecksum(plan) {
    const { checksum: _ignored, status: _status, quality: _quality, ...withoutChecksum } = plan || {};
    return crypto.createHash("sha256").update(JSON.stringify(stable(withoutChecksum))).digest("hex");
}
function sourceFiles(value) {
    const rows = Array.isArray(value) ? value : [];
    return rows.map((row) => {
        const path = text(row?.path || row?.file || row?.relativePath || row?.relative_path, 500);
        const project = text(row?.project || row?.scope || "当前项目", 180);
        if (!path)
            return null;
        return {
            project,
            path: path.replace(/\\/g, "/").replace(/^\.\//, "").slice(0, 500),
            reason: text(row?.reason || row?.why || "与本次需求直接相关", 800),
            sourceEvidenceIds: list(row?.sourceEvidenceIds || row?.source_evidence_ids || row?.evidenceIds, 12, 120),
        };
    }).filter(Boolean).slice(0, 80);
}
function steps(value, fallbackGoal) {
    const rows = Array.isArray(value) ? value : [];
    return rows.map((row, index) => {
        const title = text(row?.title || row?.label || row?.name || row?.objective || `实施步骤 ${index + 1}`, 240);
        if (!title)
            return null;
        return {
            id: text(row?.id || `step_${index + 1}`, 100).replace(/[^a-zA-Z0-9._-]+/g, "-") || `step_${index + 1}`,
            title,
            objective: text(row?.objective || row?.description || row?.task || title || fallbackGoal, 1800),
            dependsOn: list(row?.dependsOn || row?.depends_on, 16, 100),
            acceptance: list(row?.acceptance || row?.acceptanceCriteria || row?.acceptance_criteria || row?.outcome || row?.expectedResult, 12, 800),
            ...(list(row?.files || row?.filePaths || row?.file_paths || row?.allowedFiles || row?.allowed_files, 40, 500).length ? { files: list(row?.files || row?.filePaths || row?.file_paths || row?.allowedFiles || row?.allowed_files, 40, 500) } : {}),
            ...(list(row?.sourceEvidenceIds || row?.source_evidence_ids || row?.evidenceIds, 20, 160).length ? { sourceEvidenceIds: list(row?.sourceEvidenceIds || row?.source_evidence_ids || row?.evidenceIds, 20, 160) } : {}),
            ...(list(row?.artifacts || row?.outputs, 20, 400).length ? { artifacts: list(row?.artifacts || row?.outputs, 20, 400) } : {}),
            ...(list(row?.allowedTools || row?.allowed_tools, 20, 120).length ? { allowedTools: list(row?.allowedTools || row?.allowed_tools, 20, 120) } : {}),
            ...(list(row?.forbiddenPaths || row?.forbidden_paths, 20, 300).length ? { forbiddenPaths: list(row?.forbiddenPaths || row?.forbidden_paths, 20, 300) } : {}),
            ...(text(row?.status, 40) ? { status: text(row.status, 40) } : {}),
        };
    }).filter(Boolean).slice(0, 40);
}
function verification(value, expectedResults) {
    const rows = Array.isArray(value) ? value : [];
    const result = rows.map((row) => ({
        ...(text(row?.command, 500) ? { command: text(row.command, 500) } : {}),
        expected: text(row?.expected || row?.result || row?.description, 800),
        acceptanceCriteria: list(row?.acceptanceCriteria || row?.acceptance_criteria || row?.acceptance, 12, 800),
    })).filter(row => row.expected || row.acceptanceCriteria.length).slice(0, 30);
    if (result.length)
        return result;
    return expectedResults.slice(0, 12).map(expected => ({ expected, acceptanceCriteria: [expected] }));
}
function normalizeImplementationPlanV2(input, options = {}) {
    const source = input?.plan && typeof input.plan === "object" ? input.plan : input;
    if (!source || typeof source !== "object")
        return null;
    const goal = text(source.goal || source.summary || source.objective || source.overview, 2400);
    const normalizedSteps = steps(source.steps || source.workItems || source.work_items || source.phases, goal);
    if (!goal || !normalizedSteps.length)
        return null;
    const expectedResults = list(source.expectedResults || source.expected_results || source.acceptanceCriteria || source.acceptance_criteria, 24, 800);
    const normalized = {
        schema: exports.CCM_IMPLEMENTATION_PLAN_SCHEMA,
        ...(text(source.planId || source.plan_id || source.id || options.planId, 240) ? { planId: text(source.planId || source.plan_id || source.id || options.planId, 240) } : {}),
        title: text(source.title, 160) || "实施计划",
        context: text(source.context || source.why || source.overview || goal, 2400),
        goal,
        approach: text(source.approach || source.recommendedApproach || source.recommended_approach || source.overview || goal, 2400),
        scope: list(source.scope || source.scopes, 40, 500),
        files: sourceFiles(source.files || source.fileScope || source.file_scope),
        steps: normalizedSteps,
        verification: verification(source.verification || source.verifications, expectedResults),
        risks: list(source.risks || source.risk, 24, 800),
        exclusions: list(source.exclusions || source.outOfScope || source.out_of_scope || source.boundaries, 24, 800),
        openQuestions: list(source.openQuestions || source.open_questions || source.questions, 12, 800),
        revision: Math.max(1, Number(options.revision || source.revision || 1)),
        checksum: "",
        promptVersion: text(source.promptVersion || source.prompt_version, 80) || exports.CCM_IMPLEMENTATION_PLAN_PROMPT_VERSION,
        outputLanguage: text(options.outputLanguage || source.outputLanguage || source.output_language, 40) || "zh-CN",
        ...(text(source.sourceManifestChecksum || source.source_manifest_checksum || source.sourceEvidence?.manifestChecksum, 120) ? { sourceManifestChecksum: text(source.sourceManifestChecksum || source.source_manifest_checksum || source.sourceEvidence?.manifestChecksum, 120) } : {}),
        contentStored: false,
        overview: text(source.overview || source.context || goal, 4000),
        expectedResults,
        ...(text(source.status, 40) ? { status: text(source.status, 40) } : {}),
        ...(text(source.createdAt || source.created_at, 40) ? { createdAt: text(source.createdAt || source.created_at, 40) } : {}),
        updatedAt: options.now || text(source.updatedAt || source.updated_at, 40) || new Date().toISOString(),
    };
    normalized.checksum = implementationPlanChecksum(normalized);
    return normalized;
}
function reviseImplementationPlan(plan, patch, outputLanguage = "zh-CN") {
    const current = normalizeImplementationPlanV2(plan, { outputLanguage });
    if (!current)
        return null;
    return normalizeImplementationPlanV2({ ...current, ...(patch || {}) }, { planId: current.planId, revision: current.revision + 1, outputLanguage });
}
function validateImplementationPlanV2(plan, options = {}) {
    const issues = [];
    if (!plan || plan.schema !== exports.CCM_IMPLEMENTATION_PLAN_SCHEMA)
        issues.push("计划 schema 无效");
    if (!text(plan?.title, 160))
        issues.push("缺少计划标题");
    if (!text(plan?.context, 2400) || !text(plan?.goal, 2400) || !text(plan?.approach, 2400))
        issues.push("context、goal、approach 必须完整");
    if (!Array.isArray(plan?.steps) || !plan.steps.length)
        issues.push("至少需要一个执行步骤");
    const ids = new Set();
    const dependencyRows = [];
    for (const step of Array.isArray(plan?.steps) ? plan.steps : []) {
        if (!text(step?.title, 240))
            issues.push("步骤缺少标题");
        if (!text(step?.objective, 1800))
            issues.push(`步骤 ${step?.id || "未知"} 缺少目标`);
        if (!Array.isArray(step?.acceptance) || !step.acceptance.length)
            issues.push(`步骤 ${step?.id || "未知"} 缺少验收标准`);
        if (ids.has(step?.id))
            issues.push(`步骤 ID 重复：${step.id}`);
        ids.add(step?.id);
        const dependencies = Array.isArray(step?.dependsOn) ? step.dependsOn.map((item) => String(item || "").trim()).filter(Boolean) : [];
        dependencyRows.push({ id: String(step?.id || ""), dependencies });
        for (const dependency of dependencies) {
            if (dependency === step.id)
                issues.push(`步骤 ${step.id} 依赖自身`);
            else if (ids.size && !((plan?.steps || []).some((candidate) => String(candidate?.id || "") === dependency)))
                issues.push(`步骤 ${step.id} 依赖不存在：${dependency}`);
        }
    }
    const visiting = new Set();
    const visited = new Set();
    const visit = (id) => {
        if (visiting.has(id)) {
            issues.push(`步骤依赖存在环：${id}`);
            return;
        }
        if (visited.has(id))
            return;
        visiting.add(id);
        for (const dependency of dependencyRows.find(row => row.id === id)?.dependencies || [])
            if (ids.has(dependency))
                visit(dependency);
        visiting.delete(id);
        visited.add(id);
    };
    for (const row of dependencyRows)
        visit(row.id);
    if (!Array.isArray(plan?.verification) || !plan.verification.length)
        issues.push("缺少验证方式");
    if (!text(plan?.checksum) || implementationPlanChecksum(plan) !== plan.checksum)
        issues.push("计划 checksum 不匹配");
    if (!Array.isArray(plan?.files))
        issues.push("files 必须是数组");
    const allowed = new Set((options.allowedProjects || []).map(item => text(item, 180)).filter(Boolean));
    if (allowed.size)
        for (const file of plan.files || [])
            if (file.project && !allowed.has(file.project))
                issues.push(`计划包含未授权项目：${file.project}`);
    return { ok: issues.length === 0, issues };
}
function shouldRequireImplementationPlan(input) {
    return Number(input.projectCount || 0) > 1
        || Number(input.independentModuleCount || 0) > 1
        || String(input.riskLevel || "").toLowerCase() === "high"
        || input.hasArchitectureOrPublicContractChange === true
        || input.hasUnresolvedAmbiguity === true
        || input.requiresUserConfirmation === true
        || (input.needsEpicDecomposition === true && Array.isArray(input.impactScope) && input.impactScope.length > 1);
}
function renderImplementationPlanMarkdown(plan, options = {}) {
    if (!plan || typeof plan !== "object")
        return "";
    const lines = [
        `## ${text(plan.title, 160) || "实施计划"}`,
        `\n### 为什么要改\n${text(plan.context || plan.overview, 2400)}`,
        `\n### 目标结果\n${text(plan.goal, 2400)}`,
        `\n### 推荐方案\n${text(plan.approach, 2400)}`,
    ];
    if (Array.isArray(plan.scope) && plan.scope.length)
        lines.push(`\n### 影响范围\n${plan.scope.map((item) => `- ${text(item, 500)}`).join("\n")}`);
    lines.push(`\n### 执行步骤\n${(plan.steps || []).map((step, index) => `${index + 1}. **${text(step.title, 240)}**：${text(step.objective, 1200)}${Array.isArray(step.acceptance) && step.acceptance.length ? `\n   - 验收：${step.acceptance.map((item) => text(item, 500)).join("；")}` : ""}`).join("\n")}`);
    if (Array.isArray(plan.verification) && plan.verification.length)
        lines.push(`\n### 验收与验证\n${plan.verification.map((item) => `- ${item.command ? `\`${text(item.command, 500)}\`：` : ""}${text(item.expected, 800)}${item.acceptanceCriteria?.length ? `（${item.acceptanceCriteria.map((v) => text(v, 400)).join("；")}）` : ""}`).join("\n")}`);
    if (Array.isArray(plan.risks) && plan.risks.length)
        lines.push(`\n### 风险\n${plan.risks.map((item) => `- ${text(item, 800)}`).join("\n")}`);
    if (Array.isArray(plan.exclusions) && plan.exclusions.length)
        lines.push(`\n### 本次不做\n${plan.exclusions.map((item) => `- ${text(item, 800)}`).join("\n")}`);
    if (Array.isArray(plan.openQuestions) && plan.openQuestions.length)
        lines.push(`\n### 待确认\n${plan.openQuestions.map((item) => `- ${text(item, 800)}`).join("\n")}`);
    if (options.includeTechnical)
        lines.push(`\n<details><summary>技术详情</summary>\nrevision: ${plan.revision}\nchecksum: ${plan.checksum}\npromptVersion: ${plan.promptVersion}\n</details>`);
    return lines.filter(Boolean).join("\n");
}
function runImplementationPlanSelfTest() {
    const plan = normalizeImplementationPlanV2({ title: "登录修复", context: "登录刷新在现有会话中丢失状态。", goal: "保留刷新后的登录状态并兼容现有会话。", approach: "复用现有会话存储和验证中间件。", scope: ["web"], files: [{ project: "web", path: "src/auth/session.ts", reason: "现有会话入口", sourceEvidenceIds: ["ev-1"] }], steps: [{ id: "session", title: "修复会话续期", objective: "调整续期边界", acceptance: ["刷新后状态保持"] }], verification: [{ command: "npm test", expected: "测试通过", acceptanceCriteria: ["无回归"] }], risks: [], exclusions: ["不改登录协议"] }, { planId: "p1" });
    const checks = { normalized: !!plan && plan.schema === exports.CCM_IMPLEMENTATION_PLAN_SCHEMA, checksum: !!plan && validateImplementationPlanV2(plan).ok, renderedChinese: renderImplementationPlanMarkdown(plan).includes("为什么要改"), promptEnglish: /You are the CCM implementation planner/.test(exports.IMPLEMENTATION_PLAN_PROMPTS.planning_draft), revision: !!plan && reviseImplementationPlan(plan, { goal: "刷新后保持状态并兼容现有会话。" })?.revision === 2, simpleSkips: shouldRequireImplementationPlan({ projectCount: 1, independentModuleCount: 1, riskLevel: "low" }) === false, crossProjectPlans: shouldRequireImplementationPlan({ projectCount: 2 }) === true };
    return { pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=implementation-plan.js.map