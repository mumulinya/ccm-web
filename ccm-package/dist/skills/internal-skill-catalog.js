"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CCM_INTERNAL_SKILL_CATALOG = exports.CCM_ROLE_SKILL_NAMES = void 0;
exports.isCcmInternalSkillName = isCcmInternalSkillName;
exports.assertCcmInternalSkillMutable = assertCcmInternalSkillMutable;
exports.CCM_ROLE_SKILL_NAMES = {
    global: "ccm-global-mission-lead",
    group: "ccm-group-coordination-lead",
    project: "ccm-project-delivery-worker",
    test: "ccm-test-acceptance-verifier",
    receipt: "ccm-delivery-receipt",
    evidence: "ccm-acceptance-evidence",
    requirementIntake: "ccm-requirement-intake",
    taskDecomposition: "ccm-task-decomposition",
    deliveryReviewRework: "ccm-delivery-review-rework",
    projectSourceResearch: "ccm-project-source-research",
    documentDrivenDelivery: "ccm-document-driven-delivery",
    incidentDiagnosis: "ccm-incident-diagnosis",
    frontendVisualQa: "ccm-frontend-visual-qa",
    releaseReadiness: "ccm-release-readiness",
};
exports.CCM_INTERNAL_SKILL_CATALOG = [
    { name: exports.CCM_ROLE_SKILL_NAMES.global, description: "Coordinate explicit CCM work across groups or projects, supervise mission evidence, and return a friendly final summary." },
    { name: exports.CCM_ROLE_SKILL_NAMES.group, description: "Plan executable group work, dispatch scoped project Agents, review receipts, request rework, and hand off acceptance." },
    { name: exports.CCM_ROLE_SKILL_NAMES.project, description: "Execute a scoped CCM project assignment, implement and verify changes, and return a structured delivery receipt." },
    { name: exports.CCM_ROLE_SKILL_NAMES.test, description: "Independently verify CCM acceptance criteria with commands, APIs, browser checks, screenshots, and conservative verdicts." },
    { name: exports.CCM_ROLE_SKILL_NAMES.receipt, description: "Produce a structured CCM implementation receipt containing actions, changed files, verification, blockers, and Skill usage." },
    { name: exports.CCM_ROLE_SKILL_NAMES.evidence, description: "Map CCM acceptance criteria to reproducible command, API, browser, screenshot, and artifact evidence." },
    { name: exports.CCM_ROLE_SKILL_NAMES.requirementIntake, description: "Extract executable goals, contracts, constraints, source references, and acceptance criteria from messages and documents." },
    { name: exports.CCM_ROLE_SKILL_NAMES.taskDecomposition, description: "Split delivery work into scoped project assignments with semantic dependencies and observable completion conditions." },
    { name: exports.CCM_ROLE_SKILL_NAMES.deliveryReviewRework, description: "Review project receipts against assignments and acceptance criteria, then produce precise evidence-based rework." },
    { name: exports.CCM_ROLE_SKILL_NAMES.projectSourceResearch, description: "Inspect current project source, repository state, instructions, and established patterns before implementation." },
    { name: exports.CCM_ROLE_SKILL_NAMES.documentDrivenDelivery, description: "Trace PRD, API, image, and attachment clauses through implementation and criterion-linked verification." },
    { name: exports.CCM_ROLE_SKILL_NAMES.incidentDiagnosis, description: "Reproduce runtime or build failures, isolate the supported root cause, repair it, and verify recovery." },
    { name: exports.CCM_ROLE_SKILL_NAMES.frontendVisualQa, description: "Verify real frontend behavior, responsive layout, browser state, console failures, and screenshot evidence." },
    { name: exports.CCM_ROLE_SKILL_NAMES.releaseReadiness, description: "Assess build, configuration, compatibility, migration, rollout, rollback, and residual release risk." },
];
const INTERNAL_SKILL_NAMES = new Set(exports.CCM_INTERNAL_SKILL_CATALOG.map(item => item.name.toLowerCase()));
function isCcmInternalSkillName(name) {
    return INTERNAL_SKILL_NAMES.has(String(name || "").trim().toLowerCase());
}
function assertCcmInternalSkillMutable(name, action = "修改") {
    if (!isCcmInternalSkillName(name))
        return;
    const error = new Error(`CCM 内置 Skill "${String(name || "").trim()}" 随项目发布，不能${action}`);
    error.code = "CCM_INTERNAL_SKILL_IMMUTABLE";
    error.statusCode = 403;
    throw error;
}
//# sourceMappingURL=internal-skill-catalog.js.map