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
exports.CCM_PLAN_DISPATCH_CONTRACT_SCHEMA = void 0;
exports.providerCapabilitiesFromRuntime = providerCapabilitiesFromRuntime;
exports.validatePlanForDispatch = validatePlanForDispatch;
exports.buildPlanDispatchContract = buildPlanDispatchContract;
exports.validatePlanDispatchContract = validatePlanDispatchContract;
exports.runPlanDispatchContractSelfTest = runPlanDispatchContractSelfTest;
const crypto = __importStar(require("crypto"));
const implementation_plan_1 = require("./implementation-plan");
const business_requirement_contract_1 = require("./business-requirement-contract");
const evidence_policy_1 = require("./evidence-policy");
const compiled_execution_plan_1 = require("./compiled-execution-plan");
exports.CCM_PLAN_DISPATCH_CONTRACT_SCHEMA = "ccm-plan-dispatch-contract-v1";
function providerCapabilitiesFromRuntime(runtime, options = {}) {
    const source = runtime?.capabilities || runtime || {};
    return {
        structuredToolStream: options.structuredToolStream ?? (source.streaming === true && source.externalRunner === true),
        fileEvents: source.nativeWorkspaceEditing === true,
        streaming: source.streaming === true,
        pause: false,
        resume: source.sessionResume === true,
        cancel: true,
        worktree: source.worktreeIsolation === true,
        nativeSession: source.sessionResume === true,
        structuredReceipt: options.structuredReceipt ?? source.externalRunner === true,
        writeScope: source.nativeWorkspaceEditing === true,
        sessionBinding: options.sessionBinding === true,
    };
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
function hash(value) {
    return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}
function text(value, max = 800) {
    return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}
function list(value, max = 40, itemMax = 500) {
    const source = Array.isArray(value) ? value : typeof value === "string" ? value.split(/\r?\n|,|;|；|、/) : [];
    return [...new Set(source.map(item => text(item, itemMax)).filter(Boolean))].slice(0, max);
}
function pathKey(value) {
    return text(value, 500).replace(/\\/g, "/").replace(/^\.\//, "").toLowerCase();
}
function sharedResource(value) {
    const path = pathKey(value);
    return /(^|\/)(package\.json|pnpm-lock\.yaml|package-lock\.json|yarn\.lock|tsconfig(?:\.[^/]+)?\.json|vite\.config\.[^/]+|webpack\.config\.[^/]+|\.env(?:\.[^/]+)?|dockerfile|docker-compose[^/]*|schema|migrations?)(\/|$)/i.test(path)
        || /(^|\/)(api|routes?|types?|contracts?|database|db)(\/|$)/i.test(path);
}
function transportOf(value) {
    const candidate = String(value || "").toLowerCase();
    return candidate === "acp" || candidate === "websocket" ? candidate : "cli";
}
function capabilityNames(capabilities) {
    return Object.entries(capabilities).filter(([, value]) => value === true).map(([key]) => key).sort();
}
function normalizeCapabilities(value) {
    const source = value && typeof value === "object" ? value : {};
    const read = (key, snake) => source[key] === true || source[snake] === true;
    return {
        structuredToolStream: read("structuredToolStream", "structured_tool_stream"),
        fileEvents: read("fileEvents", "file_events"),
        streaming: read("streaming", "stream"),
        pause: read("pause", "pausable"),
        resume: read("resume", "resumable"),
        cancel: read("cancel", "cancellable"),
        worktree: read("worktree", "worktree_isolation"),
        nativeSession: read("nativeSession", "native_session"),
        structuredReceipt: read("structuredReceipt", "structured_receipt"),
        writeScope: read("writeScope", "write_scope"),
        sessionBinding: read("sessionBinding", "session_binding"),
    };
}
function stepFiles(plan, step, stepCount) {
    const explicit = list(step?.files || step?.filePaths || step?.file_paths || step?.allowedFiles || step?.allowed_files, 80, 500).map(pathKey);
    if (explicit.length)
        return explicit;
    if (stepCount === 1)
        return (Array.isArray(plan?.files) ? plan.files : []).map((row) => pathKey(row?.path));
    return [];
}
function stepEvidence(plan, step, files) {
    const explicit = list(step?.sourceEvidenceIds || step?.source_evidence_ids || step?.evidenceIds, 30, 180);
    if (explicit.length)
        return explicit;
    const rows = Array.isArray(plan?.files) ? plan.files : [];
    return rows.filter((row) => files.includes(pathKey(row?.path))).flatMap((row) => list(row?.sourceEvidenceIds || row?.source_evidence_ids, 12, 180));
}
function validateDependencyGraph(steps) {
    const ids = new Set(steps.map(step => String(step?.id || "").trim()).filter(Boolean));
    const issues = [];
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
        const step = steps.find(row => String(row?.id || "") === id);
        for (const dep of list(step?.dependsOn || step?.depends_on, 20, 100)) {
            if (!ids.has(dep))
                issues.push(`步骤 ${id} 依赖不存在：${dep}`);
            else
                visit(dep);
        }
        visiting.delete(id);
        visited.add(id);
    };
    for (const id of ids)
        visit(id);
    return [...new Set(issues)];
}
function validatePlanForDispatch(plan, options = {}) {
    const issues = [];
    const evidencePolicy = options.evidencePolicy || (0, evidence_policy_1.resolveEvidencePolicy)({
        requiresCodeChanges: true,
        targetProjects: plan?.businessRequirement?.targetProjects || [],
        previousLevel: plan?.evidencePolicy?.level,
    });
    const steps = Array.isArray(plan?.steps) ? plan.steps : [];
    if (!plan || plan.schema !== "ccm-implementation-plan-v2")
        issues.push("计划 schema 无效");
    if (!text(plan?.planId || plan?.plan_id, 240))
        issues.push("缺少 planId");
    if (!text(plan?.checksum, 120))
        issues.push("缺少计划 checksum");
    if (plan?.schema === "ccm-implementation-plan-v2" && text(plan?.checksum, 120) && (0, implementation_plan_1.implementationPlanChecksum)(plan) !== plan.checksum)
        issues.push("计划 checksum 不匹配");
    const requirementCheck = (0, business_requirement_contract_1.validateBusinessRequirementContract)(plan?.businessRequirement);
    if (!requirementCheck.valid)
        issues.push(...requirementCheck.issues);
    if (String(plan?.requirementBinding?.checksum || "") !== String(plan?.businessRequirement?.checksum || ""))
        issues.push("计划需求 checksum 绑定不匹配");
    if (!text(plan?.sourceManifestChecksum || plan?.source_manifest_checksum || plan?.sourceEvidence?.manifestChecksum, 120))
        issues.push("缺少 source manifest checksum");
    if (plan?.schema === "ccm-implementation-plan-v2") {
        issues.push(...(0, implementation_plan_1.validateImplementationPlanV2)(plan, { allowedProjects: options.allowedProjects }).issues);
    }
    issues.push(...validateDependencyGraph(steps));
    const allowed = new Set(list(options.allowedProjects, 40, 180));
    const knownEvidenceIds = new Set();
    for (const file of Array.isArray(plan?.files) ? plan.files : []) {
        if (!text(file?.path, 500))
            issues.push("计划文件缺少路径");
        const fileEvidenceIds = list(file?.sourceEvidenceIds || file?.source_evidence_ids, 20, 180);
        if (evidencePolicy.perFileEvidenceRequired && !fileEvidenceIds.length)
            issues.push(`文件缺少证据：${file?.path || "unknown"}`);
        for (const evidenceId of fileEvidenceIds)
            knownEvidenceIds.add(evidenceId);
        if (allowed.size && file?.project && !allowed.has(String(file.project)))
            issues.push(`计划包含未授权项目：${file.project}`);
    }
    const stepIds = new Set();
    for (const step of steps) {
        const id = text(step?.id, 100);
        if (!id || stepIds.has(id))
            issues.push(`步骤 ID 无效或重复：${id || "unknown"}`);
        stepIds.add(id);
        if (!Array.isArray(step?.acceptance) || !step.acceptance.length)
            issues.push(`步骤 ${id || "unknown"} 缺少验收标准`);
        if (!Array.isArray(step?.projects) || !step.projects.length)
            issues.push(`步骤 ${id || "unknown"} 缺少项目归属`);
        if (!Array.isArray(step?.acceptanceCriterionIds) || !step.acceptanceCriterionIds.length)
            issues.push(`步骤 ${id || "unknown"} 缺少验收标准绑定`);
        const files = stepFiles(plan, step, steps.length);
        const artifacts = list(step?.artifacts || step?.outputs, 20, 300);
        if (steps.length > 1 && !files.length && !artifacts.length)
            issues.push(`步骤 ${id || "unknown"} 没有明确文件或产出范围`);
        if (!files.length && !artifacts.length && !text(step?.objective || step?.title, 1800))
            issues.push(`步骤 ${id || "unknown"} 没有可执行范围`);
        const evidenceIds = stepEvidence(plan, step, files);
        if (evidencePolicy.perFileEvidenceRequired && files.length && !evidenceIds.length)
            issues.push(`步骤 ${id || "unknown"} 的文件缺少来源证据`);
        for (const evidenceId of evidenceIds)
            if (!knownEvidenceIds.has(evidenceId))
                issues.push(`步骤 ${id || "unknown"} 引用了未知源码证据：${evidenceId}`);
        if (!Array.isArray(step?.verification) && !Array.isArray(plan?.verification))
            issues.push(`步骤 ${id || "unknown"} 缺少验证方式`);
    }
    return { ok: issues.length === 0, issues: [...new Set(issues)] };
}
function buildPlanDispatchContract(input) {
    const plan = input.plan || {};
    const allSteps = Array.isArray(plan.steps) ? plan.steps : [];
    const targetProject = text(input.project, 180);
    const steps = targetProject
        ? allSteps.filter((step) => list(step?.projects || step?.project, 20, 180).includes(targetProject))
        : allSteps;
    const provider = text(input.provider || input.agentType || "claudecode", 80) || "claudecode";
    const agentType = text(input.agentType || provider, 80) || provider;
    const capabilities = normalizeCapabilities(input.capabilities);
    const sourceManifestChecksum = text(input.sourceManifestChecksum || plan.sourceManifestChecksum || plan.source_manifest_checksum || plan.sourceEvidence?.manifestChecksum, 120);
    const evidencePolicy = (0, evidence_policy_1.resolveEvidencePolicy)({
        requiresCodeChanges: true,
        targetProjects: Array.from(new Set([
            ...(Array.isArray(plan?.businessRequirement?.targetProjects) ? plan.businessRequirement.targetProjects : []),
            ...(targetProject ? [targetProject] : []),
        ])),
        riskLevel: (input.evidencePolicy || plan?.evidencePolicy)?.level === "strict" ? "high" : "write",
        previousLevel: input.evidencePolicy?.level || plan?.evidencePolicy?.level,
    });
    const compiledPlan = (0, compiled_execution_plan_1.compileExecutionPlan)({
        plan,
        evidencePolicy,
        allowedProjects: targetProject ? [targetProject] : plan?.businessRequirement?.targetProjects,
    });
    const planForValidation = sourceManifestChecksum ? { ...plan, sourceManifestChecksum } : plan;
    const blockers = [...validatePlanForDispatch(planForValidation, { evidencePolicy }).issues, ...compiledPlan.issues];
    if (targetProject && !steps.length)
        blockers.push(`计划没有分配给项目 ${targetProject} 的步骤，禁止派发`);
    if (capabilities.writeScope !== true)
        blockers.push("Provider 无法证明写入范围，禁止派发");
    if (capabilities.sessionBinding !== true)
        blockers.push("Provider 无法证明任务身份绑定，禁止派发");
    const stepToWork = new Map();
    for (const step of steps)
        stepToWork.set(text(step?.id, 100), `wi_${hash([input.taskId, plan.planId, targetProject, step?.id]).slice(0, 20)}`);
    const workItems = [];
    const usedPaths = new Map();
    for (const step of steps) {
        const stepId = text(step?.id, 100);
        const workItemId = stepToWork.get(stepId) || `wi_${hash([input.taskId, targetProject, stepId]).slice(0, 20)}`;
        const files = stepFiles(plan, step, allSteps.length);
        const evidence = stepEvidence(plan, step, files);
        const dependencies = list(step?.dependsOn || step?.depends_on, 20, 100).map(dep => stepToWork.get(dep) || `step:${dep}`);
        const stepProject = targetProject || list(step?.projects || step?.project, 20, 180)[0] || text(plan?.project, 180);
        const conflicts = workItems.filter(item => item.project === stepProject && (files.some(file => item.files.includes(file)) || files.some(sharedResource) || item.files.some(sharedResource)));
        if (conflicts.length)
            for (const conflict of conflicts)
                if (!dependencies.includes(conflict.workItemId))
                    dependencies.push(conflict.workItemId);
        const parallelGroup = conflicts.length ? `serial_${conflicts[conflicts.length - 1].workItemId}` : `parallel_${hash([input.taskId, files, stepId]).slice(0, 12)}`;
        const degraded = capabilities.writeScope !== true || capabilities.sessionBinding !== true || capabilities.structuredToolStream !== true || capabilities.structuredReceipt !== true;
        const degradedReason = capabilities.writeScope !== true || capabilities.sessionBinding !== true
            ? "Provider 无法证明写入范围或任务身份绑定，必须由 CCM 重新校验"
            : "Provider 缺少完整结构化流或回执能力，执行后由 CCM 重新读取和验证";
        const core = {
            workItemId,
            stepId,
            title: text(step?.title, 240),
            objective: text(step?.objective, 1800),
            businessGoal: text(plan?.businessRequirement?.businessGoal || plan?.goal, 2400),
            requirementId: text(plan?.requirementBinding?.requirementId || plan?.businessRequirement?.requirementId, 240),
            requirementRevision: Math.max(1, Number(plan?.requirementBinding?.revision || plan?.businessRequirement?.revision || 1)),
            requirementChecksum: text(plan?.requirementBinding?.checksum || plan?.businessRequirement?.checksum, 120),
            planRevision: Math.max(1, Number(plan?.revision || 1)),
            planChecksum: text(plan?.checksum, 120),
            evidencePolicy,
            project: stepProject, files, sourceEvidenceIds: evidence,
            dependsOn: dependencies, parallelGroup,
            executor: { provider, agentType, ...(text(input.model, 160) ? { model: text(input.model, 160) } : {}), transport: transportOf(input.transport), capabilities: capabilityNames(capabilities), degraded, ...(degraded ? { degradedReason } : {}) },
            // Worktree isolation is provided by CCM around the Provider process; a
            // Provider's native worktree capability is not required for isolation.
            worktree: { strategy: input.worktreeStrategy || "isolated" },
            allowedTools: list(input.allowedTools || step?.allowedTools || step?.allowed_tools, 30, 120),
            forbiddenPaths: list(input.forbiddenPaths || step?.forbiddenPaths || step?.forbidden_paths, 30, 300),
            constraints: list(plan?.businessRequirement?.constraints, 40, 800),
            exclusions: list(plan?.businessRequirement?.exclusions || plan?.exclusions, 40, 800),
            acceptanceCriterionIds: list(step?.acceptanceCriterionIds || step?.acceptance_criterion_ids, 30, 120),
            acceptance: list(step?.acceptance || step?.acceptanceCriteria || step?.acceptance_criteria, 20, 800),
            verification: (Array.isArray(step?.verification) ? step.verification : (Array.isArray(plan?.verification) ? plan.verification : [])).map((row) => ({ ...(text(row?.command, 500) ? { command: text(row.command, 500) } : {}), expected: text(row?.expected || row?.result || row?.description, 800), evidenceRequired: true })).filter((row) => row.expected),
            artifacts: list(step?.artifacts || step?.outputs, 20, 300), timeoutMs: Math.max(30_000, Number(step?.timeoutMs || step?.timeout_ms || input.timeoutMs || 1_800_000)), maxAttempts: Math.max(1, Math.min(5, Number(step?.maxAttempts || step?.max_attempts || input.maxAttempts || 2))), contentStored: false,
        };
        workItems.push({ ...core, contractChecksum: hash(core) });
        for (const file of files)
            usedPaths.set(file, workItemId);
    }
    const { issues: _compiledIssues, ...compiledPlanReceipt } = compiledPlan;
    const contractCore = { schema: exports.CCM_PLAN_DISPATCH_CONTRACT_SCHEMA, contractId: `pdc_${hash([input.taskId, plan.planId, plan.revision, plan.checksum, targetProject]).slice(0, 24)}`, planId: text(plan.planId || plan.plan_id, 240), planRevision: Math.max(1, Number(plan.revision || 1)), planChecksum: text(plan.checksum, 120), requirementId: text(plan?.requirementBinding?.requirementId, 240), requirementRevision: Math.max(1, Number(plan?.requirementBinding?.revision || 1)), requirementChecksum: text(plan?.requirementBinding?.checksum, 120), sourceManifestChecksum, evidencePolicy, strategy: "conflict_aware_parallel", workItems, compiledPlan: compiledPlanReceipt, contentStored: false };
    const fatal = blockers.filter(issue => /schema|planId|checksum|manifest|依赖|未授权|缺少路径|缺少证据|缺少验收|没有明确|项目归属|禁止派发/.test(issue));
    return { ...contractCore, dispatchReady: fatal.length === 0 && workItems.length > 0, blockers: [...new Set(blockers)], contractChecksum: hash(contractCore) };
}
function validatePlanDispatchContract(contract, expected = {}) {
    const issues = [];
    if (contract?.schema !== exports.CCM_PLAN_DISPATCH_CONTRACT_SCHEMA)
        issues.push("contract_schema_invalid");
    const { contractChecksum: _checksum, dispatchReady: _ready, blockers: _blockers, ...contractCore } = contract || {};
    if (String(contract?.contractChecksum || "") !== hash(contractCore))
        issues.push("contract_checksum_invalid");
    for (const [key, value] of Object.entries(expected))
        if (value !== undefined && String(contract?.[key] || "") !== String(value || ""))
            issues.push(`${key}_mismatch`);
    const ids = new Set();
    for (const item of Array.isArray(contract?.workItems) ? contract.workItems : []) {
        if (!item.workItemId || ids.has(item.workItemId))
            issues.push("work_item_id_invalid");
        ids.add(item.workItemId);
        if (!item.stepId || !item.project)
            issues.push("work_item_binding_missing");
        if (!item.title || !item.objective || !item.businessGoal)
            issues.push(`${item.workItemId}_business_semantics_missing`);
        if (!item.requirementId || !item.requirementChecksum || !item.planChecksum)
            issues.push(`${item.workItemId}_semantic_binding_missing`);
        if (!Array.isArray(item.acceptanceCriterionIds) || !item.acceptanceCriterionIds.length)
            issues.push(`${item.workItemId}_acceptance_binding_missing`);
        if (!Array.isArray(item.acceptance) || !item.acceptance.length)
            issues.push(`${item.workItemId}_acceptance_missing`);
        if (!Array.isArray(item.executor?.capabilities) || !item.executor.capabilities.includes("writeScope"))
            issues.push(`${item.workItemId}_write_scope_unproven`);
    }
    return { valid: issues.length === 0, issues: [...new Set(issues)] };
}
function runPlanDispatchContractSelfTest() {
    const plan = (0, implementation_plan_1.normalizeImplementationPlanV2)({ schema: "ccm-implementation-plan-v2", planId: "p1", goal: "Ship A and B", revision: 1, sourceManifestChecksum: "manifest", files: [{ project: "web", path: "src/a.ts", sourceEvidenceIds: ["e1"] }, { project: "web", path: "src/b.ts", sourceEvidenceIds: ["e2"] }], steps: [{ id: "a", title: "A", objective: "A", project: "web", files: ["src/a.ts"], sourceEvidenceIds: ["e1"], acceptance: ["A done"], verification: [{ command: "npm test", expected: "pass" }] }, { id: "b", title: "B", objective: "B", project: "web", files: ["src/b.ts"], sourceEvidenceIds: ["e2"], acceptance: ["B done"], verification: [{ command: "npm test", expected: "pass" }] }], verification: [{ command: "npm test", expected: "pass", acceptanceCriteria: ["A done", "B done"] }] }, { planId: "p1", targetProjects: ["web"] });
    const contract = buildPlanDispatchContract({ plan, taskId: "t1", project: "web", capabilities: { writeScope: true, sessionBinding: true, structuredToolStream: true, structuredReceipt: true, worktree: true } });
    const checks = { hasContract: contract.schema === exports.CCM_PLAN_DISPATCH_CONTRACT_SCHEMA, ready: contract.dispatchReady === true, parallel: contract.workItems[0]?.parallelGroup !== contract.workItems[1]?.parallelGroup, validates: validatePlanDispatchContract(contract).valid };
    return { pass: Object.values(checks).every(Boolean), checks, contract };
}
//# sourceMappingURL=plan-dispatch-contract.js.map